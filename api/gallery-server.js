// api/gallery-server.js
import express from 'express';
import multer from 'multer';
import PocketBase from 'pocketbase';

const router = express.Router();
const pb = new PocketBase(process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');

router.get('/', async (req, res) => {
    try {
        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit < 1) limit = 10;

        console.log('📸 Fetching photos from PocketBase:', process.env.POCKET_BASE_URL);

        const photos = await pb.collection('photos').getList(1, limit, {
            perPage: limit,
            sort: '-created'
        });

        const items = photos.items.map(photo => ({
            ...photo,
            imageUrl: pb.getFileUrl(photo, photo.image)
        }));

        console.log(`✅ Fetched ${items.length} photos`);
        res.json({ items });
    } catch (err) {
        console.error('❌ Error fetching photos:', err);
        res.status(500).json({ error: 'Error fetching photos.' });
    }
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file sent.' });
        }

        const record = await pb.collection('photos').create({
            image: new Blob([req.file.buffer], { type: req.file.mimetype }),
        });

        res.json({ success: true, id: record.id });
    } catch (err) {
        console.error('❌ Upload error:', err);
        res.status(500).json({ error: 'Upload error.' });
    }
});

export default router;
