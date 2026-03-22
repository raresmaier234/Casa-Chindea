// backend/admin-server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';
import { authenticateToken } from './auth-server.js';
import { sendWhatsAppBookingConfirmed, sendWhatsAppBookingDeclined } from './whatsapp.js';
import { sendBookingConfirmedEmail, sendBookingDeclinedEmail } from './email.js';
import dotenv from 'dotenv';

// dotenv loaded by index.js → env.js

const router = express.Router();

// Middleware to disable caching on all admin endpoints
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Authenticate PocketBase as admin/superuser for server-side operations
async function authPocketBaseAdmin() {
    const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
        console.log('⚠️ PocketBase admin credentials not set');
        return;
    }

    // Method 1: PocketBase 0.23+ _superusers collection
    try {
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log('✅ PB auth via _superusers');
        return;
    } catch (e) {}

    // Method 2: Legacy pb.admins API
    try {
        await pb.admins.authWithPassword(email, password);
        console.log('✅ PB auth via pb.admins');
        return;
    } catch (e) {}

    // Method 3: Regular user with admin flag (last resort)
    try {
        await pb.collection('users').authWithPassword(email, password);
        console.log('⚠️ PB auth via users collection (not superuser)');
        return;
    } catch (e) {}

    console.error('❌ All PocketBase auth methods failed for:', email);
}

// Initialize admin auth
authPocketBaseAdmin();

// Auto-create prices collection if missing (handles fresh PocketBase deployments)
async function ensurePricesCollection() {
    if (!pb.authStore.isValid) await authPocketBaseAdmin();
    const token = pb.authStore.token;
    const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';

    const check = await fetch(`${pbUrl}/api/collections/prices`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (check.ok) return; // collection exists

    console.log('📦 Creating "prices" collection in PocketBase...');
    const resp = await fetch(`${pbUrl}/api/collections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'prices',
            type: 'base',
            fields: [
                { name: 'priceRoom', type: 'number', required: true },
                { name: 'priceEntire', type: 'number', required: true },
                { name: 'priceBreakfast', type: 'number' },
                { name: 'priceBreakfastChild', type: 'number' },
                { name: 'surchargeWeekend', type: 'number' },
                { name: 'surchargeHoliday', type: 'number' },
                { name: 'paymentMode', type: 'select', options: { values: ['none', 'full', 'deposit'] } },
                { name: 'depositPercent', type: 'number' }
            ],
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: ''
        })
    });
    if (resp.ok) {
        console.log('✅ "prices" collection created');
    } else {
        const err = await resp.json().catch(() => ({}));
        console.error('❌ Failed to create prices collection:', resp.status, JSON.stringify(err));
    }
}

// Cache pentru prețuri (pentru a evita citiri repetate)
let pricesCache = null;
let pricesCacheTimestamp = 0;
const PRICES_CACHE_TTL = 5 * 60 * 1000; // 5 minute

/**
 * Obține prețurile din baza de date (PocketBase prioritar, JSON fallback)
 */
async function getPrices() {
    // Verifică cache
    if (pricesCache && (Date.now() - pricesCacheTimestamp) < PRICES_CACHE_TTL) {
        return pricesCache;
    }

    const defaultPrices = {
        priceRoom: 150,
        priceEntire: 500,
        priceBreakfast: 35,
        priceBreakfastChild: 20,
        surchargeWeekend: 0,
        surchargeHoliday: 0
    };

    // PRIORITAR: Citește din PocketBase
    try {
        const records = await pb.collection('prices').getFullList(200, {
            sort: '-created',
            $autoCancel: false
        });

        if (records.length > 0) {
            const prices = {
                priceRoom: records[0].priceRoom || defaultPrices.priceRoom,
                priceEntire: records[0].priceEntire || defaultPrices.priceEntire,
                priceBreakfast: records[0].priceBreakfast || defaultPrices.priceBreakfast,
                priceBreakfastChild: records[0].priceBreakfastChild || defaultPrices.priceBreakfastChild,
                surchargeWeekend: records[0].surchargeWeekend || 0,
                surchargeHoliday: records[0].surchargeHoliday || 0
            };
            pricesCache = prices;
            pricesCacheTimestamp = Date.now();
            console.log('💰 Prețuri încărcate din PocketBase:', prices);
            return prices;
        }
    } catch (pbErr) {
        console.warn('⚠️ Nu s-a putut citi prețurile din PocketBase:', pbErr.message);
    }

    // Fallback la prețuri default
    console.log('💰 Folosesc prețuri default:', defaultPrices);
    return defaultPrices;
}

// Cache pentru status admin (pentru a evita request-uri duplicate)
const adminCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

const requireAdmin = async (req, res, next) => {
    try {
        // Verifică dacă userId există în token
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                error: 'Token invalid - lipsește userId.'
            });
        }

        if (req.user.admin === true) {
            return next();
        }

        // Verifică cache-ul mai întâi
        const cached = adminCache.get(req.user.userId);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            if (cached.isAdmin) {
                return next();
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Acces restricționat. Doar administratorii pot accesa această resursă.'
                });
            }
        }

        // Doar dacă nu e în token și nu e în cache, verifică din baza de date
        try {
            const user = await pb.collection('users').getOne(req.user.userId, {
                // Prevent auto-cancellation
                $autoCancel: false
            });

            // Cache rezultatul
            adminCache.set(req.user.userId, {
                isAdmin: user.admin === true,
                timestamp: Date.now()
            });

            // Verifică dacă utilizatorul are câmpul admin setat pe true
            if (!user.admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Acces restricționat. Doar administratorii pot accesa această resursă.'
                });
            }

            next();
        } catch (dbError) {
            // Dacă DB lookup eșuează, dar avem admin în token, permitem accesul
            if (req.user.admin === true) {
                return next();
            }

            // Dacă utilizatorul nu există (404) sau altă eroare, și nu e admin în token
            if (dbError.status === 404) {
                return res.status(401).json({
                    success: false,
                    error: 'Utilizatorul nu există. Te rugăm să te autentifici din nou.'
                });
            }

            // Pentru alte erori
            return res.status(500).json({
                success: false,
                error: 'Eroare la verificarea statusului de admin. Te rugăm să încerci din nou.'
            });
        }
    } catch (err) {
        // În caz de eroare neprevăzută, verifică dacă utilizatorul este admin în token
        if (req.user && req.user.admin === true) {
            return next();
        }

        res.status(500).json({
            success: false,
            error: 'Eroare la verificarea permisiunilor de admin. Te rugăm să te autentifici din nou.'
        });
    }
};

// Configurare multer pentru upload poze
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Doar fișiere imagine sunt permise!'));
        }
    }
});

// Obține toate rezervările pentru admin
router.get('/booking', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let filter = '';

        if (status !== "") {
            filter = `status = "${status}"`;
        }

        const bookings = await pb.collection('booking').getFullList(500, {
            filter: filter,
            sort: 'createdAt',
            $autoCancel: false
        });

        res.json({
            success: true,
            bookings: bookings.map(booking => ({
                id: booking.id,
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                checkin: booking.checkin,
                checkout: booking.checkout,
                guests: booking.guests,
                roomType: booking.roomType || 'standard',
                numberOfRooms: booking.numberOfRooms || 1,
                message: booking.message,
                status: booking.status || 'pending',
                paymentStatus: booking.paymentStatus || null,
                paymentMethod: booking.paymentMethod || null,
                paidAmount: booking.paidAmount || null,
                totalAmount: booking.totalAmount || null,
                created: booking.created,
                updated: booking.updated
            }))
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor: ' + err.message
        });
    }
});

// Actualizează statusul unei rezervări
router.put('/booking/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, declineReason } = req.body;

        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status invalid.'
            });
        }

        // Obține rezervarea completă pentru a trimite notificarea WhatsApp
        const booking = await pb.collection('booking').getOne(id, {
            $autoCancel: false
        });

        console.log('📋 Rezervare citită din PocketBase:', {
            id: booking.id,
            name: booking.name,
            roomType: booking.roomType,
            offerId: booking.offerId,
            offerTitle: booking.offerTitle,
            offerPrice: booking.offerPrice,
            checkin: booking.checkin,
            checkout: booking.checkout
        });

        const updatedBooking = await pb.collection('booking').update(id, {
            status,
            updated: new Date().toISOString()
        });

        // Trimite notificare WhatsApp către client
        // LOCAL: folosește numărul din .env pentru testare
        // PRODUCTION: va folosi booking.phone
        const testPhone = process.env.TEST_WHATSAPP_PHONE || process.env.CONTACT_PHONE;
        const targetPhone = process.env.NODE_ENV === 'production' ? booking.phone : testPhone;

        // Calculează prețul total (folosit și de WhatsApp și de Email)
        const checkinDate = new Date(booking.checkin);
        const checkoutDate = new Date(booking.checkout);
        const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));

        let totalPrice = 0;
        let offerPriceFromDB = booking.offerPrice;

        if (!offerPriceFromDB && booking.message) {
            const priceMatch = booking.message.match(/Preț pachet:\s*(\d+)\s*RON/i);
            if (priceMatch) {
                offerPriceFromDB = parseInt(priceMatch[1]);
            }
        }

        if (offerPriceFromDB && offerPriceFromDB > 0) {
            totalPrice = offerPriceFromDB;
        } else {
            const prices = await getPrices();
            if (booking.roomType === 'entire') {
                totalPrice = nights * prices.priceEntire;
            } else {
                const rooms = booking.numberOfRooms || 1;
                totalPrice = nights * prices.priceRoom * rooms;
            }
        }

        console.log('💰 Preț calculat:', { offerPrice: offerPriceFromDB, nights, roomType: booking.roomType, totalPrice });

        let whatsappResult = null;
        let whatsappError = null;

        if (targetPhone && status !== 'pending') {
            try {
                let formattedPhone = targetPhone.replace(/[\s+\-()]/g, '');
                if (formattedPhone.startsWith('0')) {
                    formattedPhone = '40' + formattedPhone.substring(1);
                }

                const waBookingData = {
                    name: booking.name,
                    checkin: booking.checkin,
                    checkout: booking.checkout,
                    guests: booking.guests,
                    roomType: booking.roomType === 'entire' ? 'Casa Întreagă' :
                        booking.roomType === 'room' ? `${booking.numberOfRooms || 1} Cameră(e)` :
                            booking.roomType || 'Standard',
                    totalPrice: totalPrice
                };

                if (status === 'confirmed') {
                    whatsappResult = await sendWhatsAppBookingConfirmed(formattedPhone, waBookingData);
                } else if (status === 'cancelled') {
                    const reason = declineReason || 'Perioada solicitată nu este disponibilă.';
                    whatsappResult = await sendWhatsAppBookingDeclined(formattedPhone, waBookingData, reason);
                }
            } catch (waErr) {
                whatsappError = waErr.message;
            }
        }

        // Send email notification to client (independent of WhatsApp)
        let emailResult = null;
        let emailError = null;
        if (status === 'confirmed') {
            try {
                await sendBookingConfirmedEmail(booking, totalPrice);
                emailResult = true;
            } catch (emErr) {
                emailError = emErr.message;
            }
        } else if (status === 'cancelled') {
            try {
                await sendBookingDeclinedEmail(booking, declineReason || 'Perioada solicitată nu este disponibilă.');
                emailResult = true;
            } catch (emErr) {
                emailError = emErr.message;
            }
        }

        res.json({
            success: true,
            message: `Rezervarea a fost ${status === 'confirmed' ? 'aprobată' : 'respinsă'} cu succes.`,
            booking: {
                id: updatedBooking.id,
                status: updatedBooking.status,
                updated: updatedBooking.updated
            },
            whatsapp: {
                sent: !!whatsappResult,
                error: whatsappError
            },
            email: {
                sent: !!emailResult,
                error: emailError
            }
        });
    } catch (err) {
        console.error('Error updating booking status:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea rezervării.'
        });
    }
});

// **GALERIE ADMIN**

// Încarcă poză în galerie
router.post('/photos', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nu a fost încărcată nicio poză.'
            });
        }

        const { description } = req.body;

        // Creează înregistrarea în PocketBase
        const photoData = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            description: description || '',
            uploadedBy: req.user.userId,
            size: req.file.size
        };

        // Încarcă fișierul în PocketBase
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append('image', blob, req.file.filename);
        formData.append('description', description || '');
        formData.append('uploadedBy', req.user.userId);

        const record = await pb.collection('photos').create(formData);

        // Șterge fișierul temporar
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: 'Poza a fost încărcată cu succes.',
            photo: {
                id: record.id,
                description: record.description,
                imageUrl: pb.getFileUrl(record, record.image),
                created: record.created
            }
        });
    } catch (err) {
        console.error('Error uploading photo:', err);

        // Șterge fișierul temporar în cazul erorii
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea pozei.'
        });
    }
});

// Șterge poză din galerie
router.delete('/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await pb.collection('photos').delete(id);

        res.json({
            success: true,
            message: 'Poza a fost ștearsă cu succes.'
        });
    } catch (err) {
        console.error('Error deleting photo:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la ștergerea pozei.'
        });
    }
});

// Actualizează descrierea unei poze
router.put('/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        const updatedPhoto = await pb.collection('photos').update(id, {
            description,
            updated: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Descrierea pozei a fost actualizată.',
            photo: {
                id: updatedPhoto.id,
                description: updatedPhoto.description,
                updated: updatedPhoto.updated
            }
        });
    } catch (err) {
        console.error('Error updating photo:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea pozei.'
        });
    }
});

// Înlocuiește imaginea unei poze (fișierul)
router.patch('/photos/:id/image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nu a fost furnizată nicio imagine.' });
        }

        // Get existing record to keep description
        const existing = await pb.collection('photos').getOne(id, { $autoCancel: false });

        const fileBuffer = fs.readFileSync(req.file.path);
        const formData = new FormData();
        formData.append('image', new Blob([fileBuffer], { type: req.file.mimetype }), req.file.originalname);
        // Keep existing description
        formData.append('description', existing.description || '');

        const updated = await pb.collection('photos').update(id, formData);

        // Clean up temp file
        fs.unlink(req.file.path, () => {});

        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        res.json({
            success: true,
            message: 'Imaginea a fost actualizată.',
            photo: {
                id: updated.id,
                description: updated.description,
                imageUrl: updated.image ? `${pbUrl}/api/files/photos/${updated.id}/${updated.image}` : null,
                updated: updated.updated
            }
        });
    } catch (err) {
        console.error('Error replacing photo image:', err);
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, error: 'Eroare la actualizarea imaginii.' });
    }
});

// **BLOCĂRI CALENDAR**

// Obține toate blocările de calendar
router.get('/calendar-blocks', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const blocks = await pb.collection('calendar_blocks').getFullList(500, {
            sort: 'startDate',
            $autoCancel: false
        });

        res.json({
            success: true,
            blocks: blocks.map(block => ({
                id: block.id,
                startDate: block.startDate,
                endDate: block.endDate,
                reason: block.reason,
                created: block.created
            }))
        });
    } catch (err) {
        console.error('Error fetching calendar blocks:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea blocărilor de calendar.'
        });
    }
});

// Adaugă o blocare de calendar
router.post('/calendar-blocks', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Data de început și sfârșitul sunt obligatorii.'
            });
        }

        // Verifică dacă datele sunt valide
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return res.status(400).json({
                success: false,
                error: 'Data de început trebuie să fie înainte de data de sfârșit.'
            });
        }

        const blockData = {
            startDate,
            endDate,
            reason: reason || 'Blocare administrativă'
        };

        const block = await pb.collection('calendar_blocks').create(blockData);

        res.json({
            success: true,
            message: 'Blocarea a fost adăugată cu succes.',
            block: {
                id: block.id,
                startDate: block.startDate,
                endDate: block.endDate,
                reason: block.reason,
                created: block.created
            }
        });
    } catch (err) {
        console.error('Error creating calendar block:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la crearea blocării de calendar.'
        });
    }
});

// Șterge o blocare de calendar
router.delete('/calendar-blocks/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || id === 'undefined') {
            return res.status(400).json({
                success: false,
                error: 'ID-ul blocării este invalid.'
            });
        }

        await pb.collection('calendar_blocks').delete(id);

        res.json({
            success: true,
            message: 'Blocarea a fost ștearsă cu succes.'
        });
    } catch (err) {
        console.error('Error deleting calendar block:', err.message);

        if (err.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Blocarea nu a fost găsită.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Eroare la ștergerea blocării de calendar.'
        });
    }
});

// Obține blocările active pentru o dată specifică (pentru verificarea disponibilității)
router.get('/calendar-blocks/check', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Datele de început și sfârșit sunt obligatorii.'
            });
        }

        // Verifică dacă există blocări care se suprapun cu perioada solicitată
        const blocks = await pb.collection('calendar_blocks').getFullList(500, {
            filter: `(startDate <= "${endDate}" && endDate >= "${startDate}")`,
            $autoCancel: false
        });

        res.json({
            success: true,
            hasBlocks: blocks.length > 0,
            blocks: blocks.map(block => ({
                id: block.id,
                startDate: block.startDate,
                endDate: block.endDate,
                reason: block.reason
            }))
        });
    } catch (err) {
        console.error('Error checking calendar blocks:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la verificarea blocărilor de calendar.'
        });
    }
});

// **CMS - PAGE SECTIONS (Universal Content Management)**

// Obține toate secțiunile pentru o pagină
router.get('/cms/sections', async (req, res) => {
    try {
        const { page, section, key } = req.query;

        // Add cache headers for faster loading (cache for 1 minute, revalidate in background)
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

        // Build filter - start with page condition
        let filter = '';

        if (page) {
            filter = `page = "${page}"`;
        }
        if (section) {
            filter += (filter ? ' && ' : '') + `section = "${section}"`;
        }
        if (key) {
            filter += (filter ? ' && ' : '') + `key = "${key}"`;
        }

        // If no filter specified, get all
        if (!filter) {
            filter = 'active = true || active = false';
        }

        const sections = await pb.collection('page_sections').getFullList(500, {
            filter,
            sort: 'page,section,order',
            $autoCancel: false
        });

        res.json({
            success: true,
            sections: sections.map(sec => ({
                id: sec.id,
                page: sec.page,
                section: sec.section,
                key: sec.key,
                type: sec.type,
                content: sec.content,
                imageUrl: sec.image ? pb.getFileUrl(sec, sec.image) : null,
                data: sec.data,
                order: sec.order,
                active: sec.active,
                created: sec.created,
                updated: sec.updated
            }))
        });
    } catch (err) {
        console.error('Error fetching CMS sections:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea secțiunilor.'
        });
    }
});

// Actualizează sau creează o secțiune
router.post('/cms/sections', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { page, section, key, type, content, data, order, active } = req.body;

        if (!page || !section || !key || !type) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Pagina, secțiunea, cheia și tipul sunt obligatorii.'
            });
        }

        // Verifică dacă există deja această secțiune
        const existingList = await pb.collection('page_sections').getList(1, 1, {
            filter: `page = "${page}" && section = "${section}" && key = "${key}"`
        });

        const updateData = {
            type: type,
            content: content || '',
            data: data ? JSON.parse(data) : null,
            order: order ? parseInt(order) : 0,
            active: active !== 'false'
        };

        // Dacă există imagine nouă
        if (req.file) {
            const formData = new FormData();
            const fileBuffer = fs.readFileSync(req.file.path);
            const blob = new Blob([fileBuffer], { type: req.file.mimetype });
            formData.append('image', blob, req.file.filename);

            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== null && updateData[key] !== undefined) {
                    if (typeof updateData[key] === 'object') {
                        formData.append(key, JSON.stringify(updateData[key]));
                    } else {
                        formData.append(key, updateData[key]);
                    }
                }
            });

            if (existingList.items && existingList.items.length > 0) {
                const updated = await pb.collection('page_sections').update(existingList.items[0].id, formData);
                fs.unlinkSync(req.file.path);

                return res.json({
                    success: true,
                    message: 'Secțiunea a fost actualizată cu succes.',
                    section: {
                        id: updated.id,
                        imageUrl: updated.image ? pb.getFileUrl(updated, updated.image) : null,
                        page: updated.page,
                        section: updated.section,
                        key: updated.key
                    }
                });
            } else {
                formData.append('page', page);
                formData.append('section', section);
                formData.append('key', key);

                const created = await pb.collection('page_sections').create(formData);
                fs.unlinkSync(req.file.path);

                return res.json({
                    success: true,
                    message: 'Secțiunea a fost creată cu succes.',
                    section: {
                        id: created.id,
                        imageUrl: created.image ? pb.getFileUrl(created, created.image) : null,
                        page: created.page,
                        section: created.section,
                        key: created.key
                    }
                });
            }
        }

        // Fără imagine
        if (existingList.items && existingList.items.length > 0) {
            const updated = await pb.collection('page_sections').update(existingList.items[0].id, updateData);

            return res.json({
                success: true,
                message: 'Secțiunea a fost actualizată cu succes.',
                section: {
                    id: updated.id,
                    page: updated.page,
                    section: updated.section,
                    key: updated.key,
                    type: updated.type,
                    content: updated.content,
                    imageUrl: updated.image ? pb.getFileUrl(updated, updated.image) : null,
                    data: updated.data,
                    updated: updated.updated
                }
            });
        } else {
            const created = await pb.collection('page_sections').create({
                page,
                section,
                key,
                ...updateData
            });

            return res.json({
                success: true,
                message: 'Secțiunea a fost creată cu succes.',
                section: {
                    id: created.id,
                    page: created.page,
                    section: created.section,
                    key: created.key,
                    type: created.type,
                    content: created.content,
                    imageUrl: created.image ? pb.getFileUrl(created, created.image) : null,
                    data: created.data,
                    created: created.created
                }
            });
        }
    } catch (err) {
        console.error('Error saving CMS section:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Eroare la salvarea secțiunii: ' + err.message
        });
    }
});

// Șterge o secțiune
router.delete('/cms/sections/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pb.collection('page_sections').delete(id);

        res.json({
            success: true,
            message: 'Secțiunea a fost ștearsă cu succes.'
        });
    } catch (err) {
        console.error('Error deleting CMS section:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la ștergerea secțiunii: ' + err.message
        });
    }
});

// **PREȚURI ADMIN**

// Obține prețurile curente
router.get('/prices', authenticateToken, requireAdmin, async (req, res) => {
    const defaultPrices = {
        priceRoom: 500,
        priceEntire: 3000,
        priceBreakfast: 50,
        priceBreakfastChild: 20,
        surchargeWeekend: 0,
        surchargeHoliday: 0,
        updated: null
    };

    try {
        // Asigură-te că PocketBase este autentificat
        if (!pb.authStore.isValid) {
            await authPocketBaseAdmin();
        }

        // Ensure collection exists
        await ensurePricesCollection();

        // Obține prețurile din colecția 'prices'
        const records = await pb.collection('prices').getFullList(200, {
            sort: '-created',
            $autoCancel: false
        });

        if (records.length > 0) {
            const prices = records[0];
            const paymentFallback = global._paymentSettings || {};
            res.json({
                success: true,
                prices: {
                    priceRoom: prices.priceRoom,
                    priceEntire: prices.priceEntire,
                    priceBreakfast: prices.priceBreakfast,
                    priceBreakfastChild: prices.priceBreakfastChild,
                    surchargeWeekend: prices.surchargeWeekend,
                    surchargeHoliday: prices.surchargeHoliday,
                    paymentMode: prices.paymentMode || paymentFallback.paymentMode || 'none',
                    depositPercent: prices.depositPercent || paymentFallback.depositPercent || 30,
                    updated: prices.updated
                }
            });
        } else {
            // Returnează valori implicite dacă nu există prețuri în PocketBase
            res.json({
                success: true,
                prices: defaultPrices
            });
        }
    } catch (err) {
        console.error('Error fetching prices from PocketBase:', err.message);
        res.status(500).json({
            success: false,
            error: 'Eroare la citirea prețurilor din baza de date: ' + err.message
        });
    }
});

// Salvează/actualizează prețurile
router.post('/prices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            priceRoom,
            priceEntire,
            priceBreakfast,
            priceBreakfastChild,
            surchargeWeekend,
            surchargeHoliday,
            paymentMode,
            depositPercent
        } = req.body;

        // Validare strictă și conversie
        const pRoom = parseInt(priceRoom);
        const pEntire = parseInt(priceEntire);
        const pBreakfast = parseInt(priceBreakfast) || 0;
        const pBreakfastChild = parseInt(priceBreakfastChild) || 0;
        const sWeekend = parseInt(surchargeWeekend) || 0;
        const sHoliday = parseInt(surchargeHoliday) || 0;
        const pMode = ['none', 'full', 'deposit'].includes(paymentMode) ? paymentMode : 'none';
        const dPercent = Math.min(99, Math.max(1, parseInt(depositPercent) || 30));

        if (isNaN(pRoom) || pRoom <= 0) {
            return res.status(400).json({ success: false, error: 'Prețul per cameră este invalid (trebuie să fie număr > 0).' });
        }
        if (isNaN(pEntire) || pEntire <= 0) {
            return res.status(400).json({ success: false, error: 'Prețul pentru cabana întreagă este invalid (trebuie să fie număr > 0).' });
        }
        if (sWeekend < 0 || sWeekend > 100) {
            return res.status(400).json({ success: false, error: 'Procentul de weekend trebuie să fie între 0 și 100.' });
        }
        if (sHoliday < 0 || sHoliday > 100) {
            return res.status(400).json({ success: false, error: 'Procentul de sărbători trebuie să fie între 0 și 100.' });
        }

        const pricesData = {
            priceRoom: pRoom,
            priceEntire: pEntire,
            priceBreakfast: pBreakfast,
            priceBreakfastChild: pBreakfastChild,
            surchargeWeekend: sWeekend,
            surchargeHoliday: sHoliday,
            paymentMode: pMode,
            depositPercent: dPercent
        };

        // Asigură-te că PocketBase este autentificat
        if (!pb.authStore.isValid) {
            await authPocketBaseAdmin();
        }

        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';

        // Salvează DOAR în PocketBase
        try {
            await ensurePricesCollection();

            let existingRecords = [];
            try {
                existingRecords = await pb.collection('prices').getFullList(200, {
                    $autoCancel: false
                });
            } catch (listErr) {
                console.warn('⚠️ Could not list prices:', listErr.message);
            }

            let result;
            const saveToDb = async (data) => {
                if (!pb.authStore.isValid) await authPocketBaseAdmin();
                const token = pb.authStore.token;

                const isUpdate = existingRecords.length > 0;
                const url = isUpdate
                    ? `${pbUrl}/api/collections/prices/records/${existingRecords[0].id}`
                    : `${pbUrl}/api/collections/prices/records`;
                const method = isUpdate ? 'PATCH' : 'POST';
                const resp = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                const body = await resp.json().catch(() => ({}));

                if (!resp.ok) {
                    console.error(`❌ PB ${method} failed:`, resp.status, JSON.stringify(body));
                    const e = new Error(`${method} failed: ${resp.status}`);
                    e.status = resp.status;
                    e.data = body;
                    throw e;
                }

                return body;
            };

            try {
                // First attempt: save with payment fields (needs migration applied)
                result = await saveToDb(pricesData);
                console.log('✅ Prețuri salvate în PocketBase (cu câmpuri plată):', result.id);
            } catch (firstErr) {
                // If PocketBase rejects because paymentMode/depositPercent fields don't exist yet,
                // fall back to saving only the core price fields
                const isUnknownField = firstErr.message && (
                    firstErr.message.includes('paymentMode') ||
                    firstErr.message.includes('depositPercent') ||
                    firstErr.status === 400
                );
                if (isUnknownField) {
                    console.warn('⚠️ Câmpurile de plată nu există în PocketBase (migrare nepublicată). Salvez fără ele.');
                    const fallbackData = {
                        priceRoom: pRoom,
                        priceEntire: pEntire,
                        priceBreakfast: pBreakfast,
                        priceBreakfastChild: pBreakfastChild,
                        surchargeWeekend: sWeekend,
                        surchargeHoliday: sHoliday
                    };
                    result = await saveToDb(fallbackData);
                    // Store payment settings in process memory as fallback
                    global._paymentSettings = { paymentMode: pMode, depositPercent: dPercent };
                    console.log('✅ Prețuri salvate (fără câmpuri plată), setări plată în memorie:', global._paymentSettings);
                } else {
                    throw firstErr;
                }
            }

            if (existingRecords.length > 0) {
                console.log('✅ Prețuri actualizate în PocketBase:', result.id);
            } else {
                console.log('✅ Prețuri create în PocketBase:', result.id);
            }

            pricesData.updated = result.updated;

            // Invalidează cache-ul pentru a forța recitirea
            pricesCache = null;
            pricesCacheTimestamp = 0;

            // Invalidează cache-ul public
            try { await fetch(`http://localhost:${process.env.PORT || 3001}/api/cache/invalidate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'prices' }) }); } catch (e) { }

            res.json({
                success: true,
                message: 'Prețurile au fost salvate în baza de date!',
                prices: pricesData
            });
        } catch (pbErr) {
            console.error('❌ PocketBase save failed:', pbErr.message, pbErr.data);
            const detail = pbErr.data ? JSON.stringify(pbErr.data) : pbErr.message;
            res.status(500).json({
                success: false,
                error: 'Eroare la salvarea prețurilor în baza de date: ' + detail
            });
        }
    } catch (err) {
        console.error('Error saving prices:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la salvarea prețurilor: ' + err.message
        });
    }
});

// Endpoint public pentru a obține prețurile (fără autentificare)
router.get('/public/prices', async (req, res) => {
    try {
        const records = await pb.collection('prices').getFullList(200, {
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
            res.json({
                success: true,
                prices: {
                    priceRoom: 500,
                    priceEntire: 3000,
                    priceBreakfast: 50,
                    priceBreakfastChild: 20,
                    surchargeWeekend: 0,
                    surchargeHoliday: 0
                }
            });
        }
    } catch (err) {
        console.error('Error fetching public prices:', err);
        res.json({
            success: true,
            prices: {
                priceRoom: 500,
                priceEntire: 3000,
                priceBreakfast: 50,
                priceBreakfastChild: 20,
                surchargeWeekend: 0,
                surchargeHoliday: 0
            }
        });
    }
});

// **OFERTE SPECIALE**

// Obține toate ofertele
router.get('/offers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const records = await pb.collection('offers').getFullList(200, {
            sort: '-startDate',
            $autoCancel: false
        });

        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        res.json({
            success: true,
            offers: records.map(offer => ({
                id: offer.id,
                type: offer.type,
                title: offer.title,
                startDate: offer.startDate,
                endDate: offer.endDate,
                totalPrice: offer.totalPrice,
                roomPrice: offer.roomPrice,
                nights: offer.nights,
                details: offer.details,
                includes: offer.includes,
                active: offer.active,
                imageUrl: offer.image
                    ? `${pbUrl}/api/files/offers/${offer.id}/${offer.image}`
                    : null
            }))
        });
    } catch (err) {
        console.error('Error fetching offers:', err.message);
        res.status(500).json({ success: false, error: 'Eroare la încărcarea ofertelor: ' + err.message });
    }
});

// Obține o singură ofertă
router.get('/offers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await pb.collection('offers').getOne(id, { $autoCancel: false });
        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        res.json({
            success: true,
            offer: {
                ...offer,
                imageUrl: offer.image
                    ? `${pbUrl}/api/files/offers/${offer.id}/${offer.image}`
                    : null
            }
        });
    } catch (err) {
        console.error('Error fetching offer:', err);
        if (err.status === 404) {
            return res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
        }
        res.status(500).json({ success: false, error: 'Eroare la obținerea ofertei' });
    }
});

// Creează o ofertă nouă
router.post('/offers', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { type, title, startDate, endDate, totalPrice, roomPrice, nights, details, includes, active } = req.body;

        const formData = new FormData();
        formData.append('type', type);
        formData.append('title', title);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('totalPrice', parseInt(totalPrice) || 0);
        formData.append('roomPrice', parseInt(roomPrice) || 0);
        formData.append('nights', parseInt(nights) || 1);
        formData.append('details', details || '');
        formData.append('includes', includes || '');
        formData.append('active', active !== 'false' && active !== false ? 'true' : 'false');

        if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            const blob = new Blob([fileBuffer], { type: req.file.mimetype });
            formData.append('image', blob, req.file.originalname);
            // Clean up temp file
            fs.unlink(req.file.path, () => {});
        }

        const result = await pb.collection('offers').create(formData);

        // Invalidează cache-ul public
        try { await fetch(`http://localhost:${process.env.PORT || 3001}/api/cache/invalidate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'offers' }) }); } catch (e) { }

        res.json({
            success: true,
            message: 'Oferta a fost creată cu succes!',
            offer: result
        });
    } catch (err) {
        console.error('Error creating offer:', err);
        res.status(500).json({ success: false, error: 'Eroare la crearea ofertei: ' + err.message });
    }
});

// Actualizează o ofertă
router.put('/offers/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { type, title, startDate, endDate, totalPrice, roomPrice, nights, details, includes, active } = req.body;

        const formData = new FormData();
        formData.append('type', type);
        formData.append('title', title);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('totalPrice', parseInt(totalPrice) || 0);
        formData.append('roomPrice', parseInt(roomPrice) || 0);
        formData.append('nights', parseInt(nights) || 1);
        formData.append('details', details || '');
        formData.append('includes', includes || '');
        formData.append('active', active !== 'false' && active !== false ? 'true' : 'false');

        if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            const blob = new Blob([fileBuffer], { type: req.file.mimetype });
            formData.append('image', blob, req.file.originalname);
            // Clean up temp file
            fs.unlink(req.file.path, () => {});
        }

        const result = await pb.collection('offers').update(id, formData);

        // Invalidează cache-ul public
        try { await fetch(`http://localhost:${process.env.PORT || 3001}/api/cache/invalidate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'offers' }) }); } catch (e) { }

        const pbUrl = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';
        res.json({
            success: true,
            message: 'Oferta a fost actualizată!',
            offer: {
                ...result,
                imageUrl: result.image ? `${pbUrl}/api/files/offers/${result.id}/${result.image}` : null
            }
        });
    } catch (err) {
        console.error('Error updating offer:', err);
        if (err.status === 404) {
            return res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
        }
        res.status(500).json({ success: false, error: 'Eroare la actualizarea ofertei: ' + err.message });
    }
});

// Șterge o ofertă
router.delete('/offers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pb.collection('offers').delete(id);

        // Invalidează cache-ul public
        try { await fetch(`http://localhost:${process.env.PORT || 3001}/api/cache/invalidate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'offers' }) }); } catch (e) { }

        res.json({ success: true, message: 'Oferta a fost ștearsă!' });
    } catch (err) {
        console.error('Error deleting offer:', err);
        if (err.status === 404) {
            return res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
        }
        res.status(500).json({ success: false, error: 'Eroare la ștergerea ofertei: ' + err.message });
    }
});

// Endpoint public pentru oferte active
router.get('/public/offers', async (req, res) => {
    try {
        const records = await pb.collection('offers').getFullList(200, {
            filter: 'active = true',
            sort: 'startDate',
            $autoCancel: false
        });

        res.json({
            success: true,
            offers: records.filter(o => new Date(o.endDate) >= new Date())
        });
    } catch (err) {
        console.error('Error fetching public offers:', err);
        res.json({ success: true, offers: [] });
    }
});

// ── Backup PocketBase ──────────────────────────────────────────────────────
router.post('/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (!pb.authStore.isValid) await authPocketBaseAdmin();

        const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

        // PocketBase 0.23+ backup API
        await fetch(`${process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090'}/api/backups`, {
            method: 'POST',
            headers: {
                'Authorization': pb.authStore.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: backupName })
        });

        console.log('✅ Backup created:', backupName);
        res.json({ success: true, message: `Backup creat: ${backupName}`, name: backupName });
    } catch (err) {
        console.error('❌ Backup error:', err.message);
        res.status(500).json({ success: false, error: 'Eroare la crearea backup-ului: ' + err.message });
    }
});

router.get('/backups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (!pb.authStore.isValid) await authPocketBaseAdmin();

        const response = await fetch(`${process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090'}/api/backups`, {
            headers: { 'Authorization': pb.authStore.token }
        });
        const backups = await response.json();

        res.json({ success: true, backups: backups || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
