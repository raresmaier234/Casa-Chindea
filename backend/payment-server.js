// backend/payment-server.js
import express from 'express';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';
import { authenticateToken } from './auth-server.js';
import { sendWhatsAppBookingConfirmed } from './whatsapp.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Authenticate PocketBase as admin
async function authPb() {
    if (pb.authStore.isValid) return;
    try {
        const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
        const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
        try {
            await pb.admins.authWithPassword(email, password);
        } catch {
            await pb.collection('users').authWithPassword(email, password);
        }
    } catch (err) {
        console.error('❌ PB auth failed in payment-server:', err.message);
    }
}

// ── GET /api/payment/config ──────────────────────────────────────────────────
// Returns the Stripe publishable key + current payment mode to the frontend
router.get('/config', async (req, res) => {
    try {
        await authPb();
        const records = await pb.collection('prices').getFullList(1, {
            sort: '-created', $autoCancel: false
        });

        const pricesRow = records[0] || {};
        const memFallback = global._paymentSettings || {};
        const paymentMode = pricesRow.paymentMode || memFallback.paymentMode || 'none';
        const depositPercent = pricesRow.depositPercent || memFallback.depositPercent || 30;

        res.json({
            success: true,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
            paymentMode,   // "none" | "full" | "deposit"
            depositPercent
        });
    } catch (err) {
        console.error('Error in /api/payment/config:', err.message);
        res.json({ success: true, publishableKey: '', paymentMode: 'none', depositPercent: 30 });
    }
});

// ── POST /api/payment/create-intent ─────────────────────────────────────────
// Creates a Stripe PaymentIntent for an already-saved (pending) booking
// Body: { bookingId, totalAmount }  — totalAmount in RON (integer)
router.post('/create-intent', authenticateToken, async (req, res) => {
    const { bookingId, totalAmount } = req.body;

    if (!bookingId || !totalAmount || totalAmount <= 0) {
        return res.status(400).json({ error: 'bookingId și totalAmount sunt obligatorii.' });
    }

    try {
        await authPb();

        // Load payment mode from prices
        const priceRecords = await pb.collection('prices').getFullList(1, {
            sort: '-created', $autoCancel: false
        });
        const pricesRow = priceRecords[0] || {};
        const memFallback = global._paymentSettings || {};
        const paymentMode = pricesRow.paymentMode || memFallback.paymentMode || 'none';
        const depositPercent = pricesRow.depositPercent || memFallback.depositPercent || 30;

        if (paymentMode === 'none') {
            return res.status(400).json({ error: 'Plata online nu este activată.' });
        }

        // Calculate how much to charge now (in RON, then convert to bani for Stripe)
        let amountDue = totalAmount; // full
        if (paymentMode === 'deposit') {
            amountDue = Math.ceil((totalAmount * depositPercent) / 100);
        }

        const amountInBani = amountDue * 100; // Stripe expects smallest unit

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInBani,
            currency: 'ron',
            metadata: {
                bookingId,
                paymentMode,
                totalAmount: String(totalAmount),
                amountDue: String(amountDue)
            },
            description: `Casa Chindea - Rezervare ${bookingId}`,
            automatic_payment_methods: { enabled: true }
        });

        // Save the intent ID and total on the booking record
        const updateData = {
            totalAmount: totalAmount,
            paidAmount: 0,
            paymentMethod: 'card',
            paymentStatus: 'unpaid'
        };
        // stripePaymentIntentId only if migration has been applied
        try {
            await pb.collection('booking').update(bookingId, {
                ...updateData,
                stripePaymentIntentId: paymentIntent.id
            });
        } catch {
            await pb.collection('booking').update(bookingId, updateData);
        }

        console.log(`💳 PaymentIntent created: ${paymentIntent.id} for booking ${bookingId}, amount: ${amountDue} RON`);

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            amountDue,
            paymentMode,
            depositPercent: paymentMode === 'deposit' ? depositPercent : 100
        });
    } catch (err) {
        console.error('❌ Error creating payment intent:', err.message);
        res.status(500).json({ error: 'Eroare la crearea intenției de plată: ' + err.message });
    }
});

// ── POST /api/payment/cash ───────────────────────────────────────────────────
// Client chose to pay cash — just mark the booking and leave it pending
router.post('/cash', authenticateToken, async (req, res) => {
    const { bookingId, totalAmount } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId este obligatoriu.' });

    try {
        await authPb();
        try {
            await pb.collection('booking').update(bookingId, {
                paymentMethod: 'cash',
                paymentStatus: 'unpaid',
                totalAmount: totalAmount || 0
            });
        } catch {
            // payment fields might not exist yet — just leave booking as-is
        }
        console.log(`💵 Cash payment selected for booking ${bookingId}`);
        res.json({ success: true, message: 'Rezervare cu plată cash înregistrată.' });
    } catch (err) {
        console.error('❌ Error marking cash booking:', err.message);
        res.status(500).json({ error: 'Eroare la actualizarea rezervării: ' + err.message });
    }
});

// ── POST /api/payment/confirm ────────────────────────────────────────────────
// Called by frontend after Stripe.confirmCardPayment() succeeds on client side.
// Sets booking status = confirmed, paymentStatus = paid/deposit_paid.
router.post('/confirm', authenticateToken, async (req, res) => {
    const { bookingId, paymentStatus, paidAmount, totalAmount } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId este obligatoriu.' });

    try {
        await authPb();

        const updateData = {
            status: 'confirmed',
            paymentStatus: paymentStatus || 'paid',   // 'paid' or 'deposit_paid'
            paidAmount: paidAmount || 0,
            totalAmount: totalAmount || 0
        };

        try {
            await pb.collection('booking').update(bookingId, updateData);
        } catch (e) {
            // If payment fields don't exist yet, confirm without them
            await pb.collection('booking').update(bookingId, { status: 'confirmed' });
        }

        console.log(`✅ Booking ${bookingId} confirmed via card — status: ${paymentStatus}, paid: ${paidAmount} RON`);

        // Send WhatsApp confirmation to client
        try {
            const booking = await pb.collection('booking').getOne(bookingId, { $autoCancel: false });
            const isProduction = process.env.NODE_ENV === 'production';
            const clientPhone = isProduction ? booking.phone : (process.env.TEST_WHATSAPP_PHONE);
            const ownerPhone = isProduction
                ? (process.env.OWNER_WHATSAPP_PHONE || process.env.CONTACT_PHONE)
                : process.env.TEST_WHATSAPP_PHONE;

            const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / (1000 * 60 * 60 * 24));
            const waData = {
                name: booking.name, phone: booking.phone,
                checkin: booking.checkin, checkout: booking.checkout,
                guests: booking.guests, nights,
                roomType: booking.roomType === 'entire' ? 'Casa Întreagă' : `${booking.numberOfRooms || 1} cameră`,
                totalPrice: totalAmount || paidAmount,
                message: booking.message || ''
            };

            const { sendWhatsAppBookingConfirmed } = await import('./whatsapp.js');
            if (clientPhone) await sendWhatsAppBookingConfirmed(clientPhone, waData).catch(() => {});
            if (ownerPhone) await sendWhatsAppBookingConfirmed(ownerPhone, { ...waData, name: `[CARD ✅] ${booking.name}` }).catch(() => {});
        } catch (waErr) {
            console.warn('⚠️ WA after confirm failed:', waErr.message);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error confirming payment:', err.message);
        res.status(500).json({ error: 'Eroare la confirmarea plății: ' + err.message });
    }
});

// ── POST /api/payment/webhook ────────────────────────────────────────────────
// Stripe sends events here. Register this URL in Stripe Dashboard → Webhooks.
// IMPORTANT: this route needs raw body — mounted BEFORE express.json() in index.js
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret === 'whsec_YOUR_WEBHOOK_SECRET_HERE') {
        // Dev mode: no webhook secret set, trust the raw body
        console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)');
        try {
            const event = JSON.parse(req.body.toString());
            await handleStripeEvent(event);
        } catch (e) {
            console.error('Webhook parse error:', e.message);
        }
        return res.json({ received: true });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('⚠️  Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await handleStripeEvent(event);
    res.json({ received: true });
});

async function handleStripeEvent(event) {
    if (event.type !== 'payment_intent.succeeded') return;

    const pi = event.data.object;
        const { bookingId, paymentMode, totalAmount } = pi.metadata || {};

    if (!bookingId) {
        console.warn('⚠️  Webhook: no bookingId in metadata');
        return;
    }

    try {
        await authPb();

        const paidRON = Math.round(pi.amount_received / 100);
        const newPaymentStatus = paymentMode === 'deposit' ? 'deposit_paid' : 'paid';

        // Confirm the booking
        await pb.collection('booking').update(bookingId, {
            status: 'confirmed',
            paymentStatus: newPaymentStatus,
            paidAmount: paidRON
        });

        console.log(`✅ Stripe payment confirmed for booking ${bookingId}: ${paidRON} RON (${newPaymentStatus})`);

        // Send WhatsApp confirmation to client + owner
        try {
            const booking = await pb.collection('booking').getOne(bookingId, { $autoCancel: false });
            const ownerPhone = process.env.OWNER_WHATSAPP_PHONE || process.env.CONTACT_PHONE;
            const testPhone = process.env.TEST_WHATSAPP_PHONE;
            const isProduction = process.env.NODE_ENV === 'production';

            const clientPhone = isProduction ? booking.phone : testPhone;
            const notifyOwner = isProduction ? ownerPhone : testPhone;

            const nights = Math.round(
                (new Date(booking.checkout) - new Date(booking.checkin)) / (1000 * 60 * 60 * 24)
            );
            const bookingDataForWA = {
                name: booking.name,
                phone: booking.phone,
                checkin: booking.checkin,
                checkout: booking.checkout,
                guests: booking.guests,
                roomType: booking.roomType === 'entire' ? 'Casa Întreagă' : `${booking.numberOfRooms || 1} cameră`,
                nights,
                totalPrice: parseInt(totalAmount) || paidRON,
                paidAmount: paidRON,
                paymentMode,
                message: booking.message || ''
            };

            if (clientPhone) {
                await sendWhatsAppBookingConfirmed(clientPhone, bookingDataForWA).catch(e =>
                    console.warn('⚠️  WA to client failed:', e.message));
            }
            if (notifyOwner) {
                await sendWhatsAppBookingConfirmed(notifyOwner, {
                    ...bookingDataForWA,
                    name: `[PLATĂ CARD ✅] ${booking.name}`
                }).catch(e => console.warn('⚠️  WA to owner failed:', e.message));
            }
        } catch (waErr) {
            console.warn('⚠️  WhatsApp after payment failed:', waErr.message);
        }
    } catch (err) {
        console.error('❌ Error processing Stripe webhook:', err.message);
    }
}

export default router;

