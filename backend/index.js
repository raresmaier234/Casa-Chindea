// backend/index.js
import './env.js'; // ← MUST be first — loads root .env before other modules
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import PocketBase from 'pocketbase';
import bookingRouter from './booking-server.js';
import contactRouter from './contact-server.js';
import galleryRouter from './gallery-server.js';
import authRouter from './auth-server.js';
import adminRouter from './admin-server.js';
import paymentRouter from './payment-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Shared PocketBase instance (created once, reused across all requests) ──
const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Public-facing URL for PocketBase file links sent to browser
// In production, files are proxied through the Node.js server
function getPublicPbUrl() {
    if (process.env.NODE_ENV === 'production') {
        return process.env.API_URL || 'https://casa-chindea.onrender.com';
    }
    return process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
}

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
    surchargeHoliday: 0,
    paymentMode: 'none',
    depositPercent: 30
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
                surchargeHoliday: p.surchargeHoliday,
                paymentMode: p.paymentMode || 'none',
                depositPercent: p.depositPercent || 30
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
        const publicUrl = getPublicPbUrl();
        return records
            .filter(o => new Date(o.endDate) >= new Date())
            .map(offer => ({
                ...offer,
                imageUrl: offer.image
                    ? `${publicUrl}/api/files/offers/${offer.id}/${offer.image}`
                    : null
            }));
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

// ── SSL / HTTPS enforcement ────────────────────────────────────────────────
// Render (and most PaaS) terminates SSL at the load balancer and forwards
// requests via HTTP with X-Forwarded-Proto header.
app.set('trust proxy', true);

if (process.env.NODE_ENV === 'production') {
    // Redirect HTTP → HTTPS
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
        }
        next();
    });
}

// ── Security headers ───────────────────────────────────────────────────────
app.use((req, res, next) => {
    // HSTS — tells browsers to always use HTTPS (1 year, include subdomains)
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    // Prevent MIME type sniffing
    res.set('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.set('X-Frame-Options', 'SAMEORIGIN');
    // XSS protection (legacy browsers)
    res.set('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
});

// Configure CORS for Vercel frontend
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://casa-chindea.vercel.app',
        'https://casachindea.ro',
        'https://*.vercel.app'
    ],
    credentials: true
}));

// ── Proxy PocketBase Admin Dashboard & API ──────────────────────────────────
// Access PocketBase admin at https://casa-chindea.onrender.com/_/
// MUST be before express.json() to preserve raw body for multipart uploads.
const pbProxy = async (req, res) => {
    try {
        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        const targetUrl = `${pbUrl}${req.originalUrl}`;

        const headers = {};
        // Forward only safe headers
        if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];
        if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
        if (req.headers['accept']) headers['accept'] = req.headers['accept'];
        if (req.headers['cookie']) headers['cookie'] = req.headers['cookie'];

        const fetchOpts = { method: req.method, headers };

        // Forward raw body for non-GET requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const rawBody = await new Promise((resolve, reject) => {
                const chunks = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', () => resolve(Buffer.concat(chunks)));
                req.on('error', reject);
            });
            if (rawBody.length > 0) fetchOpts.body = rawBody;
        }

        const pbResp = await fetch(targetUrl, fetchOpts);
        res.status(pbResp.status);

        for (const [key, value] of pbResp.headers.entries()) {
            if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
                res.set(key, value);
            }
        }

        const buffer = Buffer.from(await pbResp.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        console.error('PB proxy error:', err.message);
        res.status(502).json({ error: 'PocketBase proxy error' });
    }
};
app.all('/_/*', pbProxy);
app.get('/_/', pbProxy);

// Proxy PocketBase internal API routes used by the admin dashboard
// (superuser login, collections CRUD, settings, logs, backups, etc.)
// These MUST be before express.json() and before our own /api/* routes.
app.all('/api/admins', pbProxy);
app.all('/api/admins/*', pbProxy);
app.all('/api/collections', pbProxy);
app.all('/api/collections/*', pbProxy);
app.all('/api/settings', pbProxy);
app.all('/api/settings/*', pbProxy);
app.all('/api/logs', pbProxy);
app.all('/api/logs/*', pbProxy);
app.all('/api/backups', pbProxy);
app.all('/api/backups/*', pbProxy);
app.all('/api/realtime', pbProxy);
app.all('/api/records/*', pbProxy);

// Parse JSON body (after PB proxy routes to avoid consuming raw body)
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

// ── Proxy PocketBase file URLs ──────────────────────────────────────────────
// PocketBase runs on 127.0.0.1:8090 (not exposed externally).
// This proxy lets the browser access /api/files/* through the Node.js server.
app.get('/api/files/*', async (req, res) => {
    try {
        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        const pbResp = await fetch(`${pbUrl}${req.originalUrl}`);
        if (!pbResp.ok) {
            return res.status(pbResp.status).end();
        }
        // Forward content-type and cache headers
        const ct = pbResp.headers.get('content-type');
        if (ct) res.set('Content-Type', ct);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');

        const buffer = Buffer.from(await pbResp.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        console.error('PB file proxy error:', err.message);
        res.status(502).json({ error: 'File proxy error' });
    }
});


app.use(authRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/payment', paymentRouter);
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
