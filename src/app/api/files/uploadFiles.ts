import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const pb = new PocketBase('http://127.0.0.1:8090');
await pb.admins.authWithPassword('raresmaier123@gmail.com', 'sacalaseni234');

const uploadFolder = './casa-chindea';
const files = fs.readdirSync(uploadFolder);

for (const filename of files) {
    const filePath = path.join(uploadFolder, filename);
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath));

    await pb.collection('photos').create(formData);
}