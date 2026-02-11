#!/usr/bin/env node

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PB_URL = process.env.POCKET_BASE_URL || 'http://127.0.0.1:8090';

// Specific photos to upload
const photos = [
    {
        filename: '499130917_1378866240090631_6765327648581463029_n.jpg',
        description: 'Cabana',
        category: 'cottage'
    },
    {
        filename: '470544860_1267900121187244_2774741334736387792_n.jpg',
        description: 'Camera',
        category: 'room'
    },
    {
        filename: '499932112_1378866386757283_1325453586212782948_n.jpg',
        description: 'Camera',
        category: 'room'
    },
    {
        filename: '480554957_1308312703812652_6038427473654614767_n.jpg',
        description: 'Camera',
        category: 'room'
    }
];

async function uploadPhotos() {
    try {
        // Authenticate as admin

        const authResponse = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identity: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            })
        });

        if (!authResponse.ok) {
            const error = await authResponse.text();
            throw new Error(`Authentication failed: ${error}`);
        }

        const authData = await authResponse.json();
        const token = authData.token;

        // Get existing photos
        const listResponse = await fetch(`${PB_URL}/api/collections/photos/records`, {
            headers: {
                'Authorization': token
            }
        });

        if (listResponse.ok) {
            const existingData = await listResponse.json();
            const existingPhotos = existingData.items || [];

            // Delete existing specific photos
            for (const existingPhoto of existingPhotos) {
                const isSpecificPhoto = photos.some(p =>
                    existingPhoto.image && existingPhoto.image.includes(p.filename.replace('.jpg', ''))
                );
                if (isSpecificPhoto) {
                    await fetch(`${PB_URL}/api/collections/photos/records/${existingPhoto.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': token
                        }
                    });
                }
            }
        }

        // Upload each photo
        for (const photoInfo of photos) {
            const filePath = path.join(__dirname, photoInfo.filename);

            if (!fs.existsSync(filePath)) {
                continue;
            }

            const formData = new FormData();
            formData.append('image', fs.createReadStream(filePath));
            formData.append('description', photoInfo.description);
            formData.append('category', photoInfo.category);
            formData.append('isPublic', 'true');

            const uploadResponse = await fetch(`${PB_URL}/api/collections/photos/records`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    ...formData.getHeaders()
                },
                body: formData
            });

            if (uploadResponse.ok) {
                const record = await uploadResponse.json();
            } else {
                const error = await uploadResponse.text();
                console.error(`❌ Error uploading ${photoInfo.filename}:`, error);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

uploadPhotos();

