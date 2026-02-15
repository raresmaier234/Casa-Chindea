// backend/index.js
import express from 'express';
import cors from 'cors';
import compression from 'compression';
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

// Enable Gzip/Brotli compression for all responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Compression level (0-9, 6 is balanced)
}));

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

// Serve static files with cache headers
app.use(express.static(join(__dirname, "js"), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}));

// Add cache control headers for API responses - optimized for mobile
app.use('/api', (req, res, next) => {
    // Don't cache POST/PUT/DELETE requests
    if (req.method === 'GET') {
        // Check if it's a mobile/slow connection
        const saveData = req.headers['save-data'] === 'on';
        const isSlowConnection = req.headers['x-slow-connection'] === 'true';
        
        // More aggressive caching for mobile/slow connections
        if (saveData || isSlowConnection) {
            res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=300'); // 10 min + 5 min stale
        } else {
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // 5 min + 1 min stale
        }
        
        // Add Vary header for proper caching
        res.set('Vary', 'Accept-Encoding, Save-Data');
    } else {
        res.set('Cache-Control', 'no-store');
    }
    next();
});

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
