// backend/auth-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pb = new PocketBase(process.env.POCKET_BASE_URL);

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
                    avatar: authData.record.avatar
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
            domain: process.env.AUTH0_DOMAIN || "dev-casa-chindea.eu.auth0.com",
            clientId: process.env.AUTH0_CLIENT_ID || "YOUR_REAL_AUTH0_CLIENT_ID"
        },
        // Add other public config here
        recaptcha: {
            siteKey: process.env.RECAPTCHA_SITE_KEY
        }
    });
});

export default app;
