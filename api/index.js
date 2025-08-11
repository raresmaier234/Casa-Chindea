// api/index.js - Single API endpoint for Vercel
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import PocketBase from 'pocketbase';

const app = express();

// Configure CORS
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

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acces necesar' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalid' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
    try {
        const user = await pb.collection('users').getOne(req.user.userId);
        if (!user.admin) {
            return res.status(403).json({
                success: false,
                error: 'Acces restricționat. Doar administratorii pot accesa această resursă.'
            });
        }
        next();
    } catch (err) {
        console.error('Error checking admin permissions:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la verificarea permisiunilor.'
        });
    }
};

// Multer configuration
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
    limits: { fileSize: 10 * 1024 * 1024 },
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

// WhatsApp function
async function sendWhatsAppMessage(phone, bookingData) {
    console.log('WhatsApp message would be sent to:', phone, bookingData);
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const authData = await pb.collection('users').authWithPassword(email, password);

        const token = jwt.sign(
            {
                userId: authData.record.id,
                email: authData.record.email,
                admin: authData.record.admin || false
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: authData.record.id,
                email: authData.record.email,
                name: authData.record.name,
                admin: authData.record.admin || false
            }
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            error: 'Email sau parolă incorectă.'
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        const userData = {
            email,
            password,
            passwordConfirm: password,
            name,
            admin: false
        };

        const user = await pb.collection('users').create(userData);

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                admin: user.admin || false
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                admin: user.admin || false
            }
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: 'Eroare la crearea contului: ' + err.message
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
});

// USER PROFILE ROUTES
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await pb.collection('users').getOne(req.user.userId);
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                admin: user.admin || false
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea profilului.'
        });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        const updatedUser = await pb.collection('users').update(req.user.userId, {
            name,
            email
        });

        res.json({
            success: true,
            message: 'Profilul a fost actualizat cu succes.',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                admin: updatedUser.admin || false
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea profilului.'
        });
    }
});

app.get('/api/user/bookings', authenticateToken, async (req, res) => {
    try {
        const bookings = await pb.collection('booking').getFullList({
            filter: `email = "${req.user.email}"`,
            sort: '-created'
        });

        res.json({
            success: true,
            bookings: bookings.map(booking => ({
                id: booking.id,
                checkin: booking.checkin,
                checkout: booking.checkout,
                guests: booking.guests,
                roomType: booking.roomType,
                status: booking.status || 'pending',
                message: booking.message,
                created: booking.created
            }))
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor.'
        });
    }
});

// BOOKING ROUTES
app.get('/api/availability', async (req, res) => {
    try {
        const bookings = await pb.collection('booking').getFullList({
            sort: 'checkin',
            filter: `checkin >= "${new Date().toISOString().split('T')[0]}" && status != "cancelled"`,
        });

        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            sort: 'startDate',
            filter: `endDate >= "${new Date().toISOString().split('T')[0]}"`
        });

        const unavailableDates = [];

        bookings.forEach(booking => {
            unavailableDates.push({
                start: booking.checkin,
                end: booking.checkout,
                type: 'booking',
                reason: 'Rezervat'
            });
        });

        calendarBlocks.forEach(block => {
            unavailableDates.push({
                start: block.startDate,
                end: block.endDate,
                type: 'blocked',
                reason: block.reason || 'Blocat de administrator'
            });
        });

        res.json({
            success: true,
            unavailableDates
        });
    } catch (err) {
        console.error('Error fetching availability:', err);
        res.status(500).json({ error: 'Error checking availability: ' + err.message });
    }
});

app.post('/api/booking', async (req, res) => {
    const { name, email, phone, guests, checkin, checkout, roomType, message } = req.body;

    if (!name || !email || !phone || !guests || !checkin || !checkout || !roomType) {
        return res.status(400).json({ error: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    try {
        const existingBookings = await pb.collection('booking').getFullList({
            filter: `(checkin <= "${checkout}" && checkout >= "${checkin}") && status != "cancelled"`,
        });

        if (existingBookings.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate se suprapun cu o rezervare existentă.'
            });
        }

        const calendarBlocks = await pb.collection('calendar_blocks').getFullList({
            filter: `(startDate <= "${checkout}" && endDate >= "${checkin}")`
        });

        if (calendarBlocks.length > 0) {
            return res.status(400).json({
                error: 'Ne pare rău, dar datele selectate sunt blocate pentru rezervări.'
            });
        }

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

        await sendWhatsAppMessage(process.env.CONTACT_PHONE, {
            name, phone, guests, checkin, checkout, roomType, message
        });

        res.json({
            success: true,
            message: 'Rezervarea a fost trimisă cu succes! Veți fi contactat în curând.',
            booking: pbResult
        });
    } catch (err) {
        console.error('Eroare:', err);
        res.status(500).json({ error: 'Eroare la rezervare: ' + err.message });
    }
});

// CONTACT ROUTE
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
    }

    try {
        console.log('Contact form submission:', { name, email, phone, message });
        res.json({ success: true, message: 'Mesajul a fost trimis cu succes!' });
    } catch (err) {
        console.error('Eroare contact:', err);
        res.status(500).json({ error: 'Eroare la trimiterea mesajului: ' + err.message });
    }
});

// GALLERY ROUTES
app.get('/api/photos', async (req, res) => {
    try {
        const photos = await pb.collection('photos').getFullList({
            sort: '-created'
        });

        const photosWithUrls = photos.map(photo => ({
            id: photo.id,
            description: photo.description || '',
            imageUrl: pb.getFileUrl(photo, photo.image),
            created: photo.created
        }));

        res.json({
            success: true,
            items: photosWithUrls
        });
    } catch (err) {
        console.error('Error fetching photos:', err);
        res.status(500).json({ error: 'Error fetching photos: ' + err.message });
    }
});

// ADMIN ROUTES
app.get('/api/admin/bookings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let filter = '';

        if (status) {
            filter = `status = "${status}"`;
        }

        const bookings = await pb.collection('booking').getFullList({
            filter,
            sort: '-created'
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
                message: booking.message,
                status: booking.status || 'pending',
                created: booking.created,
                updated: booking.updated
            }))
        });
    } catch (err) {
        console.error('Error fetching admin bookings:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor.'
        });
    }
});

app.put('/api/admin/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
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

app.post('/api/admin/photos', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Nu a fost încărcată nicio poză.'
            });
        }

        const { description } = req.body;

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append('image', blob, req.file.filename);
        formData.append('description', description || '');
        formData.append('uploadedBy', req.user.userId);

        const record = await pb.collection('photos').create(formData);

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

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea pozei.'
        });
    }
});

app.delete('/api/admin/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
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

app.put('/api/admin/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
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

app.get('/api/admin/calendar-blocks', authenticateToken, requireAdmin, async (req, res) => {
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

app.post('/api/admin/calendar-blocks', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Data de început și sfârșitul sunt obligatorii.'
            });
        }

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

app.delete('/api/admin/calendar-blocks/:id', authenticateToken, requireAdmin, async (req, res) => {
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

export default app;
