// backend/booking-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { sendWhatsAppMessage } from './whatsapp.js';
dotenv.config();

const router = express.Router();
const pb = new PocketBase(process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');

console.log('📅 Booking server initialized with PocketBase URL:', process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');

router.get('/api/booking-availability', async (req, res) => {
    try {
        console.log('🔍 Checking availability from PocketBase:', process.env.POCKET_BASE_URL);

        // Get all confirmed bookings
        const bookings = await pb.collection('booking').getFullList({
            sort: 'checkin',
            filter: `checkin >= "${new Date().toISOString().split('T')[0]}" && status != "cancelled"`,
        });

        console.log(`📋 Found ${bookings.length} active bookings`);

        // Get all calendar blocks (admin-blocked dates)
        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            sort: 'startDate',
            filter: `endDate >= "${new Date().toISOString().split('T')[0]}"`
        });

        console.log(`🚫 Found ${calendarBlocks.length} calendar blocks`);

        const unavailableDates = [];

        // Add booking dates
        bookings.forEach(booking => {
            unavailableDates.push({
                start: booking.checkin,
                end: booking.checkout,
                type: 'booking',
                reason: 'Rezervat'
            });
        });

        // Add blocked dates
        calendarBlocks.forEach(block => {
            unavailableDates.push({
                start: block.startDate,
                end: block.endDate,
                type: 'blocked',
                reason: block.reason || 'Blocat de administrator'
            });
        });

        console.log(`✅ Found ${unavailableDates.length} unavailable date ranges`);

        res.json({
            success: true,
            unavailableDates
        });
    } catch (err) {
        console.error('❌ Error fetching availability:', err);
        res.status(500).json({
            success: false,
            error: 'Error checking availability: ' + err.message
        });
    }
});

// Booking endpoint
router.post('/api/booking', async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;

    console.log('📝 New booking request:', { name, email, checkin, checkout, guests, roomType });
    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        console.error('❌ Missing required fields:', { name: !!name, email: !!email, phone: !!phone, guests: !!guests, checkin: !!checkin, checkout: !!checkout, roomType: !!roomType });
        return res.status(400).json({
            success: false,
            error: 'Toate câmpurile obligatorii trebuie completate.'
        });
    }

    try {
        console.log('🔍 Checking for existing bookings...');
        // Check if dates overlap with existing confirmed bookings
        const existingBookings = await pb.collection('booking').getFullList({
            filter: `(checkin <= "${checkout}" && checkout >= "${checkin}") && status != "cancelled"`,
        });

        console.log(`📋 Found ${existingBookings.length} conflicting bookings`);

        if (existingBookings.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ne pare rău, dar datele selectate se suprapun cu o rezervare existentă.'
            });
        }

        console.log('🔍 Checking for calendar blocks...');
        // Check if dates overlap with calendar blocks (admin-blocked dates)
        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            filter: `(startDate <= "${checkout}" && endDate >= "${checkin}")`
        });

        console.log(`🚫 Found ${calendarBlocks.length} blocking calendar entries`);

        if (calendarBlocks.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ne pare rău, dar datele selectate sunt blocate pentru rezervări.'
            });
        }

        console.log('💾 Creating booking in PocketBase...');
        const pbResult = await pb.collection('booking').create({
            name,
            email,
            phone,
            guests,
            checkin,
            checkout,
            roomType,
            message,
            status: 'pending'
        });

        console.log('✅ Booking created with ID:', pbResult.id);

        if (!process.env.CONTACT_PHONE) {
            console.warn('⚠️ CONTACT_PHONE nu este setat în .env!');
        } else {
            console.log('📱 Sending WhatsApp message...');
            try {
                await sendWhatsAppMessage(process.env.CONTACT_PHONE, {
                    name,
                    phone,
                    guests,
                    checkin,
                    checkout,
                    roomType,
                    message
                });
                console.log('✅ WhatsApp message sent successfully');
            } catch (whatsappErr) {
                console.error('❌ WhatsApp error:', whatsappErr);
                // Don't fail the booking if WhatsApp fails
            }
        }

        res.json({
            success: true,
            message: 'Rezervarea a fost trimisă cu succes! Veți fi contactat în curând.',
            booking: {
                id: pbResult.id,
                name: pbResult.name,
                email: pbResult.email,
                checkin: pbResult.checkin,
                checkout: pbResult.checkout,
                status: pbResult.status
            }
        });
    } catch (err) {
        console.error('❌ Booking error:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la rezervare: ' + err.message
        });
    }
});

export default router;