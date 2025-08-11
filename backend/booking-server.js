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

// Authenticate with PocketBase admin
async function authenticatePB() {
    try {
        if (process.env.PB_ADMIN_EMAIL && process.env.PB_ADMIN_PASSWORD) {
            await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
            console.log('✅ PocketBase admin authenticated');
        } else {
            console.log('⚠️ No admin credentials provided, using public access');
        }
    } catch (err) {
        console.error('❌ PocketBase auth failed:', err.message);
    }
}

// Initialize auth on startup
authenticatePB();

app.get('/api/availability', async (req, res) => {
    try {
        // Ensure we're authenticated before making requests
        if (!pb.authStore.isValid && process.env.PB_ADMIN_EMAIL) {
            await authenticatePB();
        }
        
        const bookings = await pb.collection('booking').getFullList({
            sort: 'checkin',
            filter: `checkin >= "${new Date().toISOString().split('T')[0]}"`,
        });

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
app.post(`/api/booking`, async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    try {
        // Ensure we're authenticated before making requests
        if (!pb.authStore.isValid && process.env.PB_ADMIN_EMAIL) {
            await authenticatePB();
        }
        
        // Check if dates overlap with existing bookings
        const existingBookings = await pb.collection('booking').getFullList({
            filter: `(checkin <= "${checkout}" && checkout >= "${checkin}")`,
        });

        if (existingBookings.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate se suprapun cu o rezervare existentă.'
            });
        }

        console.log('Creating booking:', { name, email, phone, guests, checkin, checkout, roomType, message });

        const pbResult = await pb.collection('booking').create({
            name,
            email,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            message
        });
        
        console.log('PocketBase result:', pbResult);

        if (!process.env.CONTACT_PHONE) {
            throw new Error('CONTACT_PHONE nu este setat în .env!');
        }

        const waResult = await sendWhatsAppMessage(process.env.CONTACT_PHONE, {
            name,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            message
        });
        
        console.log('WhatsApp result:', waResult);
        res.json({ success: true });
    } catch (err) {
        console.error('Eroare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

export default app;