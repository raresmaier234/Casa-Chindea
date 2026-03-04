// backend/auth-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { auth } from 'express-openid-connect';
import multer from 'multer';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for memory storage (temporary, before uploading to PocketBase)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Helper function to ensure PocketBase is authenticated as admin
async function ensurePocketBaseAuth() {
    try {
        // Check if already authenticated
        if (pb.authStore.isValid) {
            return true;
        }

        // Authenticate as admin using email/password
        // You need to have POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env
        if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
            // PocketBase 0.23+ uses _superusers collection instead of pb.admins
            try {
                await pb.collection('_superusers').authWithPassword(
                    process.env.POCKETBASE_ADMIN_EMAIL,
                    process.env.POCKETBASE_ADMIN_PASSWORD
                );
            } catch (e) {
                // Fallback for older versions
                await pb.admins.authWithPassword(
                    process.env.POCKETBASE_ADMIN_EMAIL,
                    process.env.POCKETBASE_ADMIN_PASSWORD
                );
            }
            console.log('✅ PocketBase authenticated as admin');
            return true;
        }

        console.log('⚠️ No PocketBase admin credentials found');
        return false;
    } catch (err) {
        console.error('❌ PocketBase admin auth failed:', err.message);
        return false;
    }
}

// Authenticate on startup
ensurePocketBaseAuth();

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

// Temporary storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map(); // { email: { code, name, password, expires } }

// Helper function to generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send verification email
async function sendVerificationEmail(email, code, name) {
    console.log('📧 sendVerificationEmail called with:', { email, code, name });

    // Determine which SMTP service to use based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const useSendGrid = process.env.SENDGRID_API_KEY;

    console.log('📧 Email service:', useSendGrid ? 'SendGrid' : 'Gmail SMTP');
    console.log('📧 NODE_ENV:', process.env.NODE_ENV);

    try {
        let transporter;

        if (useSendGrid) {
            // SendGrid configuration (RECOMMENDED FOR PRODUCTION)
            transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                },
                connectionTimeout: 10000, // 10 seconds
                greetingTimeout: 10000,
                socketTimeout: 15000
            });
        } else {
            // Gmail configuration (FOR DEVELOPMENT ONLY)
            // NOTE: You need to enable "App Password" in Gmail settings
            // https://support.google.com/accounts/answer/185833
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS // This must be an App Password, not regular password
                },
                connectionTimeout: 10000, // 10 seconds
                greetingTimeout: 10000,
                socketTimeout: 15000
            });
        }

        console.log('✅ Transporter created');

        const mailOptions = {
            from: `"Casa Chindea" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Confirmă-ți contul Casa Chindea',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .code-box { background: white; border: 2px solid #059669; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 5px; margin: 20px 0; border-radius: 8px; }
                        .button { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏡 Casa Chindea</h1>
                            <p>Bine ai venit!</p>
                        </div>
                        <div class="content">
                            <h2>Salut, ${name}! 👋</h2>
                            <p>Mulțumim pentru că ai ales să creezi un cont la Casa Chindea!</p>
                            <p>Pentru a finaliza înregistrarea, te rugăm să introduci codul de verificare de mai jos:</p>
                            
                            <div class="code-box">${code}</div>
                            
                            <p style="text-align: center; color: #666;">Sau dă click pe butonul de mai jos:</p>
                            <p style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/js/pages/verify-email.html?email=${encodeURIComponent(email)}&code=${code}" class="button">
                                    Verifică Contul
                                </a>
                            </p>
                            
                            <p><strong>Important:</strong> Acest cod este valabil 15 minute și poate fi folosit o singură dată.</p>
                            
                            <p>Dacă nu ai solicitat crearea acestui cont, te rugăm să ignori acest email.</p>
                            
                            <p>Cu drag,<br>Echipa Casa Chindea</p>
                        </div>
                        <div class="footer">
                            <p>© 2026 Casa Chindea. Toate drepturile rezervate.</p>
                            <p>Hășmaș, județul Harghita, România</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        console.log('📤 Sending email to:', email);

        // Add timeout wrapper to prevent hanging
        const sendWithTimeout = (mailOptions, timeoutMs = 30000) => {
            return Promise.race([
                transporter.sendMail(mailOptions),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Email sending timeout after ' + timeoutMs + 'ms')), timeoutMs)
                )
            ]);
        };

        const info = await sendWithTimeout(mailOptions, 30000);
        console.log('✅ Email sent successfully! MessageId:', info.messageId);

        return true;
    } catch (err) {
        console.error('❌ Error sending verification email:', err);
        console.error('❌ Error details:', {
            message: err.message,
            code: err.code,
            command: err.command
        });
        return false;
    }
}

// NEW: Check if email exists (called before registration)
app.post('/api/auth/check-email', async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    console.log('🔍 Checking email availability:', normalizedEmail);

    if (!normalizedEmail) {
        return res.status(400).json({
            success: false,
            error: 'Email este obligatoriu.'
        });
    }

    try {
        // ✅ FIX: Ensure PocketBase is authenticated before querying
        const authOk = await ensurePocketBaseAuth();
        if (!authOk) {
            console.error('❌ Cannot check email: PocketBase admin auth failed');
            // Fail safe: block registration attempt if we can't verify
            return res.status(503).json({
                success: false,
                error: 'Serviciu temporar indisponibil. Te rugăm să încerci din nou.'
            });
        }

        try {
            const existingUser = await pb.collection('users').getFirstListItem(`email="${normalizedEmail}"`);

            console.log('❌ Email already exists:', normalizedEmail, '- User ID:', existingUser.id);
            return res.status(200).json({
                success: false,
                exists: true,
                message: 'Acest email este deja înregistrat. Te rugăm să te autentifici sau să folosești alt email.'
            });
        } catch (notFoundErr) {
            if (notFoundErr.status === 404 || notFoundErr.message?.includes('not found') || notFoundErr.message?.includes('No record')) {
                console.log('✅ Email available:', normalizedEmail);
                return res.status(200).json({
                    success: true,
                    exists: false,
                    message: 'Email disponibil.'
                });
            }

            console.error('⚠️ Unexpected error checking email:', notFoundErr.status, notFoundErr.message);
            throw notFoundErr;
        }

    } catch (err) {
        console.error('❌ Error checking email:', err);

        return res.status(500).json({
            success: false,
            error: 'Eroare la verificarea email-ului.'
        });
    }
});

// Register endpoint - Step 1: Send verification code
app.post('/api/auth/register', async (req, res) => {
    const { password, name } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

    console.log('📧 Registration attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email și parola sunt obligatorii.'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Parola trebuie să aibă cel puțin 8 caractere.'
        });
    }

    try {
        // Always re-authenticate before querying
        const authOk = await ensurePocketBaseAuth();
        if (!authOk) {
            return res.status(503).json({
                success: false,
                error: 'Serviciu temporar indisponibil. Te rugăm să încerci din nou.'
            });
        }

        // Check if email already exists in PocketBase
        try {
            const existingUser = await pb.collection('users').getFirstListItem(`email="${email}"`);
            // If we reach here, user exists — return 409 Conflict
            console.log('❌ Email already exists in database:', email, '- User ID:', existingUser.id);
            return res.status(409).json({
                success: false,
                emailExists: true,
                error: 'Acest email este deja înregistrat. Te rugăm să te autentifici sau să folosești alt email.'
            });
        } catch (checkErr) {
            if (checkErr.status === 404 || checkErr.message?.includes('not found') || checkErr.message?.includes('No record')) {
                console.log('✅ Email available:', email);
                // Good — email doesn't exist, continue
            } else {
                console.error('❌ Unexpected error while checking email existence:', checkErr.message, checkErr.status);
                return res.status(500).json({
                    success: false,
                    error: 'Eroare la verificarea email-ului. Te rugăm să încerci din nou.'
                });
            }
        }

        // Also check if there's a pending verification for this email
        if (verificationCodes.has(email)) {
            console.log('⚠️ Verification already in progress for:', email);
            // Delete old verification and create new one
            verificationCodes.delete(email);
            console.log('✅ Cleared old verification code');
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

        console.log('✅ Generated code:', verificationCode);

        // Store verification data temporarily
        verificationCodes.set(email, {
            code: verificationCode,
            name: name || email.split('@')[0],
            password: password,
            expires: expiresAt,
            attempts: 0
        });

        console.log('✅ Stored verification data for:', email);

        // Send verification email
        console.log('📤 Attempting to send email...');
        const emailSent = await sendVerificationEmail(email, verificationCode, name || email.split('@')[0]);

        if (!emailSent) {
            console.error('❌ Failed to send verification email');
            verificationCodes.delete(email);
            return res.status(500).json({
                success: false,
                error: 'Eroare la trimiterea emailului de verificare. Te rugăm să încerci din nou.'
            });
        }

        console.log('✅ Email sent successfully to:', email);

        res.json({
            success: true,
            message: 'Cod de verificare trimis! Verifică-ți emailul.',
            email: email
        });
    } catch (err) {
        console.error('❌ Registration error:', err);
        console.error('❌ Error details:', {
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({
            success: false,
            error: 'Eroare server la înregistrare: ' + err.message
        });
    }
});

// Register endpoint - Step 2: Verify code and create account
app.post('/api/auth/verify-email', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({
            success: false,
            error: 'Email și cod sunt obligatorii.'
        });
    }

    try {
        const verificationData = verificationCodes.get(email);

        if (!verificationData) {
            return res.status(400).json({
                success: false,
                error: 'Cod de verificare invalid sau expirat.'
            });
        }

        // Check if code expired
        if (Date.now() > verificationData.expires) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                error: 'Codul de verificare a expirat. Te rugăm să te înregistrezi din nou.'
            });
        }

        // Check attempts (max 5 attempts)
        if (verificationData.attempts >= 5) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                error: 'Prea multe încercări eșuate. Te rugăm să te înregistrezi din nou.'
            });
        }

        // Verify code
        if (verificationData.code !== code.trim()) {
            verificationData.attempts++;
            return res.status(400).json({
                success: false,
                error: `Cod incorect. Mai ai ${5 - verificationData.attempts} încercări.`
            });
        }

        // Final duplicate-email check before creating the user (guard against race conditions)
        try {
            await ensurePocketBaseAuth();
            const existingUser = await pb.collection('users').getFirstListItem(`email="${email}"`);
            // If we get here the user already exists — abort
            console.log('❌ Email already taken at verify step:', email, '- User ID:', existingUser.id);
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                error: 'Acest email este deja înregistrat. Te rugăm să te autentifici.'
            });
        } catch (dupErr) {
            if (dupErr.status === 404 || dupErr.message?.includes('not found') || dupErr.message?.includes('No record')) {
                // Good — email still free, proceed to create account
            } else {
                console.error('❌ Error during final email check:', dupErr.message);
                return res.status(500).json({
                    success: false,
                    error: 'Eroare la verificarea email-ului. Te rugăm să încerci din nou.'
                });
            }
        }

        // Create user in PocketBase
        const userData = {
            email: email,
            password: verificationData.password,
            passwordConfirm: verificationData.password,
            name: verificationData.name,
            emailVisibility: true
            // NOTE: Do NOT set 'verified' field - PocketBase manages this automatically
            // The user is verified through our custom code verification process
        };

        console.log('📝 Creating user in PocketBase:', { email, name: verificationData.name });

        const record = await pb.collection('users').create(userData);

        console.log('✅ User created successfully:', record.id);

        // Remove verification data
        verificationCodes.delete(email);

        // NOTE: We DO NOT generate a JWT token here
        // User must login manually after registration for better security

        res.json({
            success: true,
            message: 'Cont creat cu succes! Te rugăm să te autentifici.',
            // NO token returned - user must login
            user: {
                id: record.id,
                email: record.email,
                name: record.name
            }
        });
    } catch (err) {
        console.error('❌ Verification error:', err);
        console.error('❌ Error details:', {
            message: err.message,
            status: err.status,
            data: err.data,
            response: err.response
        });

        if (err.status === 400 && err.data) {
            // Try to extract specific field errors from PocketBase
            let errorMessage = 'Date invalide.';

            if (err.data.data) {
                const fieldErrors = Object.entries(err.data.data).map(([field, error]) => {
                    return `${field}: ${error.message}`;
                }).join(', ');

                if (fieldErrors) {
                    errorMessage = fieldErrors;
                }
            } else if (err.data.message) {
                errorMessage = err.data.message;
            }

            res.status(400).json({
                success: false,
                error: errorMessage
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Eroare server la verificare: ' + (err.message || 'Unknown error')
            });
        }
    }
});

// Resend verification code
app.post('/api/auth/resend-code', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'Email este obligatoriu.'
        });
    }

    try {
        const verificationData = verificationCodes.get(email);

        if (!verificationData) {
            return res.status(400).json({
                success: false,
                error: 'Nu există nicio solicitare de înregistrare pentru acest email.'
            });
        }

        // Generate new code
        const newCode = generateVerificationCode();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Update verification data
        verificationData.code = newCode;
        verificationData.expires = expiresAt;
        verificationData.attempts = 0;

        // Send new verification email
        const emailSent = await sendVerificationEmail(email, newCode, verificationData.name);

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                error: 'Eroare la trimiterea emailului.'
            });
        }

        res.json({
            success: true,
            message: 'Un nou cod de verificare a fost trimis!'
        });
    } catch (err) {
        console.error('Resend code error:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare server.'
        });
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

        // Get full avatar URL if avatar exists
        let avatarUrl = '';
        if (user.avatar) {
            avatarUrl = pb.getFileUrl(user, user.avatar);
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: avatarUrl,
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

        console.log('📝 Updating profile for user:', req.user.userId);
        console.log('📝 Data to update:', { name, phone });

        // Build update object - only include fields that are provided
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        console.log('📝 Update data object:', updateData);

        // Actualizează informațiile utilizatorului în PocketBase
        const updatedUser = await pb.collection('users').update(req.user.userId, updateData);

        console.log('✅ Profile updated successfully');

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
        console.error('❌ Error updating user profile:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: 'Eroare la actualizarea profilului: ' + (err.message || 'Unknown error')
        });
    }
});

// User bookings endpoint
app.get('/api/user/booking', authenticateToken, async (req, res) => {
    try {
        // Caută rezervările utilizatorului curent în PocketBase
        // Remove sort to avoid issues with system fields
        const bookings = await pb.collection('booking').getFullList(500, {
            filter: `email = "${req.user.email}"`,
            $autoCancel: false
        });

        // Sort bookings in JavaScript by created date (descending)
        const sortedBookings = bookings.sort((a, b) => {
            const dateA = new Date(a.created || a.id);
            const dateB = new Date(b.created || b.id);
            return dateB - dateA;
        });

        res.json({
            success: true,
            bookings: sortedBookings.map(booking => ({
                id: booking.id,
                checkin: booking.checkin,
                checkout: booking.checkout,
                guests: booking.guests,
                roomType: booking.roomType || 'standard',
                numberOfRooms: booking.numberOfRooms || 1,
                phone: booking.phone,
                message: booking.message,
                status: booking.status || 'pending',
                created: booking.created || booking.id,
                updated: booking.updated || booking.id
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching user bookings:', err);
        console.error('❌ Full error details:', {
            message: err.message,
            status: err.status,
            data: err.data,
            stack: err.stack
        });

        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea rezervărilor: ' + err.message
        });
    }
});

// Avatar upload endpoint
app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Niciun fișier încărcat.'
            });
        }

        // Create FormData for PocketBase
        const formData = new FormData();

        // Convert buffer to Blob for PocketBase
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('avatar', blob, req.file.originalname);

        // Update user record in PocketBase with avatar
        const updatedUser = await pb.collection('users').update(req.user.userId, formData);

        // Get the avatar URL using correct PocketBase method
        const avatarUrl = pb.getFileUrl(updatedUser, updatedUser.avatar);


        res.json({
            success: true,
            message: 'Avatar încărcat cu succes!',
            avatarUrl: avatarUrl
        });
    } catch (err) {
        console.error('❌ Error uploading avatar:', err);
        console.error('Error details:', {
            message: err.message,
            status: err.status,
            data: err.data
        });
        res.status(500).json({
            success: false,
            error: 'Eroare la încărcarea avatar-ului: ' + err.message
        });
    }
});

// Change password endpoint
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Parola actuală și parola nouă sunt obligatorii.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Parola nouă trebuie să aibă cel puțin 8 caractere.'
            });
        }

        // Verify current password by attempting to authenticate
        try {
            await pb.collection('users').authWithPassword(req.user.email, currentPassword);
        } catch (authErr) {
            return res.status(401).json({
                success: false,
                error: 'Parola actuală este incorectă.'
            });
        }

        // Update password in PocketBase
        await pb.collection('users').update(req.user.userId, {
            password: newPassword,
            passwordConfirm: newPassword
        });

        res.json({
            success: true,
            message: 'Parola a fost schimbată cu succes.'
        });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({
            success: false,
            error: 'Eroare la schimbarea parolei.'
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
