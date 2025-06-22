// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bookingRouter from './booking-server.js';
import contactRouter from './contact-server.js';
import galleryRouter from './gallery-server.js';
import whatsappRouter from './whatsapp.js';


dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(join(__dirname, "js")));


app.use(bookingRouter);
app.use(contactRouter);
app.use(galleryRouter);
app.use(whatsappRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running on port', PORT));
