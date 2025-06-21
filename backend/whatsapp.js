// backend/whatsapp.js
// Trimite mesaj WhatsApp prin Meta API WhatsApp Business
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Trimite un mesaj WhatsApp folosind Meta API
 * @param {string} toPhone - numărul destinatarului (format international, ex: '407xxxxxxxx')
 * @param {string} message - textul mesajului
 * @returns {Promise<object>} răspunsul de la Meta API
 */
export async function sendWhatsAppMessage(toPhone, message) {
    // Folosește versiunea corectă din curl-ul tău (v22.0)
    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
    // Dacă vrei să trimiți un mesaj text simplu:
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: message }
    };
    // Dacă vrei să trimiți un template (exemplu):
    // const payload = {
    //     messaging_product: 'whatsapp',
    //     to: toPhone,
    //     type: 'template',
    //     template: {
    //         name: 'hello_world',
    //         language: { code: 'en_US' }
    //     }
    // };
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
        throw new Error(data.error?.message || 'Eroare la trimitere WhatsApp');
    }
    return data;
}

// Exemplu de utilizare (decomentează pentru test):
// sendWhatsAppMessage('407xxxxxxxx', 'Test rezervare Casa Chindea!').then(console.log).catch(console.error);
