// backend/booking-server.js
import express from 'express';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';
import { authenticateToken } from './auth-server.js';
dotenv.config();

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
            console.log('✅ PocketBase authenticated as user');
        }
    } catch (err) {
        // If auth fails, log it but continue - collection rules might allow public access
        console.log('⚠️ PocketBase auth skipped (will use public API rules):', err?.message);
    }
};

router.get('/booking-availability', async (req, res) => {
    try {
        await ensurePbAdminAuth();

        // Get all confirmed bookings
        const bookings = await pb.collection('booking').getFullList(
            200,
            {
                sort: 'checkin',
                filter: `checkin >= "${new Date().toISOString().split('T')[0]}"`,
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
            console.log('⚠️ Could not fetch calendar blocks (might not exist yet):', blockErr.message);
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

        // Check if dates overlap with existing bookings
        const existingBookings = await pb.collection('booking').getFullList(
            200,
            {
                filter: `(checkin <= "${checkout}" && checkout >= "${checkin}")`,
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
        if (offerId) {
            bookingData.offerId = offerId;
            bookingData.offerTitle = offerTitle || '';
            bookingData.offerPrice = offerPrice || 0;
            console.log('🎁 Booking with special offer:', offerTitle);
        }

        const pbResult = await pb.collection('booking').create(bookingData);


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

        // Send WhatsApp to property owner only
        try {
            await sendWhatsAppMessage(process.env.CONTACT_PHONE, whatsappData);
        } catch (whatsappError) {
            // Log WhatsApp error silently, don't show to user
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