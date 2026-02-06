// backend/whatsapp-token-helper.js
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Reîmprospătează token-ul WhatsApp Business
 * @returns {Promise<string>} - token-ul actualizat
 */
export async function refreshWhatsAppToken() {
    const currentToken = process.env.WHATSAPP_TOKEN;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!currentToken || !appId || !appSecret) {
        throw new Error('Verifică că FB_APP_ID, FB_APP_SECRET și WHATSAPP_TOKEN sunt setate în .env');
    }

    const url = `https://graph.facebook.com/v22.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${currentToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error?.message || 'Nu s-a putut reîmprospăta token-ul');
    }

    const newToken = data.access_token;

    // Opțional: salvăm token-ul în .env
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('WHATSAPP_TOKEN')) {
        envContent = envContent.replace(/WHATSAPP_TOKEN=.*/g, `WHATSAPP_TOKEN=${newToken}`);
    } else {
        envContent += `\nWHATSAPP_TOKEN=${newToken}`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');

    return newToken;
}
