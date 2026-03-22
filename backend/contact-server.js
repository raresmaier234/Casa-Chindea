// backend/contact-server.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

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

            // Only block clear bots (score < 0.3)
            if (recaptchaData.score !== undefined && recaptchaData.score < 0.3) {
                return res.status(400).json({
                    success: false,
                    error: 'Activitate suspicioasă detectată. Încearcă din nou.'
                });
            }
        } catch (err) {
            console.warn('reCAPTCHA verification failed, continuing:', err.message);
            // Non-blocking — let the email go through even if reCAPTCHA check fails
        }
    } else {
        // No token — only block in production
        if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
                success: false,
                error: 'reCAPTCHA token lipsă.'
            });
        }
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: `"Casa Chindea" <${process.env.SMTP_USER}>`,
            to: process.env.CONTACT_TO,
            replyTo: email,
            subject: `🏡 Casa Chindea | Mesaj nou: ${subject} — de la ${name}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                    <div style="background:#059669;padding:20px 24px;">
                        <h2 style="color:#fff;margin:0;font-size:20px;">🏡 Casa Chindea — Mesaj nou de contact</h2>
                    </div>
                    <div style="padding:24px;">
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:8px 0;color:#6b7280;width:100px;font-size:14px;">Nume</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${name}</td></tr>
                            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:#059669;">${email}</a></td></tr>
                            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Subiect</td><td style="padding:8px 0;font-size:14px;">${subject}</td></tr>
                        </table>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
                        <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Mesaj:</p>
                        <p style="background:#f9fafb;border-left:4px solid #059669;padding:12px 16px;border-radius:4px;font-size:14px;color:#111827;white-space:pre-wrap;">${message}</p>
                        <p style="margin-top:20px;font-size:13px;color:#9ca3af;">Răspunde direct la acest email pentru a contacta persoana.</p>
                    </div>
                    <div style="background:#f3f4f6;padding:12px 24px;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;">Casa Chindea • Hășmaș, Harghita</p>
                    </div>
                </div>
            `
        });

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

