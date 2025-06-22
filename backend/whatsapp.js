// backend/whatsapp.js
// Trimite mesaj WhatsApp prin Meta API WhatsApp Business
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

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

export default app;