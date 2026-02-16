import { refreshWhatsAppToken } from './whatsapp-token-helper.js';

/**
 * Formatează numărul de telefon pentru WhatsApp API
 * WhatsApp API necesită format: cod țară + număr (fără +, spații, sau alte caractere)
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;

    let formatted = phone.replace(/[\s+\-()]/g, '');

    // Dacă începe cu 0, adaugă codul țării România (40)
    if (formatted.startsWith('0')) {
        formatted = '40' + formatted.substring(1);
    }

    return formatted;
}

/**
 * Curăță textul pentru WhatsApp API
 * WhatsApp nu permite newline, tab sau mai mult de 4 spații consecutive
 */
function sanitizeWhatsAppText(text) {
    if (!text) return '';

    return text
        .replace(/[\n\r\t]/g, ' ')           // Înlocuiește newline și tab cu spațiu
        .replace(/\s{4,}/g, '   ')           // Înlocuiește 4+ spații cu 3 spații
        .trim();                              // Elimină spații de la început și sfârșit
}

export async function sendWhatsAppMessage(toPhone, bookingData) {
    let token = process.env.WHATSAPP_TOKEN;

    // Reîmprospătăm token-ul înainte de trimis
    try {
        token = await refreshWhatsAppToken();
    } catch (err) {
        console.warn('⚠️ Nu s-a putut reîmprospăta token-ul, folosim token existent:', err.message);
    }

    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

    // Formatează numărul de telefon
    const formattedPhone = formatPhoneNumber(toPhone);
    if (!formattedPhone) {
        throw new Error('Număr de telefon invalid');
    }

    console.log('📱 Trimit WhatsApp notificare rezervare către gazdă:', toPhone, '→', formattedPhone);

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
        to: formattedPhone,
        type: 'template',
        template: {
            name: 'booking_casa_chindea',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.name) },                    // {{1}} - nume client
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.phone) },                   // {{2}} - telefon
                        { type: 'text', text: String(bookingData.guests) },                                 // {{3}} - număr persoane
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.roomType) },                // {{4}} - tip cameră
                        { type: 'text', text: String(nights) },                                             // {{5}} - număr nopți
                        { type: 'text', text: formatDate(bookingData.checkin) },                           // {{6}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },                          // {{7}} - check-out
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.message) || 'Niciun mesaj adițional' } // {{8}} - mesaj
                    ]
                }
            ]
        }
    };

    console.log('📋 WhatsApp payload:', JSON.stringify(payload, null, 2));

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
        console.error('❌ Eroare WhatsApp:', data);
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp');
    }

    console.log('✅ WhatsApp trimis cu succes către gazdă:', data);
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

/**
 * Trimite notificare WhatsApp către client când rezervarea este CONFIRMATĂ
 * Template: client_confirmed_booking
 * Params: {{1}} = nume, {{2}} = check-in, {{3}} = check-out, {{4}} = nopți, {{5}} = tip cazare, {{6}} = persoane, {{7}} = preț
 */
export async function sendWhatsAppBookingConfirmed(toPhone, bookingData) {
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

    // Prețul total vine deja calculat din admin-server.js
    // Folosim totalPrice direct, cu fallback la estimare bazată pe nopți
    const totalPrice = bookingData.totalPrice || (nights * 250);

    console.log('💰 Preț pentru WhatsApp confirmare:', totalPrice);

    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
            name: 'client_booking_confirmation',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.name) },                    // {{1}} - nume client
                        { type: 'text', text: formatDate(bookingData.checkin) },                           // {{2}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },                          // {{3}} - check-out
                        { type: 'text', text: String(nights) },                                             // {{4}} - număr nopți
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.roomType) || 'Standard' },  // {{5}} - tip cazare
                        { type: 'text', text: String(bookingData.guests || 2) },                           // {{6}} - număr persoane
                        { type: 'text', text: String(totalPrice) }                                          // {{7}} - preț total
                    ]
                }
            ]
        }
    };

    console.log('📱 Trimit WhatsApp confirmare rezervare către:', toPhone);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

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
        console.error('❌ Eroare WhatsApp confirmare:', data);
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp confirmare rezervare');
    }

    console.log('✅ WhatsApp confirmare trimis cu succes:', data);
    return data;
}

/**
 * Trimite notificare WhatsApp către client când rezervarea este RESPINSĂ
 * Template: client_booking_declined
 * Params: {{1}} = nume, {{2}} = check-in, {{3}} = check-out, {{4}} = motiv
 */
export async function sendWhatsAppBookingDeclined(toPhone, bookingData, reason = 'Perioada solicitată nu este disponibilă.') {
    let token = process.env.WHATSAPP_TOKEN;

    // Reîmprospătăm token-ul înainte de trimis
    try {
        token = await refreshWhatsAppToken();
    } catch (err) {
        console.warn('⚠️ Nu s-a putut reîmprospăta token-ul, folosim token existent:', err.message);
    }

    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

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
            name: 'client_booking_declined',
            language: { code: 'ro' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: sanitizeWhatsAppText(bookingData.name) },     // {{1}} - nume client
                        { type: 'text', text: formatDate(bookingData.checkin) },            // {{2}} - check-in
                        { type: 'text', text: formatDate(bookingData.checkout) },           // {{3}} - check-out
                        { type: 'text', text: sanitizeWhatsAppText(reason) }                // {{4}} - motivul respingerii
                    ]
                }
            ]
        }
    };

    console.log('📱 Trimit WhatsApp respingere rezervare către:', toPhone);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

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
        console.error('❌ Eroare WhatsApp respingere:', data);
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp respingere rezervare');
    }

    console.log('✅ WhatsApp respingere trimis cu succes:', data);
    return data;
}

