// Contact form logic
import pb from '../pb.js';

export function initContactForm() {
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', handleContactSubmit);
}

export async function handleContactSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
        await pb.collection('messages').create(data);
        alert('Mesajul a fost trimis cu succes! Vă vom răspunde în curând.');
        e.target.reset();
    } catch (error) {
        console.error('Error submitting message:', error);
        alert('Eroare la trimiterea mesajului. Te rog încearcă din nou.');
    }
}
