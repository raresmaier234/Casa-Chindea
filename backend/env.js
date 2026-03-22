// backend/env.js — Loads environment variables ONCE from the root .env
// This must be imported FIRST in index.js (before any other module)
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('✅ ENV loaded from root .env | POCKET_BASE_URL =', process.env.POCKET_BASE_URL);

