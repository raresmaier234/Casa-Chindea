// backend/email.js — Shared email utility for booking notifications
// Fallback chain: MailerSend → Resend → Gmail SMTP
import nodemailer from 'nodemailer';

// ─── Core send function ────────────────────────────────────────────────────

/**
 * Send an email. Tries providers in order until one succeeds.
 * @param {{ to: string, subject: string, html: string, from?: string, replyTo?: string }} opts
 */
async function sendEmail({ to, subject, html, from, replyTo }) {
    const fromName = 'Casa Chindea';
    const errors = [];

    // 1. MailerSend HTTP API
    const mailersendKey = process.env.MAILERSEND_API_KEY;
    if (mailersendKey) {
        try {
            const fromEmail = from || process.env.MAILERSEND_FROM || process.env.SMTP_USER;
            console.log(`📧 Trying MailerSend: to=${to}`);
            const body = {
                from: { email: fromEmail, name: fromName },
                to: [{ email: to }],
                subject,
                html
            };
            if (replyTo) body.reply_to = [{ email: replyTo }];

            const resp = await fetch('https://api.mailersend.com/v1/email', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mailersendKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (resp.ok || resp.status === 202) {
                console.log('✅ Email sent via MailerSend');
                return { provider: 'mailersend', status: resp.status };
            }

            const errBody = await resp.text().catch(() => '');
            console.warn(`⚠️ MailerSend failed (${resp.status}), trying next provider...`);
            errors.push(`MailerSend ${resp.status}: ${errBody}`);
        } catch (err) {
            console.warn('⚠️ MailerSend error, trying next provider:', err.message);
            errors.push(`MailerSend: ${err.message}`);
        }
    }

    // 2. Resend HTTP API (3000 emails/month free, no recipient limit)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
        try {
            const fromEmail = from || process.env.RESEND_FROM || `${fromName} <onboarding@resend.dev>`;
            console.log(`📧 Trying Resend: to=${to}`);
            const body = { from: fromEmail, to: [to], subject, html };
            if (replyTo) body.reply_to = [replyTo];

            const resp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (resp.ok) {
                const data = await resp.json();
                console.log('✅ Email sent via Resend');
                return { provider: 'resend', id: data.id };
            }

            const errBody = await resp.text().catch(() => '');
            console.warn(`⚠️ Resend failed (${resp.status}), trying next provider...`);
            errors.push(`Resend ${resp.status}: ${errBody}`);
        } catch (err) {
            console.warn('⚠️ Resend error, trying next provider:', err.message);
            errors.push(`Resend: ${err.message}`);
        }
    }

    // 3. Gmail SMTP fallback
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            console.log(`📧 Trying Gmail SMTP: to=${to}`);
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000
            });

            const mailOpts = {
                from: `"${fromName}" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html
            };
            if (replyTo) mailOpts.replyTo = replyTo;

            const info = await transporter.sendMail(mailOpts);
            console.log('✅ Email sent via Gmail SMTP');
            return { provider: 'gmail', messageId: info.messageId };
        } catch (err) {
            console.warn('⚠️ Gmail SMTP failed:', err.message);
            errors.push(`Gmail: ${err.message}`);
        }
    }

    // All providers failed
    if (errors.length > 0) {
        console.error('❌ All email providers failed:', errors.join(' | '));
        throw new Error('Email send failed: ' + errors.join(' | '));
    }

    console.warn('⚠️ No email provider configured (set MAILERSEND_API_KEY, RESEND_API_KEY, or SMTP_USER+SMTP_PASS)');
    return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('ro-RO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return dateStr; }
}

// ─── Booking: new reservation → email to OWNER ─────────────────────────────

export async function sendBookingEmailToOwner(bookingData) {
    const { name, email, phone, guests, checkin, checkout, roomType, numberOfRooms, message, offerTitle, offerPrice } = bookingData;

    const roomDisplay = roomType === 'entire'
        ? 'Casa Întreagă'
        : `${numberOfRooms || 1} ${(numberOfRooms || 1) === 1 ? 'cameră' : 'camere'}`;

    const offerRow = offerTitle
        ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Ofertă</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">🎁 ${offerTitle}${offerPrice ? ` — ${offerPrice} RON` : ''}</td></tr>`
        : '';

    const to = process.env.CONTACT_TO || process.env.MAILERSEND_FROM || process.env.SMTP_USER;

    try {
        const result = await sendEmail({
            to,
            replyTo: email,
            subject: `🏡 Casa Chindea | Rezervare nouă de la ${name}`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:20px 30px;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">🏡 Casa Chindea — Rezervare nouă</h2>
    <p style="color:#d1fae5;margin:6px 0 0;font-size:13px;">O nouă solicitare de rezervare a fost primită</p>
  </td></tr>
  <tr><td style="padding:24px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;font-size:14px;vertical-align:top;">Nume</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#111827;">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:#059669;text-decoration:none;">${email}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Telefon</td><td style="padding:8px 0;font-size:14px;"><a href="tel:${phone}" style="color:#059669;text-decoration:none;">${phone}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Check-in</td><td style="padding:8px 0;font-size:14px;color:#111827;">${formatDate(checkin)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Check-out</td><td style="padding:8px 0;font-size:14px;color:#111827;">${formatDate(checkout)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Persoane</td><td style="padding:8px 0;font-size:14px;color:#111827;">${guests}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Tip cazare</td><td style="padding:8px 0;font-size:14px;color:#111827;">${roomDisplay}</td></tr>
      ${offerRow}
    </table>
    ${message ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Mesaj de la client:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background-color:#f9fafb;border-left:4px solid #059669;padding:12px 16px;border-radius:4px;font-size:14px;color:#111827;white-space:pre-wrap;">${message}</td>
    </tr></table>` : ''}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="font-size:13px;color:#6b7280;margin:0;">Gestionează rezervarea din <a href="${process.env.FRONTEND_URL || 'https://www.casachindea.ro'}/admin" style="color:#059669;text-decoration:none;font-weight:600;">Panoul de Administrare</a></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea • Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
        });
        console.log('✅ Email rezervare nouă trimis către gazdă:', to, result?.provider);
    } catch (err) {
        console.error('❌ Eroare email rezervare nouă:', err.message);
    }
}

// ─── Booking confirmed → email to CLIENT ────────────────────────────────────

export async function sendBookingConfirmedEmail(booking, totalPrice) {
    if (!booking.email) return;

    const roomDisplay = booking.roomType === 'entire' ? 'Casa Întreagă'
        : booking.roomType === 'room' ? `${booking.numberOfRooms || 1} Cameră(e)` : booking.roomType || 'Standard';

    const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / (1000 * 60 * 60 * 24));
    const contactPhone = process.env.CONTACT_PHONE || '+40 744 308 651';

    try {
        const result = await sendEmail({
            to: booking.email,
            subject: `🏡 Casa Chindea | Rezervarea ta a fost confirmată! ✅`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:24px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">🏡 Casa Chindea</h1>
    <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Rezervare Confirmată ✅</p>
  </td></tr>
  <tr><td style="padding:30px;">
    <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Salut, ${booking.name}! 🎉</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">Rezervarea ta la Casa Chindea a fost <strong style="color:#059669;">confirmată</strong>! Te așteptăm cu drag.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <tr><td style="padding:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px;font-size:14px;">📅 Check-in</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#111827;">${formatDate(booking.checkin)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📅 Check-out</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#111827;">${formatDate(booking.checkout)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">🌙 Nopți</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#111827;">${nights}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">👥 Persoane</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#111827;">${booking.guests}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">🏠 Cazare</td><td style="padding:6px 0;font-weight:600;font-size:14px;color:#111827;">${roomDisplay}</td></tr>
          ${totalPrice ? `<tr><td style="padding:10px 0 6px;color:#6b7280;font-size:14px;border-top:1px solid #bbf7d0;">💰 Total</td><td style="padding:10px 0 6px;font-weight:bold;font-size:18px;color:#059669;border-top:1px solid #bbf7d0;">${totalPrice} RON</td></tr>` : ''}
        </table>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px;">📍 <strong>Adresă:</strong> Hășmaș, județul Harghita, România</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">📞 <strong>Contact:</strong> <a href="tel:${contactPhone}" style="color:#059669;text-decoration:none;">${contactPhone}</a></p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">Cu drag,<br><strong>Echipa Casa Chindea</strong></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea • Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
        });
        console.log('✅ Email confirmare trimis către:', booking.email, result?.provider);
    } catch (err) {
        console.error('❌ Eroare email confirmare:', err.message);
    }
}

// ─── Booking declined → email to CLIENT ─────────────────────────────────────

export async function sendBookingDeclinedEmail(booking, reason) {
    if (!booking.email) return;

    const contactPhone = process.env.CONTACT_PHONE || '+40 744 308 651';

    try {
        const result = await sendEmail({
            to: booking.email,
            subject: `🏡 Casa Chindea | Actualizare rezervare`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:24px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">🏡 Casa Chindea</h1>
    <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Actualizare Rezervare</p>
  </td></tr>
  <tr><td style="padding:30px;">
    <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Salut, ${booking.name}!</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">Din păcate, rezervarea ta pentru perioada <strong>${formatDate(booking.checkin)}</strong> — <strong>${formatDate(booking.checkout)}</strong> nu a putut fi confirmată.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background-color:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;">
        <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Motiv:</strong> ${reason || 'Perioada solicitată nu este disponibilă.'}</p>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px;">Te invităm să încerci alte date!</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 20px;">
        <a href="${process.env.FRONTEND_URL || 'https://www.casachindea.ro'}/booking"
           style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
          Fă o nouă rezervare
        </a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px;">📞 <strong>Contact:</strong> <a href="tel:${contactPhone}" style="color:#059669;text-decoration:none;">${contactPhone}</a></p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">Cu drag,<br><strong>Echipa Casa Chindea</strong></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea • Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
        });
        console.log('✅ Email respingere trimis către:', booking.email, result?.provider);
    } catch (err) {
        console.error('❌ Eroare email respingere:', err.message);
    }
}

// ─── Verification code email (used by auth-server) ──────────────────────────

export async function sendVerificationEmail(email, name, code) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://www.casachindea.ro'}/verify-email?email=${encodeURIComponent(email)}&code=${code}`;

    try {
        const result = await sendEmail({
        to: email,
        subject: '🏡 Casa Chindea | Confirmă-ți contul',
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:24px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">🏡 Casa Chindea</h1>
    <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Bine ai venit!</p>
  </td></tr>
  <tr><td style="padding:30px;">
    <h2 style="color:#111827;margin:0 0 16px;font-size:20px;font-weight:600;">Salut, ${name}! 👋</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">Mulțumim pentru că ai ales să creezi un cont la Casa Chindea!</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">Pentru a finaliza înregistrarea, te rugăm să introduci codul de verificare de mai jos:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div style="background-color:#f0fdf4;border:2px solid #059669;padding:20px;text-align:center;font-size:32px;font-weight:bold;color:#059669;letter-spacing:8px;border-radius:8px;font-family:monospace;">${code}</div>
      </td></tr>
    </table>
    <p style="text-align:center;color:#6b7280;font-size:13px;margin:20px 0 12px;">Sau dă click pe butonul de mai jos:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${verifyUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Verifică Contul</a>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
    <p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 12px;"><strong>Important:</strong> Acest cod este valabil 15 minute și poate fi folosit o singură dată.</p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 20px;">Dacă nu ai solicitat crearea acestui cont, te rugăm să ignori acest email.</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">Cu drag,<br><strong>Echipa Casa Chindea</strong></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea. Toate drepturile rezervate.</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
    });

        if (result) {
            console.log('✅ Verification email sent to:', email, 'via', result.provider);
            return true;
        }
        console.warn('⚠️ No email provider configured — verification email not sent to:', email);
        return false;
    } catch (err) {
        console.error('❌ Failed to send verification email to:', email, '— Error:', err.message);
        return false;
    }
}

// ─── Contact form email (used by contact-server) ────────────────────────────

export async function sendContactEmail({ name, email, subject, message }) {
    const to = process.env.CONTACT_TO || process.env.MAILERSEND_FROM || process.env.SMTP_USER;

    const result = await sendEmail({
        to,
        replyTo: email,
        subject: `🏡 Casa Chindea | Mesaj nou: ${subject} — de la ${name}`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:20px 30px;">
    <h2 style="color:#ffffff;margin:0;font-size:20px;">🏡 Casa Chindea — Mesaj nou de contact</h2>
  </td></tr>
  <tr><td style="padding:24px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#6b7280;width:100px;font-size:14px;vertical-align:top;">Nume</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#111827;">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:#059669;text-decoration:none;">${email}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Subiect</td><td style="padding:8px 0;font-size:14px;color:#111827;">${subject}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Mesaj:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background-color:#f9fafb;border-left:4px solid #059669;padding:12px 16px;border-radius:4px;font-size:14px;color:#111827;white-space:pre-wrap;">${message}</td>
    </tr></table>
    <p style="margin-top:20px;font-size:13px;color:#9ca3af;">Răspunde direct la acest email pentru a contacta persoana.</p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea • Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
    });

    if (!result) throw new Error('No email provider configured');
    console.log('✅ Contact email sent via', result.provider);
    return result;
}

// ─── Password reset email (used by auth-server) ─────────────────────────────

export async function sendPasswordResetEmail(email, code) {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://www.casachindea.ro'}/reset-password?email=${encodeURIComponent(email)}&code=${code}`;

    const result = await sendEmail({
        to: email,
        subject: '🔑 Casa Chindea | Resetare parolă',
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-color:#ffffff;">
  <tr><td style="background-color:#059669;padding:24px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">🏡 Casa Chindea</h1>
    <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Resetare parolă</p>
  </td></tr>
  <tr><td style="padding:30px;">
    <h2 style="color:#111827;margin:0 0 16px;font-size:20px;font-weight:600;">Ai solicitat resetarea parolei 🔑</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">Am primit o cerere de resetare a parolei pentru contul tău. Folosește codul de mai jos sau apasă pe buton pentru a seta o parolă nouă:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div style="background-color:#fef3c7;border:2px solid #f59e0b;padding:20px;text-align:center;font-size:32px;font-weight:bold;color:#b45309;letter-spacing:8px;border-radius:8px;font-family:monospace;">${code}</div>
      </td></tr>
    </table>
    <p style="text-align:center;color:#6b7280;font-size:13px;margin:20px 0 12px;">Sau dă click pe butonul de mai jos:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Resetează Parola</a>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
    <p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 12px;"><strong>Important:</strong> Acest cod este valabil 15 minute și poate fi folosit o singură dată.</p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 20px;">Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email. Parola ta nu va fi modificată.</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">Cu drag,<br><strong>Echipa Casa Chindea</strong></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea. Toate drepturile rezervate.</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
    });

    if (result) {
        console.log('✅ Password reset email sent to:', email, 'via', result.provider);
        return true;
    }
    return false;
}

