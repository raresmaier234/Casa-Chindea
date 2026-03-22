// backend/contact-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { sendContactEmail } from './email.js';

// dotenv loaded by index.js → env.js

const router = express.Router();

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Prea multe cereri. Încearcă din nou mai târziu.'
});

router.use('/api/contact', limiter);
router.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, recaptchaToken } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({
            success: false,
            error: 'Toate câmpurile sunt obligatorii.'
        });
    }

    // Verify reCAPTCHA v3 token (skip in dev if token missing)
    if (recaptchaToken) {
        try {
            const recaptchaSecret = process.env.RECAPTCHA_SECRET;
            const recaptchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
            });
            const recaptchaData = await recaptchaRes.json();

            if (!recaptchaData.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Verificarea reCAPTCHA a eșuat. Încearcă din nou.'
                });
            }

            if (recaptchaData.score !== undefined && recaptchaData.score < 0.3) {
                return res.status(400).json({
                    success: false,
                    error: 'Activitate suspicioasă detectată. Încearcă din nou.'
                });
            }
        } catch (err) {
            console.warn('reCAPTCHA verification failed, continuing:', err.message);
        }
    } else {
        if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
                success: false,
                error: 'reCAPTCHA token lipsă.'
            });
        }
    }

    try {
        await sendContactEmail({ name, email, subject, message });

        res.json({
            success: true,
            message: 'Mesajul a fost trimis cu succes!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Eroare la trimitere: ' + err.message
        });
    }
});

export default router;
