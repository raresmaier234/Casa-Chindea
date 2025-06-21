// backend/contact-server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import { sendWhatsAppMessage } from './whatsapp.js';
import PocketBase from 'pocketbase';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minut
    max: 5, // max 5 cereri per minut de la același IP
    message: 'Prea multe cereri. Încearcă din nou mai târziu.'
});

app.use('/api/contact', limiter);
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, recaptchaToken } = req.body;
    if (!name || !email || !subject || !message || !recaptchaToken) {
        return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii, inclusiv reCAPTCHA.' });
    }
    // Verificare reCAPTCHA Google
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
            from: process.env.SMTP_USER, // adresa ta validată la ElasticEmail
            to: process.env.CONTACT_TO,
            replyTo: email, // adresa introdusă de utilizator
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

const pb = new PocketBase('http://127.0.0.1:8090');
// Endpoint pentru rezervare
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Contact server running on port', PORT));
