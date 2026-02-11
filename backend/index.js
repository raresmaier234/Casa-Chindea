// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bookingRouter from './booking-server.js';
import contactRouter from './contact-server.js';
import galleryRouter from './gallery-server.js';
import authRouter from './auth-server.js';
import adminRouter from './admin-server.js';

// Load .env from parent directory (root of project)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();

// Configure CORS for Vercel frontend
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://casa-chindea.vercel.app',
        'https://*.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

app.use(express.static(join(__dirname, "js")));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authRouter);
app.use('/api/booking', bookingRouter);
app.use(contactRouter);
app.use(galleryRouter);
app.use('/api/admin', adminRouter);

// Public prices endpoint
app.get('/api/prices', async (req, res) => {
    const defaultPrices = {
        priceRoom: 150,
        priceEntire: 500,
        priceBreakfast: 35,
        priceBreakfastChild: 20,
        surchargeWeekend: 0,
        surchargeHoliday: 0
    };

    // Try to read from JSON file first (most reliable)
    const pricesFilePath = join(__dirname, 'prices.json');
    try {
        const fs = await import('fs');
        if (fs.existsSync(pricesFilePath)) {
            const fileData = fs.readFileSync(pricesFilePath, 'utf8');
            const prices = JSON.parse(fileData);
            return res.json({ success: true, prices });
        }
    } catch (fileErr) {
    }

    // Fallback to PocketBase
    try {
        const PocketBase = (await import('pocketbase')).default;
        const pb = new PocketBase(process.env.POCKET_BASE_URL);

        const records = await pb.collection('prices').getFullList({
            sort: '-created',
            $autoCancel: false
        });

        if (records.length > 0) {
            const prices = records[0];
            res.json({
                success: true,
                prices: {
                    priceRoom: prices.priceRoom,
                    priceEntire: prices.priceEntire,
                    priceBreakfast: prices.priceBreakfast,
                    priceBreakfastChild: prices.priceBreakfastChild,
                    surchargeWeekend: prices.surchargeWeekend,
                    surchargeHoliday: prices.surchargeHoliday
                }
            });
        } else {
            res.json({ success: true, prices: defaultPrices });
        }
    } catch (err) {
        console.error('Error fetching prices:', err.message);
        res.json({ success: true, prices: defaultPrices });
    }
});

// Public offers endpoint
app.get('/api/offers', async (req, res) => {
    const offersFilePath = join(__dirname, 'offers.json');

    // Try to read from JSON file first
    try {
        const fs = await import('fs');
        if (fs.existsSync(offersFilePath)) {
            const fileData = fs.readFileSync(offersFilePath, 'utf8');
            const offers = JSON.parse(fileData);
            const activeOffers = offers.filter(o => o.active && new Date(o.endDate) >= new Date());
            return res.json({ success: true, offers: activeOffers });
        }
    } catch (fileErr) {
    }

    // Fallback to PocketBase
    try {
        const PocketBase = (await import('pocketbase')).default;
        const pb = new PocketBase(process.env.POCKET_BASE_URL);

        const records = await pb.collection('offers').getFullList({
            filter: 'active = true',
            sort: 'startDate',
            $autoCancel: false
        });

        const activeOffers = records.filter(o => new Date(o.endDate) >= new Date());
        res.json({ success: true, offers: activeOffers });
    } catch (err) {
        console.error('Error fetching offers:', err.message);
        res.json({ success: true, offers: [] });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0')
