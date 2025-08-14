import { refreshWhatsAppToken } from './whatsapp-token-helper.js';

export async function sendWhatsAppMessage(toPhone, bookingData) {
    let token = process.env.WHATSAPP_TOKEN;

    // Reîmprospătăm token-ul înainte de trimis
    try {
        token = await refreshWhatsAppToken();
    } catch (err) {
        console.warn('⚠️ Nu s-a putut reîmprospăta token-ul, folosim token existent:', err.message);
    }

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

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
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
