// backend/env.js — Loads environment variables ONCE from the root .env
// This must be imported FIRST in index.js (before any other module)
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// Production fallback: PocketBase runs on the same server (started by start-production.sh)
if (!process.env.POCKET_BASE_URL) {
    process.env.POCKET_BASE_URL = 'http://127.0.0.1:8090';
}

// Production fallback: API_URL
if (!process.env.API_URL && process.env.NODE_ENV === 'production') {
    process.env.API_URL = 'https://casa-chindea.onrender.com';
}

// Production fallback: FRONTEND_URL
if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
    process.env.FRONTEND_URL = 'https://casa-chindea.vercel.app';
}

console.log('✅ ENV loaded | POCKET_BASE_URL =', process.env.POCKET_BASE_URL, '| NODE_ENV =', process.env.NODE_ENV);

