// backend/booking-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage, sendWhatsAppConfirmationToClient } from './whatsapp.js';
dotenv.config();

const router = express.Router();

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Authenticate using a service account or skip auth if collection rules allow public access
const ensurePbAdminAuth = async () => {
    if (pb.authStore.isValid) return;

    // Try to authenticate with admin email/password if provided
    // For PocketBase 0.22+, collections can have public API rules
    // so we might not need authentication for all operations
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
        console.error('Error fetching availability:', err);
        res.status(500).json({ error: 'Error checking availability: ' + err.message });
    }
});

// Booking endpoint
router.post(`/`, async (req, res) => {
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

        console.log('✅ Rezervare creată în PocketBase:', pbResult.id);

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

        // Send WhatsApp to property owner
        try {
            await sendWhatsAppMessage(process.env.CONTACT_PHONE, whatsappData);
            console.log('✅ Mesaj WhatsApp trimis către proprietar:', process.env.CONTACT_PHONE);
        } catch (whatsappError) {
            console.error('⚠️ Eroare la trimiterea mesajului WhatsApp către proprietar:', whatsappError.message);
        }

        // Send WhatsApp confirmation to client
        try {
            // Remove country code prefix if exists and format properly
            let clientPhone = phone.replace(/\s+/g, '').replace(/^(\+|00)/, '');
            if (!clientPhone.startsWith('40')) {
                clientPhone = '40' + clientPhone.replace(/^0/, '');
            }

            await sendWhatsAppConfirmationToClient(clientPhone, whatsappData);
            console.log('✅ Mesaj WhatsApp de confirmare trimis către client:', clientPhone);
        } catch (whatsappError) {
            console.error('⚠️ Eroare la trimiterea confirmării WhatsApp către client:', whatsappError.message);
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
        console.error('❌ Eroare la rezervare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default router;