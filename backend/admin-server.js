// backend/admin-server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PocketBase from 'pocketbase';
import { authenticateToken } from './auth-server.js';

const router = express.Router();
const pb = new PocketBase(process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');

console.log('🏛️ Admin server initialized with PocketBase URL:', process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');


// Middleware pentru verificarea permisiunilor de admin
const requireAdmin = async (req, res, next) => {
    try {
        console.log('🔍 Checking admin permissions for user:', req.user);

        // Verifică dacă userId există în token
        if (!req.user || !req.user.userId) {
            console.error('❌ No userId found in token');
            return res.status(401).json({
                success: false,
                error: 'Token invalid - lipsește userId.'
            });
        }

        // Verifică dacă utilizatorul este admin direct din token (dacă câmpul admin este în JWT)
        if (req.user.admin === true) {
            console.log('✅ User is admin (from token)');
            return next();
        }

        // Dacă admin nu este în token, verifică din baza de date
        const user = await pb.collection('users').getOne(req.user.userId);
        console.log('👤 User from DB:', { id: user.id, email: user.email, admin: user.admin });

        // Verifică dacă utilizatorul are câmpul admin setat pe true
        if (!user.admin) {
            console.log('❌ User is not admin');
            return res.status(403).json({
                success: false,
                error: 'Acces restricționat. Doar administratorii pot accesa această resursă.'
            });
        }

        console.log('✅ User is admin (from DB)');
        next();
    } catch (err) {
        console.error('❌ Error checking admin permissions:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la verificarea permisiunilor: ' + err.message
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

// **REZERVĂRI ADMIN**

// Obține toate rezervările pentru admin
router.get('/bookings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching bookings for admin...');
        const { status } = req.query;
        let filter = '';

        if (status) {
            filter = `status = "${status}"`;
            console.log('🔍 Using filter:', filter);
        }

        console.log('🔗 PocketBase URL:', process.env.POCKET_BASE_URL);
        console.log('📊 Attempting to fetch from booking collection...');

        const bookings = await pb.collection('booking').getFullList({
            filter,
            sort: '-created'
        });

        console.log(`✅ Successfully fetched ${bookings.length} bookings`);
        console.log('📝 First booking sample:', bookings[0] ? {
            id: bookings[0].id,
            name: bookings[0].name,
            email: bookings[0].email,
            status: bookings[0].status,
            created: bookings[0].created
        } : 'No bookings found');

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
                message: booking.message,
                status: booking.status || 'pending',
                created: booking.created,
                updated: booking.updated
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching admin bookings:', err);
        console.error('❌ Error details:', {
            message: err.message,
            status: err.status,
            data: err.data,
            isAbortError: err.isAbortError
        });

        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor: ' + err.message
        });
    }
});

// Actualizează statusul unei rezervări
router.put('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
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
        const blocks = await pb.collection('calendar_blocks').getFullList({
            sort: 'startDate'
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
            reason: reason || 'Blocare administrativă',
            createdBy: req.user.userId
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

        await pb.collection('calendar_blocks').delete(id);

        res.json({
            success: true,
            message: 'Blocarea a fost ștearsă cu succes.'
        });
    } catch (err) {
        console.error('Error deleting calendar block:', err);
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
        const blocks = await pb.collection('calendar_blocks').getFullList({
            filter: `(startDate <= "${endDate}" && endDate >= "${startDate}")`
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

export default router;
