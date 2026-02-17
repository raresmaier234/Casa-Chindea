// backend/index.js
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import PocketBase from 'pocketbase';
import bookingRouter from './booking-server.js';
import contactRouter from './contact-server.js';
import galleryRouter from './gallery-server.js';
import authRouter from './auth-server.js';
import adminRouter from './admin-server.js';

// Load .env from parent directory (root of project)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();

// ── Shared PocketBase instance (created once, reused across all requests) ──
const pb = new PocketBase(process.env.POCKET_BASE_URL);

// ── In-memory cache for public endpoints ──
const cache = {
    prices: { data: null, timestamp: 0, ttl: 2 * 60 * 1000 },   // 2 min
    offers: { data: null, timestamp: 0, ttl: 60 * 1000 },        // 1 min
};

const DEFAULT_PRICES = {
    priceRoom: 150,
    priceEntire: 500,
    priceBreakfast: 35,
    priceBreakfastChild: 20,
    surchargeWeekend: 0,
    surchargeHoliday: 0
};

async function fetchPrices() {
    try {
        const records = await pb.collection('prices').getFullList(200, {
            sort: '-created',
            $autoCancel: false
        });
        if (records.length > 0) {
            const p = records[0];
            return {
                priceRoom: p.priceRoom,
                priceEntire: p.priceEntire,
                priceBreakfast: p.priceBreakfast,
                priceBreakfastChild: p.priceBreakfastChild,
                surchargeWeekend: p.surchargeWeekend,
                surchargeHoliday: p.surchargeHoliday
            };
        }
    } catch (err) {
        console.error('Error fetching prices from PocketBase:', err.message);
    }
    return DEFAULT_PRICES;
}

async function fetchOffers() {
    try {
        const records = await pb.collection('offers').getFullList(200, {
            filter: 'active = true',
            sort: 'startDate',
            $autoCancel: false
        });
        return records.filter(o => new Date(o.endDate) >= new Date());
    } catch (err) {
        console.error('Error fetching offers from PocketBase:', err.message);
    }
    return [];
}

function getCached(key, fetchFn) {
    const entry = cache[key];
    const now = Date.now();
    if (entry.data !== null && (now - entry.timestamp) < entry.ttl) {
        return { data: entry.data, fresh: false };
    }
    // Stale-while-revalidate: return stale data immediately, refresh in background
    const staleData = entry.data;
    const refreshPromise = fetchFn().then(data => {
        cache[key].data = data;
        cache[key].timestamp = Date.now();
        return data;
    });
    if (staleData !== null) {
        // Return stale data, refresh in background
        refreshPromise.catch(() => { }); // swallow errors on background refresh
        return { data: staleData, fresh: false };
    }
    // No stale data — must await
    return { promise: refreshPromise };
}

// Enable Gzip/Brotli compression for all responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6
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
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Add cache control headers for API responses
app.use('/api', (req, res, next) => {
    if (req.method === 'GET') {
        const saveData = req.headers['save-data'] === 'on';
        const isSlowConnection = req.headers['x-slow-connection'] === 'true';
        if (saveData || isSlowConnection) {
            res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=300');
        } else {
            res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        }
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

// ── Public prices endpoint (cached) ──
app.get('/api/prices', async (req, res) => {
    try {
        const result = getCached('prices', fetchPrices);
        const prices = result.data ?? await result.promise;
        res.json({ success: true, prices });
    } catch (err) {
        console.error('Error in /api/prices:', err.message);
        res.json({ success: true, prices: DEFAULT_PRICES });
    }
});

// ── Public offers endpoint (cached) ──
app.get('/api/offers', async (req, res) => {
    try {
        const result = getCached('offers', fetchOffers);
        const offers = result.data ?? await result.promise;
        res.json({ success: true, offers });
    } catch (err) {
        console.error('Error in /api/offers:', err.message);
        res.json({ success: true, offers: [] });
    }
});

// ── Cache invalidation endpoint (called by admin after updates) ──
app.post('/api/cache/invalidate', (req, res) => {
    const { key } = req.body;
    if (key && cache[key]) {
        cache[key].data = null;
        cache[key].timestamp = 0;
        console.log(`🔄 Cache invalidated: ${key}`);
    } else {
        // Invalidate all
        Object.keys(cache).forEach(k => {
            cache[k].data = null;
            cache[k].timestamp = 0;
        });
        console.log('🔄 All caches invalidated');
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Warm caches on startup so the first request is instant
    fetchPrices().then(data => { cache.prices.data = data; cache.prices.timestamp = Date.now(); console.log('💰 Prices cache warmed'); }).catch(() => { });
    fetchOffers().then(data => { cache.offers.data = data; cache.offers.timestamp = Date.now(); console.log('🎁 Offers cache warmed'); }).catch(() => { });
});
