// backend/contact-server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import { sendWhatsAppMessage } from './whatsapp.js';
import pb from '../js/pb.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Prea multe cereri. Încearcă din nou mai târziu.'
});

app.use('/api/contact', limiter);
app.post(`/api/contact`, async (req, res) => {
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
