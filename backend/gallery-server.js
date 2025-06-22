// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pb = new PocketBase(process.env.POCKET_BASE_URL);

app.get('/api/photos', async (req, res) => {
    try {

        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit < 1) limit = 10;
        const photos = await pb.collection('photos').getList(1, limit, { perPage: limit, sort: '-created' });
        const items = photos.items.map(photo => ({
            ...photo,
            imageUrl: pb.getFileUrl(photo, photo.image)
        }));
        res.json({ items });
    } catch (err) {
        console.error('❌ Eroare la încărcarea pozelor:', err);
        res.status(500).json({ error: 'Eroare la încărcarea pozelor.' });
    }
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/photos', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Niciun fișier trimis.' });
        }
        const record = await pb.collection('photos').create({
            image: new Blob([req.file.buffer], { type: req.file.mimetype }),
            // poți adăuga și alte câmpuri aici dacă ai nevoie
        });
        res.json({ success: true, id: record.id });
    } catch (err) {
        console.error('❌ Eroare la upload:', err);
        res.status(500).json({ error: 'Eroare la upload.' });
    }
});