// backend/email.js — Shared email utility for booking notifications
import nodemailer from 'nodemailer';

/**
 * Create a configured nodemailer transporter
 * Priority: MailerSend SMTP → SendGrid → Gmail (dev)
 */
function createTransporter() {
    // 1. MailerSend SMTP (recommended for production)
    if (process.env.MAILERSEND_SMTP_USER && process.env.MAILERSEND_SMTP_PASS) {
        console.log('📧 Using MailerSend SMTP');
        return nodemailer.createTransport({
            host: 'smtp.mailersend.net',
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAILERSEND_SMTP_USER,
                pass: process.env.MAILERSEND_SMTP_PASS
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });
    }

    // 2. SendGrid (legacy)
    if (process.env.SENDGRID_API_KEY) {
        console.log('📧 Using SendGrid SMTP');
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });
    }

    // 3. Gmail (development only)
    console.log('📧 Using Gmail SMTP (dev)');
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

/**
 * Get the "from" address based on configured service
 */
function getFromAddress() {
    if (process.env.MAILERSEND_FROM) return `"Casa Chindea" <${process.env.MAILERSEND_FROM}>`;
    return `"Casa Chindea" <${process.env.SMTP_USER}>`;
}

/**
 * Format a date string to Romanian locale
 */
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('ro-RO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return dateStr; }
}

/**
 * Send email notification to owner when a NEW booking is created
 */
export async function sendBookingEmailToOwner(bookingData) {
    const hasMailer = process.env.MAILERSEND_SMTP_USER || (process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasMailer) {
        console.warn('⚠️ SMTP not configured — owner email not sent');
        return;
    }

    const { name, email, phone, guests, checkin, checkout, roomType, numberOfRooms, message, offerTitle, offerPrice } = bookingData;

    const roomDisplay = roomType === 'entire'
        ? 'Casa Întreagă'
        : `${numberOfRooms || 1} ${(numberOfRooms || 1) === 1 ? 'cameră' : 'camere'}`;

    const offerRow = offerTitle
        ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Ofertă</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">🎁 ${offerTitle}${offerPrice ? ` — ${offerPrice} RON` : ''}</td></tr>`
        : '';

    const to = process.env.CONTACT_TO || process.env.SMTP_USER;

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: getFromAddress(),
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
    <p style="font-size:13px;color:#6b7280;margin:0;">Gestionează rezervarea din <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/js/pages/admin.html" style="color:#059669;text-decoration:none;font-weight:600;">Panoul de Administrare</a></p>
  </td></tr>
  <tr><td style="background-color:#f3f4f6;padding:16px 30px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea • Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
        });
        console.log('✅ Email de rezervare nouă trimis către gazdă:', to);
    } catch (err) {
        console.error('❌ Eroare email rezervare nouă către gazdă:', err.message);
    }
}

/**
 * Send email to CLIENT when booking is CONFIRMED
 */
export async function sendBookingConfirmedEmail(booking, totalPrice) {
    const hasMailer = process.env.MAILERSEND_SMTP_USER || (process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasMailer || !booking.email) return;

    const roomDisplay = booking.roomType === 'entire' ? 'Casa Întreagă'
        : booking.roomType === 'room' ? `${booking.numberOfRooms || 1} Cameră(e)` : booking.roomType || 'Standard';

    const checkinDate = new Date(booking.checkin);
    const checkoutDate = new Date(booking.checkout);
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    const contactPhone = process.env.CONTACT_PHONE || '+40 744 308 651';

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: getFromAddress(),
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
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:0;">
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
    <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Casa Chindea. Toate drepturile rezervate.</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Hășmaș, județul Harghita, România</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
        });
        console.log('✅ Email confirmare trimis către client:', booking.email);
    } catch (err) {
        console.error('❌ Eroare email confirmare către client:', err.message);
    }
}

/**
 * Send email to CLIENT when booking is DECLINED
 */
export async function sendBookingDeclinedEmail(booking, reason) {
    const hasMailer = process.env.MAILERSEND_SMTP_USER || (process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasMailer || !booking.email) return;

    const contactPhone = process.env.CONTACT_PHONE || '+40 744 308 651';

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: getFromAddress(),
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
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px;">Te invităm să încerci alte date! Poți face o nouă rezervare oricând:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 20px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/js/pages/booking.html" 
           style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
          Fă o nouă rezervare
        </a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px;">📞 <strong>Contact:</strong> <a href="tel:${contactPhone}" style="color:#059669;text-decoration:none;">${contactPhone}</a></p>
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
        console.log('✅ Email respingere trimis către client:', booking.email);
    } catch (err) {
        console.error('❌ Eroare email respingere către client:', err.message);
    }
}

