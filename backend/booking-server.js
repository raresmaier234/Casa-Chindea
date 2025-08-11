// backend/booking-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pb = new PocketBase(process.env.POCKET_BASE_URL);

app.get('/api/availability', async (req, res) => {
    try {
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
app.post(`/api/booking`, async (req, res) => {
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
        console.error('Eroare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default app;