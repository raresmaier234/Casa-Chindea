// api/index.js - Main Express backend for Vercel
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bookingRouter from '../backend/booking-server.js';
import contactRouter from '../backend/contact-server.js';
import galleryRouter from '../backend/gallery-server.js';
import authRouter from '../backend/auth-server.js';
import adminRouter from '../backend/admin-server.js';

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Use routers
app.use(authRouter);
app.use(bookingRouter);
app.use(contactRouter);
app.use(galleryRouter);
app.use('/api/admin', adminRouter);

// Export for Vercel
export default app;