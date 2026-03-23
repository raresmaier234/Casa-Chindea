// backend/gallery-server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import PocketBase from 'pocketbase';
import sharp from 'sharp';

// dotenv loaded by index.js → env.js

const app = express();
app.use(cors());
app.use(express.json());

const pb = new PocketBase(process.env.POCKET_BASE_URL);

// Public URL for file links sent to browser (proxied through Node.js in production)
function getPublicFileUrl(record, filename) {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? (process.env.API_URL || 'https://api.casachindea.ro')
        : (process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090');
    return `${baseUrl}/api/files/${record.collectionId}/${record.id}/${filename}`;
}

// Helper function to optimize image
async function optimizeImage(buffer, options = {}) {
    const {
        width = 1920,
        quality = 80,
        format = 'webp'
    } = options;

    try {
        const optimized = await sharp(buffer)
            .resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({ quality })
            .toBuffer();

        return optimized;
    } catch (error) {
        console.error('Error optimizing image:', error);
        return buffer; // Return original if optimization fails
    }
}

// Helper function to create thumbnail
async function createThumbnail(buffer, size = 400) {
    try {
        const thumbnail = await sharp(buffer)
            .resize(size, size, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 70 })
            .toBuffer();

        return thumbnail;
    } catch (error) {
        console.error('Error creating thumbnail:', error);
        return null;
    }
}

app.get('/api/photos', async (req, res) => {
    try {
        // Get limit from query or use 500 as default to get all photos
        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit < 1) limit = 500;

        const photos = await pb.collection('photos').getList(1, limit, {
            perPage: limit,
            sort: '-created'
        });

        const items = photos.items.map(photo => ({
            ...photo,
            imageUrl: getPublicFileUrl(photo, photo.image),
            thumbnailUrl: photo.thumbnail ? getPublicFileUrl(photo, photo.thumbnail) : getPublicFileUrl(photo, photo.image)
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

        console.log('📸 Processing image upload...');

        // Create optimized version (1920px max, WebP, 80% quality)
        const optimizedBuffer = await optimizeImage(req.file.buffer, {
            width: 1920,
            quality: 80
        });

        // Create thumbnail (400px, WebP, 70% quality)
        const thumbnailBuffer = await createThumbnail(req.file.buffer, 400);

        console.log('✅ Image optimized:', {
            original: `${Math.round(req.file.buffer.length / 1024)}KB`,
            optimized: `${Math.round(optimizedBuffer.length / 1024)}KB`,
            thumbnail: thumbnailBuffer ? `${Math.round(thumbnailBuffer.length / 1024)}KB` : 'N/A'
        });

        // Create record with optimized image and thumbnail
        const formData = new FormData();
        formData.append('image', new Blob([optimizedBuffer], { type: 'image/webp' }), 'image.webp');

        if (thumbnailBuffer) {
            formData.append('thumbnail', new Blob([thumbnailBuffer], { type: 'image/webp' }), 'thumb.webp');
        }

        if (req.body.description) {
            formData.append('description', req.body.description);
        }

        const record = await pb.collection('photos').create(formData);

        res.json({
            success: true,
            id: record.id,
            optimization: {
                originalSize: Math.round(req.file.buffer.length / 1024),
                optimizedSize: Math.round(optimizedBuffer.length / 1024),
                savings: Math.round((1 - optimizedBuffer.length / req.file.buffer.length) * 100)
            }
        });
    } catch (err) {
        console.error('❌ Eroare la upload:', err);
        res.status(500).json({ error: 'Eroare la upload: ' + err.message });
    }
});

export default app;