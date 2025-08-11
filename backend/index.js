// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bookingRouter from './booking-server.js';
import contactRouter from './contact-server.js';
import galleryRouter from './gallery-server.js';


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

app.use(express.static(join(__dirname, "js")));

app.use(bookingRouter);
app.use(contactRouter);
app.use(galleryRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running on port', PORT));
