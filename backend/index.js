// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import PocketBase from 'pocketbase';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const pb = new PocketBase(process.env.POCKET_BASE_URL);

app.use(cors());
app.use(express.json());

app.use(express.static(join(__dirname, "js")));

app.get('/api/photos', async (req, res) => {
    try {
        const photos = await pb.collection('photos').getList(1, 10, { sort: '-created' });
        // Construiește URL-urile imaginilor
        const items = photos.items.map(photo => ({
            ...photo,
            imageUrl: pb.files.getUrl(photo, photo.image)
        }));
        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: 'Eroare la încărcarea pozelor.' });
    }
});

// Endpoint to serve the configuration file
app.get(`/auth_config.json`, (req, res) => {
    res.sendFile(join(__dirname, "auth_config.json"));
});

// Serve the index page for all other requests (catch-all, must be last)
app.get(/^\/(?!api).*/, (_, res) => {
    res.sendFile(join(__dirname, "index.html"));
});


const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Prea multe cereri. Încearcă din nou mai târziu.'
});
app.use(`/contact`, limiter);

// Contact endpoint
app.post(`/contact`, async (req, res) => {
    const { name, email, subject, message, recaptchaToken } = req.body;
    if (!name || !email || !subject || !message || !recaptchaToken) {
        return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii, inclusiv reCAPTCHA.' });
    }
    try {
        const recaptchaSecret = process.env.RECAPTCHA_SECRET;
        const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
        });
        const recaptchaData = await recaptchaRes.json();
        if (!recaptchaData.success) {
            return res.status(400).json({ error: 'Verificarea reCAPTCHA a eșuat. Încearcă din nou.' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Eroare la verificarea reCAPTCHA.' });
    }
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.elasticemail.com',
            port: 2525,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.CONTACT_TO,
            replyTo: email,
            subject: `${subject} (de la ${name})`,
            html: `
        <h3>Mesaj de la ${name}</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subiect:</strong> ${subject}</p>
        <p><strong>Mesaj:</strong><br>${message}</p>
    `
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Eroare la trimitere: ' + err.message });
    }
});

// backend/whatsapp.js
// Trimite mesaj WhatsApp prin Meta API WhatsApp Business

/**
 * Trimite un mesaj WhatsApp folosind Meta API
 * @param {string} toPhone - numărul destinatarului (format international, ex: '407xxxxxxxx')
 * @param {object} bookingData - obiect cu datele rezervării
 * @returns {Promise<object>} răspunsul de la Meta API
 */
export async function sendWhatsAppMessage(toPhone, bookingData) {
    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
            name: 'booking_casa_chindea',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: bookingData.name },
                        { type: 'text', text: bookingData.phone },
                        { type: 'text', text: String(bookingData.guests) },
                        { type: 'text', text: bookingData.checkin },
                        { type: 'text', text: bookingData.checkout },
                        { type: 'text', text: bookingData.roomType },
                        { type: 'text', text: bookingData.message || '-' }
                    ]
                }
            ]
        }
    };
    console.log('WhatsApp API payload:', JSON.stringify(payload, null, 2));
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('WhatsApp API error:', data);
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp');
    }
    return data;
}

// Exemplu de utilizare (decomentează pentru test):
// sendWhatsAppMessage('407xxxxxxxx', 'Test rezervare Casa Chindea!').then(console.log).catch(console.error);

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running on port', PORT));
