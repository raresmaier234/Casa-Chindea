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
            name: 'booking_casa_chindea',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: bookingData.name },                    // {{1}} - nume client
                        { type: 'text', text: bookingData.phone },                   // {{2}} - telefon
                        { type: 'text', text: String(bookingData.guests) },          // {{3}} - număr persoane
                        { type: 'text', text: bookingData.roomType },                // {{4}} - tip cameră
                        { type: 'text', text: String(nights) },                      // {{5}} - număr nopți
                        { type: 'text', text: formatDate(bookingData.checkin) },     // {{6}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },    // {{7}} - check-out
                        { type: 'text', text: bookingData.message || 'Niciun mesaj adițional' } // {{8}} - mesaj
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
            name: 'booking_casa_chindea',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: bookingData.name },                    // {{1}} - nume client
                        { type: 'text', text: bookingData.phone },                   // {{2}} - telefon
                        { type: 'text', text: String(bookingData.guests) },          // {{3}} - număr persoane
                        { type: 'text', text: bookingData.roomType },                // {{4}} - tip cameră
                        { type: 'text', text: String(nights) },                      // {{5}} - număr nopți
                        { type: 'text', text: formatDate(bookingData.checkin) },     // {{6}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },    // {{7}} - check-out
                        { type: 'text', text: bookingData.message || 'Niciun mesaj adițional' } // {{8}} - mesaj
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
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp către client');
    }

    return data;
}
