// backend/booking-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';
dotenv.config();

const router = express.Router();

const pb = new PocketBase(process.env.POCKET_BASE_URL);
let pbAdminLoginPromise;
const ensurePbAdminAuth = async () => {
    if (pb.authStore.isValid) return;
    if (!pbAdminLoginPromise) {
        pbAdminLoginPromise = pb.admins.authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.POCKETBASE_ADMIN_PASSWORD
        ).catch(err => {
            pbAdminLoginPromise = null;
            console.error('PocketBase admin auth failed:', err?.message || err);
            throw err;
        });
    }
    await pbAdminLoginPromise;
};

router.get('/booking-availability', async (req, res) => {
    try {
        await ensurePbAdminAuth();
        const bookings = await pb.collection('booking').getFullList(
            200, // batch size maxim, poți pune și mai mic dacă vrei
            {
                sort: 'checkin',
                filter: `checkin >= "${new Date().toISOString().split('T')[0]}"`,
                $autoCancel: false // opțional, previne auto-cancel dacă faci mai multe request-uri simultan
            }
        );

        const unavailableDates = bookings.map(booking => ({
            start: booking.checkin,
            end: booking.checkout
        }));

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
    const { name, email, phone, guests, checkin, checkout, roomType, numberOfRooms, message } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    try {
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

        const pbResult = await pb.collection('booking').create({
            name,
            email,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            numberOfRooms: numberOfRooms || (roomType === 'entire' ? 4 : 1),
            message
        });

        const roomTypeDisplay = roomType === 'entire'
            ? 'Casa Întreagă'
            : `${numberOfRooms || 1} ${(numberOfRooms || 1) === 1 ? 'cameră' : 'camere'}`;

        await sendWhatsAppMessage(process.env.CONTACT_PHONE, {
            name,
            phone,
            guests,
            checkin,
            checkout,
            roomType: roomTypeDisplay,
            message
        });
        return pbResult;
    } catch (err) {
        console.error('Eroare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default router;