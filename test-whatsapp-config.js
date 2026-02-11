#!/usr/bin/env node

// Test script to verify WhatsApp configuration
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 WhatsApp Configuration Check:');
console.log('================================');

console.log('WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN ? '✅ SET (length: ' + process.env.WHATSAPP_TOKEN.length + ')' : '❌ NOT SET');
console.log('WHATSAPP_PHONE_ID:', process.env.WHATSAPP_PHONE_ID ? '✅ SET (' + process.env.WHATSAPP_PHONE_ID + ')' : '❌ NOT SET');
console.log('CONTACT_PHONE:', process.env.CONTACT_PHONE ? '✅ SET (' + process.env.CONTACT_PHONE + ')' : '❌ NOT SET');

// Test template name exists
const templateName = 'booking_confirmation_casa_chindea';
console.log('Template name:', templateName);

// Test API endpoint
const apiUrl = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
console.log('API URL:', apiUrl);

if (!process.env.WHATSAPP_TOKEN) {
    console.log('❌ WHATSAPP_TOKEN is missing! Check your .env file.');
}
if (!process.env.WHATSAPP_PHONE_ID) {
    console.log('❌ WHATSAPP_PHONE_ID is missing! Check your .env file.');
}
if (!process.env.CONTACT_PHONE) {
    console.log('❌ CONTACT_PHONE is missing! Check your .env file.');
}

// Test date formatting
const testDate = new Date('2026-02-10');
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

console.log('Date formatting test:', formatDate(testDate.toISOString().split('T')[0]));

console.log('\n🔍 Common Issues to Check:');
console.log('1. Is the template "booking_confirmation_casa_chindea" created in Meta Business Manager?');
console.log('2. Is the template approved and active?');
console.log('3. Does the template have 8 parameters in the correct order?');
console.log('4. Is the WHATSAPP_TOKEN valid and not expired?');
console.log('5. Is the WHATSAPP_PHONE_ID correct?');
console.log('6. Is the CONTACT_PHONE in the correct format (without + prefix)?');
