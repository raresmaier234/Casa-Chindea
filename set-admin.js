// set-admin.js - Script pentru a seta un utilizator ca admin
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pb = new PocketBase(process.env.POCKET_BASE_URL || 'https://casa-chindea.fly.dev');

async function setUserAsAdmin(userEmail) {
    try {
        // Găsește utilizatorul după email
        const users = await pb.collection('users').getFullList({
            filter: `email = "${userEmail}"`
        });
        
        if (users.length === 0) {
            return;
        }
        
        const user = users[0];

        if (user.admin) {
            return;
        }
        
        // Actualizează utilizatorul să fie admin
        const updatedUser = await pb.collection('users').update(user.id, {
            admin: true
        });
    } catch (err) {

    }
}

// Schimbă cu email-ul tău
const userEmail = process.env.PB_ADMIN_EMAIL || 'raresmaier123@gmail.com';
setUserAsAdmin(userEmail);
