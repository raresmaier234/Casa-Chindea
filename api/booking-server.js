// api/booking-server.js
import express from 'express';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';

const router = express.Router();
const pb = new PocketBase(process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');

router.get('/api/availability', async (req, res) => {
    try {
        console.log('🗓️ Checking availability from PocketBase:', process.env.POCKET_BASE_URL);

        // Get all confirmed bookings
        const bookings = await pb.collection('booking').getFullList({
            sort: 'checkin',
            filter: `checkin >= "${new Date().toISOString().split('T')[0]}" && status != "cancelled"`,
        });

        // Get all calendar blocks (admin-blocked dates)
        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            sort: 'startDate',
            filter: `endDate >= "${new Date().toISOString().split('T')[0]}"`
        });

        const unavailableDates = [];

        // Add booking dates
        bookings.forEach(booking => {
            unavailableDates.push({
                start: booking.checkin,
                end: booking.checkout,
                type: 'booking',
                reason: 'Rezervat'
            });
        });

        // Add blocked dates
        calendarBlocks.forEach(block => {
            unavailableDates.push({
                start: block.startDate,
                end: block.endDate,
                type: 'blocked',
                reason: block.reason || 'Blocat de administrator'
            });
        });

        console.log(`✅ Found ${unavailableDates.length} unavailable date ranges`);

        res.json({
            success: true,
            unavailableDates
        });
    } catch (err) {
        console.error('❌ Error fetching availability:', err);
        res.status(500).json({ error: 'Error checking availability: ' + err.message });
    }
});

// Booking endpoint
router.post('/api/booking', async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    try {
        // Check if dates overlap with existing confirmed bookings
        const existingBookings = await pb.collection('booking').getFullList({
            filter: `(checkin <= "${checkout}" && checkout >= "${checkin}") && status != "cancelled"`,
        });

        if (existingBookings.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate se suprapun cu o rezervare existentă.'
            });
        }

        // Check if dates overlap with calendar blocks (admin-blocked dates)
        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            filter: `(startDate <= "${checkout}" && endDate >= "${checkin}")`
        });

        if (calendarBlocks.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate sunt blocate pentru rezervări.'
            });
        }

        const pbResult = await pb.collection('booking').create({
            name,
            email,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            message,
            status: 'pending'
        });

        if (!process.env.CONTACT_PHONE) {
            throw new Error('CONTACT_PHONE nu este setat în .env!');
        }

        await sendWhatsAppMessage(process.env.CONTACT_PHONE, {
            name,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            message
        });

        res.json({
            success: true,
            message: 'Rezervarea a fost trimisă cu succes! Veți fi contactat în curând.',
            booking: pbResult
        });
    } catch (err) {
        console.error('❌ Booking error:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default router;
