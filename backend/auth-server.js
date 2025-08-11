// backend/auth-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { auth } from 'express-openid-connect';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Auth0 configuration using express-openid-connect
const auth0Config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.JWT_SECRET || 'casa-chindea-secret-key-2024',
    baseURL: process.env.API_URL || 'http://localhost:3001',
    clientID: process.env.AUTH0_CLIENT_ID || '0hmKFQW11knhsLBYAQarNXqJnLfWrQO4',
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-wkxifa540jrlc83m.us.auth0.com'
};

// Only enable Auth0 if credentials are provided
if (process.env.AUTH0_CLIENT_ID && (process.env.AUTH0_ISSUER_BASE_URL || process.env.AUTH0_DOMAIN)) {
    console.log('✅ Auth0 configured, enabling authentication routes');
    app.use(auth(auth0Config));

    // Auth0 protected route example
    app.get('/api/auth0/profile', (req, res) => {
        if (req.oidc.isAuthenticated()) {
            res.json({
                success: true,
                user: req.oidc.user,
                authenticated: true
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Nu ești autentificat prin Auth0'
            });
        }
    });

    // Auth0 status endpoint
    app.get('/api/auth0/status', (req, res) => {
        res.json({
            success: true,
            authenticated: req.oidc.isAuthenticated(),
            user: req.oidc.isAuthenticated() ? req.oidc.user : null
        });
    });
} else {
    console.log('⚠️ Auth0 not configured, Auth0 routes disabled');
}

// JWT Secret pentru semnarea token-urilor
const JWT_SECRET = process.env.JWT_SECRET || 'casa-chindea-secret-key-2024';

// Login endpoint cu PocketBase
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email și parola sunt obligatorii.'
        });
    }

    try {
        console.log('Attempting login for:', email);

        // Încearcă autentificarea cu PocketBase
        const authData = await pb.collection('users').authWithPassword(email, password);

        if (authData.token && authData.record) {
            // Creează un JWT token personalizat pentru aplicația noastră
            const customToken = jwt.sign(
                {
                    userId: authData.record.id,
                    email: authData.record.email,
                    name: authData.record.name || authData.record.email,
                    admin: authData.record.admin || false,
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 ore
                },
                JWT_SECRET
            );

            console.log('Login successful for:', email);

            res.json({
                success: true,
                token: customToken,
                user: {
                    id: authData.record.id,
                    email: authData.record.email,
                    name: authData.record.name || authData.record.email,
                    avatar: authData.record.avatar,
                    admin: authData.record.admin || false
                }
            });
        } else {
            throw new Error('Autentificare eșuată');
        }
    } catch (err) {
        console.error('Login error:', err);

        // Verifică tipul de eroare
        if (err.status === 400) {
            res.status(401).json({
                success: false,
                error: 'Email sau parolă incorectă.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Eroare server la autentificare.'
            });
        }
    }
});

// Register endpoint (opțional, pentru înregistrarea utilizatorilor noi)
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email și parola sunt obligatorii.'
        });
    }

    try {
        console.log('Attempting registration for:', email);

        // Creează utilizator nou în PocketBase
        const userData = {
            email,
            password,
            passwordConfirm: password,
            name: name || email.split('@')[0]
        };

        const record = await pb.collection('users').create(userData);

        // Trimite email de verificare (opțional)
        await pb.collection('users').requestVerification(email);

        console.log('Registration successful for:', email);

        res.json({
            success: true,
            message: 'Cont creat cu succes! Verifică-ți emailul pentru activare.',
            user: {
                id: record.id,
                email: record.email,
                name: record.name
            }
        });
    } catch (err) {
        console.error('Registration error:', err);

        if (err.status === 400) {
            res.status(400).json({
                success: false,
                error: 'Email deja existent sau date invalide.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Eroare server la înregistrare.'
            });
        }
    }
});

// Middleware pentru verificarea token-ului JWT
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token de acces necesar.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalid.' });
        }
        req.user = user;
        next();
    });
};

// Endpoint pentru verificarea validității token-ului
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Logout endpoint (invalidează token-ul din PocketBase)
app.post('/api/auth/logout', (req, res) => {
    // Pentru JWT, logout-ul se face pe frontend prin ștergerea token-ului
    // Din moment ce JWT-urile sunt stateless, nu putem să le invalidăm pe server
    res.json({
        success: true,
        message: 'Logout reușit.'
    });
});

// Configuration endpoint for frontend
app.get('/api/config', (req, res) => {
    res.json({
        auth0: {
            domain: process.env.AUTH0_DOMAIN || "dev-wkxifa540jrlc83m.us.auth0.com",
            clientId: process.env.AUTH0_CLIENT_ID || "0hmKFQW11knhsLBYAQarNXqJnLfWrQO4",
            enabled: !!(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_DOMAIN)
        },
        // Add other public config here
        recaptcha: {
            siteKey: process.env.RECAPTCHA_SITE_KEY
        }
    });
});

// User profile endpoints
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        // Obține informațiile utilizatorului din PocketBase
        const user = await pb.collection('users').getOne(req.user.userId);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar,
                admin: user.admin || false,
                created: user.created,
                updated: user.updated
            }
        });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea profilului.'
        });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        // Actualizează informațiile utilizatorului în PocketBase
        const updatedUser = await pb.collection('users').update(req.user.userId, {
            name,
            phone
        });
        
        res.json({
            success: true,
            message: 'Profil actualizat cu succes.',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar
            }
        });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea profilului.'
        });
    }
});

// User bookings endpoint
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
    try {
        // Caută rezervările utilizatorului curent în PocketBase
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
                roomType: booking.roomType || 'standard',
                phone: booking.phone,
                message: booking.message,
                status: booking.status || 'pending',
                created: booking.created,
                updated: booking.updated
            }))
        });
    } catch (err) {
        console.error('Error fetching user bookings:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor.',
            bookings: []
        });
    }
});

// Endpoint temporar pentru a seta utilizatorul ca admin (doar pentru debug)
app.post('/api/auth/make-admin', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        
        // Actualizează utilizatorul să fie admin
        const updatedUser = await pb.collection('users').update(userId, {
            admin: true
        });
        
        console.log('✅ User set as admin:', updatedUser.email);
        
        res.json({
            success: true,
            message: 'Utilizatorul a fost setat ca administrator.',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                admin: updatedUser.admin
            }
        });
    } catch (err) {
        console.error('❌ Error setting user as admin:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la setarea permisiunilor de admin: ' + err.message
        });
    }
});

// Endpoint pentru verificarea statusului de admin
app.get('/api/auth/admin-status', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        
        // Obține utilizatorul din PocketBase
        const user = await pb.collection('users').getOne(userId);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                admin: user.admin || false,
                tokenAdmin: req.user.admin || false
            }
        });
    } catch (err) {
        console.error('❌ Error checking admin status:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la verificarea statusului de admin: ' + err.message
        });
    }
});

// Endpoint pentru regenerarea token-ului cu permisiunile actualizate
app.post('/api/auth/refresh-token', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        
        // Obține utilizatorul actualizat din PocketBase
        const user = await pb.collection('users').getOne(userId);
        
        // Generează un nou token cu permisiunile actuale
        const newToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                name: user.name || user.email,
                admin: user.admin || false,
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 ore
            },
            JWT_SECRET
        );
        
        console.log('🔄 Token refreshed for user:', user.email, 'Admin:', user.admin);
        
        res.json({
            success: true,
            message: 'Token actualizat cu succes.',
            token: newToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                avatar: user.avatar,
                admin: user.admin || false
            }
        });
    } catch (err) {
        console.error('❌ Error refreshing token:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea token-ului: ' + err.message
        });
    }
});

export default app;
