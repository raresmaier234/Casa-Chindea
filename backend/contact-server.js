// backend/contact-server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

dotenv.config();

const router = express.Router();

console.log('📧 Contact server initialized');

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Prea multe cereri. Încearcă din nou mai târziu.'
});

router.use('/api/contact', limiter);
router.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, recaptchaToken } = req.body;

    console.log('📧 New contact form submission:', { name, email, subject });

    if (!name || !email || !subject || !message || !recaptchaToken) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
            success: false,
            error: 'Toate câmpurile sunt obligatorii, inclusiv reCAPTCHA.'
        });
    }

    try {
        console.log('🔍 Verifying reCAPTCHA...');
        const recaptchaSecret = process.env.RECAPTCHA_SECRET;
        const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
        });
        const recaptchaData = await recaptchaRes.json();

        if (!recaptchaData.success) {
            console.error('❌ reCAPTCHA verification failed');
            return res.status(400).json({
                success: false,
                error: 'Verificarea reCAPTCHA a eșuat. Încearcă din nou.'
            });
        }

        console.log('✅ reCAPTCHA verified');
    } catch (err) {
        console.error('❌ reCAPTCHA error:', err);
        return res.status(500).json({
            success: false,
            error: 'Eroare la verificarea reCAPTCHA.'
        });
    }

    try {
        console.log('📤 Sending email...');
        const transporter = nodemailer.createTransporter({
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

        console.log('✅ Email sent successfully');
        res.json({
            success: true,
            message: 'Mesajul a fost trimis cu succes!'
        });
    } catch (err) {
        console.error('❌ Email error:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la trimitere: ' + err.message
        });
    }
});

export default router;

