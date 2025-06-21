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
const pb = new PocketBase('http://127.0.0.1:8090');


app.post('/api/booking', async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    // Debug: loghează datele primite
    console.log('Booking received:', { name, email, phone, guests, checkin, checkout, roomType, message });

    const text = `Rezervare nouă Casa Chindea:\nNume: ${name}\nTelefon: ${phone}\nEmail: ${email}\nPersoane: ${guests}\nCheck-in: ${checkin}\nCheck-out: ${checkout}\nCameră: ${roomType}\nMesaj: ${message || '-'}`;

    try {
        // Salvează în PocketBase (colecția booking, câmpurile trebuie să corespundă cu schema PB!)
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

        // Trimite mesaj WhatsApp
        if (!process.env.CONTACT_PHONE) {
            throw new Error('CONTACT_PHONE nu este setat în .env!');
        }
        const waResult = await sendWhatsAppMessage(process.env.CONTACT_PHONE, text);
        console.log('WhatsApp result:', waResult);

        res.json({ success: true });
    } catch (err) {
        console.error('Eroare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});


const PORT = process.env.BOOKING_PORT || 3002;
app.listen(PORT, () => console.log('Booking server running on port', PORT));
