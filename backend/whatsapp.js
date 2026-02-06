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

    // Calculate number of nights
    const checkinDate = new Date(bookingData.checkin);
    const checkoutDate = new Date(bookingData.checkout);
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));

    // Format dates to Romanian format (DD.MM.YYYY)
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
            name: 'booking_confirmation_casa_chindea',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: bookingData.name },                    // {{1}} - name
                        { type: 'text', text: formatDate(bookingData.checkin) },     // {{2}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },    // {{3}} - check-out
                        { type: 'text', text: String(nights) },                      // {{4}} - nights
                        { type: 'text', text: bookingData.roomType },                // {{5}} - room type
                        { type: 'text', text: String(bookingData.guests) }           // {{6}} - guests
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

export async function sendWhatsAppConfirmationToClient(toPhone, bookingData) {
    let token = process.env.WHATSAPP_TOKEN;

    // Reîmprospătăm token-ul înainte de trimis
    try {
        token = await refreshWhatsAppToken();
    } catch (err) {
        console.warn('⚠️ Nu s-a putut reîmprospăta token-ul, folosim token existent:', err.message);
    }

    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

    // Calculate number of nights
    const checkinDate = new Date(bookingData.checkin);
    const checkoutDate = new Date(bookingData.checkout);
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));

    // Format dates to Romanian format (DD.MM.YYYY)
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // Use custom booking confirmation template
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
            name: 'booking_confirmation_casa_chindea',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: bookingData.name },
                        { type: 'text', text: formatDate(bookingData.checkin) },
                        { type: 'text', text: formatDate(bookingData.checkout) },
                        { type: 'text', text: String(nights) },
                        { type: 'text', text: bookingData.roomType },
                        { type: 'text', text: String(bookingData.guests) }
                    ]
                }
            ]
        }
    };

    console.log('📱 Sending WhatsApp confirmation to client:', {
        to: toPhone,
        template: 'booking_confirmation_casa_chindea',
        name: bookingData.name,
        checkin: formatDate(bookingData.checkin),
        checkout: formatDate(bookingData.checkout),
        nights: nights
    });

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
        console.error('WhatsApp API error for client:', data);
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp către client');
    }

    return data;
}

