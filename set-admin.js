// set-admin.js - Script pentru a seta un utilizator ca admin
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pb = new PocketBase(process.env.POCKET_BASE_URL || 'https://casa-chindea.fly.dev');

async function setUserAsAdmin(userEmail) {
    try {
        console.log('🔍 Connecting to PocketBase:', process.env.POCKET_BASE_URL);
        
        // Găsește utilizatorul după email
        const users = await pb.collection('users').getFullList({
            filter: `email = "${userEmail}"`
        });
        
        if (users.length === 0) {
            console.error('❌ Utilizatorul cu email-ul', userEmail, 'nu a fost găsit');
            return;
        }
        
        const user = users[0];
        console.log('👤 Utilizator găsit:', { id: user.id, email: user.email, admin: user.admin });
        
        if (user.admin) {
            console.log('✅ Utilizatorul este deja admin');
            return;
        }
        
        // Actualizează utilizatorul să fie admin
        const updatedUser = await pb.collection('users').update(user.id, {
            admin: true
        });
        
        console.log('✅ Utilizatorul a fost setat ca admin:', {
            id: updatedUser.id,
            email: updatedUser.email,
            admin: updatedUser.admin
        });
        
    } catch (err) {
        console.error('❌ Eroare:', err.message);
        
        if (err.message.includes('Failed to fetch')) {
            console.error('💡 Verifică dacă PocketBase rulează la:', process.env.POCKET_BASE_URL);
        }
    }
}

// Schimbă cu email-ul tău
const userEmail = process.env.PB_ADMIN_EMAIL || 'raresmaier123@gmail.com';
setUserAsAdmin(userEmail);
