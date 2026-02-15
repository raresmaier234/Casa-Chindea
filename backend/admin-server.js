// backend/admin-server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';
import { authenticateToken } from './auth-server.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Authenticate PocketBase as admin for server-side operations
async function authPocketBaseAdmin() {
    try {
        if (process.env.PB_ADMIN_EMAIL && process.env.PB_ADMIN_PASSWORD) {
            await pb.collection('users').authWithPassword(
                process.env.PB_ADMIN_EMAIL,
                process.env.PB_ADMIN_PASSWORD
            );
            console.log('✅ PocketBase authenticated as admin');
        } else {
            console.log('⚠️ PocketBase admin credentials not set - some operations may fail');
        }
    } catch (err) {
        console.error('❌ PocketBase admin authentication failed:', err.message);
    }
}

// Initialize admin auth
authPocketBaseAdmin();

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
        const { status } = req.body;

        if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status invalid.'
            });
        }

        const updatedBooking = await pb.collection('booking').update(id, {
            status,
            updated: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Rezervarea a fost ${status === 'confirmed' ? 'aprobată' : 'respinsă'} cu succes.`,
            booking: {
                id: updatedBooking.id,
                status: updatedBooking.status,
                updated: updatedBooking.updated
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

// Fallback: Store prices in a local JSON file if PocketBase collection doesn't exist
const PRICES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prices.json');

function loadPricesFromFile() {
    try {
        if (fs.existsSync(PRICES_FILE)) {
            const data = fs.readFileSync(PRICES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading prices file:', err);
    }
    return null;
}

function savePricesToFile(prices) {
    try {
        fs.writeFileSync(PRICES_FILE, JSON.stringify(prices, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing prices file:', err);
        return false;
    }
}

// Obține prețurile curente
router.get('/prices', authenticateToken, requireAdmin, async (req, res) => {
    const defaultPrices = {
        priceRoom: 150,
        priceEntire: 500,
        priceBreakfast: 35,
        priceBreakfastChild: 20,
        surchargeWeekend: 0,
        surchargeHoliday: 0,
        updated: null
    };

    try {
        // Încearcă să obțină prețurile din colecția 'prices'
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
                    surchargeHoliday: prices.surchargeHoliday,
                    updated: prices.updated
                }
            });
        } else {
            // Returnează valori implicite dacă nu există prețuri în PocketBase
            const filePrices = loadPricesFromFile();
            res.json({
                success: true,
                prices: filePrices || defaultPrices
            });
        }
    } catch (err) {
        console.error('Error fetching prices from PocketBase:', err.message);

        // Dacă colecția nu există, încearcă să citească din fișier
        const filePrices = loadPricesFromFile();
        res.json({
            success: true,
            prices: filePrices || defaultPrices
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
            surchargeHoliday
        } = req.body;

        // Validare
        if (!priceRoom || priceRoom <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Prețul per cameră este obligatoriu și trebuie să fie mai mare ca 0.'
            });
        }

        if (!priceEntire || priceEntire <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Prețul pentru cabana întreagă este obligatoriu și trebuie să fie mai mare ca 0.'
            });
        }

        const pricesData = {
            priceRoom: parseInt(priceRoom),
            priceEntire: parseInt(priceEntire),
            priceBreakfast: parseInt(priceBreakfast) || 0,
            priceBreakfastChild: parseInt(priceBreakfastChild) || 0,
            surchargeWeekend: parseInt(surchargeWeekend) || 0,
            surchargeHoliday: parseInt(surchargeHoliday) || 0,
            updated: new Date().toISOString()
        };

        // Încearcă să salveze în PocketBase
        let savedInPocketBase = false;
        try {
            const existingRecords = await pb.collection('prices').getFullList({
                $autoCancel: false
            });

            let result;
            if (existingRecords.length > 0) {
                result = await pb.collection('prices').update(existingRecords[0].id, pricesData);
            } else {
                result = await pb.collection('prices').create(pricesData);
            }
            savedInPocketBase = true;
            pricesData.updated = result.updated;
        } catch (pbErr) {
            console.warn('⚠️ PocketBase save failed, using JSON file fallback:', pbErr.message);
        }

        // Salvează și în fișier JSON ca backup
        const fileSaved = savePricesToFile(pricesData);

        if (savedInPocketBase || fileSaved) {
            res.json({
                success: true,
                message: 'Prețurile au fost salvate cu succes!',
                prices: pricesData
            });
        } else {
            throw new Error('Nu s-a putut salva în nicio destinație');
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
            res.json({
                success: true,
                prices: {
                    priceRoom: 150,
                    priceEntire: 500,
                    priceBreakfast: 35,
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
                priceRoom: 150,
                priceEntire: 500,
                priceBreakfast: 35,
                priceBreakfastChild: 20,
                surchargeWeekend: 0,
                surchargeHoliday: 0
            }
        });
    }
});

// **OFERTE SPECIALE**

// Fallback: Store offers in a local JSON file
const OFFERS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'offers.json');

function loadOffersFromFile() {
    try {
        if (fs.existsSync(OFFERS_FILE)) {
            const data = fs.readFileSync(OFFERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading offers file:', err);
    }
    return [];
}

function saveOffersToFile(offers) {
    try {
        fs.writeFileSync(OFFERS_FILE, JSON.stringify(offers, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing offers file:', err);
        return false;
    }
}

// Obține toate ofertele
router.get('/offers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Încearcă să obțină ofertele din PocketBase
        const records = await pb.collection('offers').getFullList({
            sort: '-startDate',
            $autoCancel: false
        });

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
                active: offer.active
            }))
        });
    } catch (err) {
        console.error('Error fetching offers from PocketBase:', err.message);

        // Fallback la fișier JSON
        const offers = loadOffersFromFile();
        res.json({ success: true, offers });
    }
});

// Obține o singură ofertă
router.get('/offers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Încearcă PocketBase
        try {
            const offer = await pb.collection('offers').getOne(id, { $autoCancel: false });
            return res.json({ success: true, offer });
        } catch (pbErr) {
            // Fallback la fișier JSON
            const offers = loadOffersFromFile();
            const offer = offers.find(o => o.id === id);
            if (offer) {
                return res.json({ success: true, offer });
            }
            return res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
        }
    } catch (err) {
        console.error('Error fetching offer:', err);
        res.status(500).json({ success: false, error: 'Eroare la obținerea ofertei' });
    }
});

// Creează o ofertă nouă
router.post('/offers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { type, title, startDate, endDate, totalPrice, roomPrice, nights, details, includes, active } = req.body;

        const offerData = {
            type,
            title,
            startDate,
            endDate,
            totalPrice: parseInt(totalPrice) || 0,
            roomPrice: parseInt(roomPrice) || 0,
            nights: parseInt(nights) || 1,
            details,
            includes,
            active: active !== false
        };

        // Încearcă să salveze în PocketBase
        let savedInPocketBase = false;
        let result = null;

        try {
            result = await pb.collection('offers').create(offerData);
            savedInPocketBase = true;
        } catch (pbErr) {
            console.warn('⚠️ PocketBase save failed, using JSON file:', pbErr.message);
        }

        // Salvează și în fișier JSON ca backup
        if (!savedInPocketBase) {
            const offers = loadOffersFromFile();
            offerData.id = 'offer_' + Date.now();
            offerData.created = new Date().toISOString();
            offers.push(offerData);
            saveOffersToFile(offers);
            result = offerData;
        }

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
router.put('/offers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, title, startDate, endDate, totalPrice, roomPrice, nights, details, includes, active } = req.body;

        const offerData = {
            type,
            title,
            startDate,
            endDate,
            totalPrice: parseInt(totalPrice) || 0,
            roomPrice: parseInt(roomPrice) || 0,
            nights: parseInt(nights) || 1,
            details,
            includes,
            active: active !== false
        };

        // Încearcă PocketBase
        try {
            const result = await pb.collection('offers').update(id, offerData);
            return res.json({ success: true, message: 'Oferta a fost actualizată!', offer: result });
        } catch (pbErr) {
            console.warn('⚠️ PocketBase update failed, using JSON file:', pbErr.message);
        }

        // Fallback la fișier JSON
        const offers = loadOffersFromFile();
        const index = offers.findIndex(o => o.id === id);
        if (index !== -1) {
            offers[index] = { ...offers[index], ...offerData };
            saveOffersToFile(offers);
            return res.json({ success: true, message: 'Oferta a fost actualizată!', offer: offers[index] });
        }

        res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
    } catch (err) {
        console.error('Error updating offer:', err);
        res.status(500).json({ success: false, error: 'Eroare la actualizarea ofertei: ' + err.message });
    }
});

// Șterge o ofertă
router.delete('/offers/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Încearcă PocketBase
        try {
            await pb.collection('offers').delete(id);
            return res.json({ success: true, message: 'Oferta a fost ștearsă!' });
        } catch (pbErr) {
            console.warn('⚠️ PocketBase delete failed, using JSON file:', pbErr.message);
        }

        // Fallback la fișier JSON
        const offers = loadOffersFromFile();
        const filteredOffers = offers.filter(o => o.id !== id);
        if (filteredOffers.length < offers.length) {
            saveOffersToFile(filteredOffers);
            return res.json({ success: true, message: 'Oferta a fost ștearsă!' });
        }

        res.status(404).json({ success: false, error: 'Oferta nu a fost găsită' });
    } catch (err) {
        console.error('Error deleting offer:', err);
        res.status(500).json({ success: false, error: 'Eroare la ștergerea ofertei: ' + err.message });
    }
});

// Endpoint public pentru oferte active
router.get('/public/offers', async (req, res) => {
    try {
        // Încearcă PocketBase
        try {
            const records = await pb.collection('offers').getFullList({
                filter: 'active = true',
                sort: 'startDate',
                $autoCancel: false
            });

            return res.json({
                success: true,
                offers: records.filter(o => new Date(o.endDate) >= new Date())
            });
        } catch (pbErr) {
            console.warn('⚠️ PocketBase fetch failed, using JSON file');
        }

        // Fallback la fișier JSON
        const offers = loadOffersFromFile();
        const activeOffers = offers.filter(o => o.active && new Date(o.endDate) >= new Date());
        res.json({ success: true, offers: activeOffers });
    } catch (err) {
        console.error('Error fetching public offers:', err);
        res.json({ success: true, offers: [] });
    }
});

export default router;
