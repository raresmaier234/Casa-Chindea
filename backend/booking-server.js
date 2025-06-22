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

// Booking endpoint
app.post(`/api/booking`, async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }
    console.log('Booking received:', { name, email, phone, guests, checkin, checkout, roomType, message });
    try {
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