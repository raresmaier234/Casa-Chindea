// backend/booking-server.js
import express from 'express';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';
import { authenticateToken } from './auth-server.js';
// dotenv loaded by index.js → env.js

const router = express.Router();

const pb = new PocketBase(process.env.POCKET_BASE_URL);

const ensurePbAdminAuth = async () => {
    if (pb.authStore.isValid) return;

    try {
        if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
            // Try authenticating as a user (superuser)
            await pb.collection('users').authWithPassword(
                process.env.POCKETBASE_ADMIN_EMAIL,
                process.env.POCKETBASE_ADMIN_PASSWORD
            );
        }
    } catch (err) {
        // If auth fails, log it but continue - collection rules might allow public access
    }
};

router.get('/booking-availability', async (req, res) => {
    // Prevent caching of availability data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    try {
        await ensurePbAdminAuth();

        // Get only confirmed bookings (not pending)
        const bookings = await pb.collection('booking').getFullList(
            200,
            {
                sort: 'checkin',
                filter: `checkin >= "${new Date().toISOString().split('T')[0]}" && status = "confirmed"`,
                $autoCancel: false
            }
        );

        // Get all calendar blocks (administrative blocks)
        let calendarBlocks = [];
        try {
            calendarBlocks = await pb.collection('calendar_blocks').getFullList(
                200,
                {
                    sort: 'startDate',
                    filter: `startDate >= "${new Date().toISOString().split('T')[0]}"`,
                    $autoCancel: false
                }
            );
        } catch (blockErr) {
        }

        // Combine bookings and calendar blocks into unavailable dates
        const unavailableDates = [
            ...bookings.map(booking => ({
                start: booking.checkin,
                end: booking.checkout,
                type: 'booking'
            })),
            ...calendarBlocks.map(block => ({
                start: block.startDate,
                end: block.endDate,
                type: 'block',
                reason: block.reason
            }))
        ];

        res.json({
            success: true,
            unavailableDates
        });
    } catch (err) {
        res.status(500).json({ error: 'Error checking availability: ' + err.message });
    }
});

// Booking endpoint - requires authentication
router.post(`/`, authenticateToken, async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, numberOfRooms, message, offerId, offerTitle, offerPrice } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    try {
        await ensurePbAdminAuth();

        // Check if dates overlap with existing CONFIRMED bookings only
        const existingBookings = await pb.collection('booking').getFullList(
            200,
            {
                filter: `(checkin <= "${checkout}" && checkout >= "${checkin}") && status = "confirmed"`,
                $autoCancel: false
            }
        );

        if (existingBookings.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate se suprapun cu o rezervare existentă.'
            });
        }

        // Prepare booking data
        const bookingData = {
            name,
            email,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            status: 'pending',
            numberOfRooms: numberOfRooms || (roomType === 'entire' ? 4 : 1),
            message
        };

        // Add offer info if present
        // NOTĂ: Câmpurile offerId, offerTitle, offerPrice trebuie adăugate în PocketBase Admin UI
        if (offerId) {
            bookingData.offerId = offerId;
            bookingData.offerTitle = offerTitle || '';
            bookingData.offerPrice = parseInt(offerPrice) || 0;
            console.log('🎁 Rezervare cu ofertă:', { offerId, offerTitle, offerPrice: bookingData.offerPrice });
        }

        console.log('📋 Date rezervare pentru salvare:', bookingData);

        let pbResult;
        try {
            pbResult = await pb.collection('booking').create(bookingData);
            console.log('✅ Rezervare salvată în PocketBase:', pbResult.id, 'offerPrice:', pbResult.offerPrice);
        } catch (pbError) {
            // Dacă eroarea e legată de câmpuri necunoscute, încearcă fără câmpurile de ofertă
            if (pbError.message && pbError.message.includes('offerId')) {
                console.warn('⚠️ Câmpurile de ofertă nu există în PocketBase, salvez fără ele');
                delete bookingData.offerId;
                delete bookingData.offerTitle;
                delete bookingData.offerPrice;

                // Adaugă info ofertă în message
                if (offerId && offerTitle) {
                    bookingData.message = (bookingData.message || '') +
                        `\n\n🎁 OFERTĂ: ${offerTitle} - ${offerPrice} RON`;
                }

                pbResult = await pb.collection('booking').create(bookingData);
                console.log('✅ Rezervare salvată (fără câmpuri ofertă):', pbResult.id);
            } else {
                throw pbError;
            }
        }


        // Send WhatsApp message
        const roomTypeDisplay = roomType === 'entire'
            ? 'Casa Întreagă'
            : `${numberOfRooms || 1} ${(numberOfRooms || 1) === 1 ? 'cameră' : 'camere'}`;

        const whatsappData = {
            name,
            phone,
            guests,
            checkin,
            checkout,
            roomType: roomTypeDisplay,
            message: message || 'Niciun mesaj adițional'
        };

        // Send WhatsApp to property owner (always to owner's real number)
        try {
            const ownerPhone = process.env.OWNER_WHATSAPP_PHONE || process.env.CONTACT_PHONE;
            if (ownerPhone) {
                console.log('📱 Trimit WhatsApp notificare rezervare nouă către gazdă:', ownerPhone);
                await sendWhatsAppMessage(ownerPhone, whatsappData);
                console.log('✅ WhatsApp trimis cu succes către gazdă');
            } else {
                console.warn('⚠️ OWNER_WHATSAPP_PHONE nu este setat — notificarea WA nu a fost trimisă');
            }
        } catch (whatsappError) {
            console.error('❌ Eroare la trimitere WhatsApp către gazdă:', whatsappError.message);
        }


        return res.json({
            success: true,
            message: 'Rezervare realizată cu succes!',
            booking: {
                id: pbResult.id,
                name: pbResult.name,
                checkin: pbResult.checkin,
                checkout: pbResult.checkout
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default router;