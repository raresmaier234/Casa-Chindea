// Booking form logic
import pb from '../pb.js';

export function initBookingForm() {
    const form = document.getElementById('booking-form');
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    const roomTypeSelect = document.getElementById('room-type');
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;
    checkinInput.addEventListener('change', function () {
        const checkinDate = new Date(this.value);
        checkinDate.setDate(checkinDate.getDate() + 1);
        checkoutInput.min = checkinDate.toISOString().split('T')[0];
        updateBookingSummary();
    });
    checkoutInput.addEventListener('change', updateBookingSummary);
    roomTypeSelect.addEventListener('change', updateBookingSummary);
    form.addEventListener('submit', handleBookingSubmit);
}

export function updateBookingSummary() {
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const roomType = document.getElementById('room-type').value;
    const summary = document.getElementById('booking-summary');
    if (checkin && checkout && roomType) {
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        const prices = { 'standard': 150, 'premium': 200 };
        const pricePerNight = prices[roomType];
        const totalPrice = nights * pricePerNight;
        summary.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span>Check-in:</span>
                    <span class="font-semibold">${new Date(checkin).toLocaleDateString('ro-RO')}</span>
                </div>
                <div class="flex justify-between">
                    <span>Check-out:</span>
                    <span class="font-semibold">${new Date(checkout).toLocaleDateString('ro-RO')}</span>
                </div>
                <div class="flex justify-between">
                    <span>Numărul de nopți:</span>
                    <span class="font-semibold">${nights}</span>
                </div>
                <div class="flex justify-between">
                    <span>Preț pe noapte:</span>
                    <span class="font-semibold">${pricePerNight} RON</span>
                </div>
                <div class="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span class="text-primary">${totalPrice} RON</span>
                </div>
            </div>
        `;
    }
}

export async function handleBookingSubmit(e) {
    e.preventDefault();
    const formData = {
        full_name: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        guests: document.getElementById('guests').value,
        checkin: document.getElementById('checkin').value,
        checkout: document.getElementById('checkout').value,
        room_type: document.getElementById('room-type').value,
        message: document.getElementById('message').value,
        status: 'pending'
    };
    try {
        await pb.collection('bookings').create(formData);
        alert('Rezervarea a fost trimisă cu succes! Vă vom contacta în curând pentru confirmare.');
        document.getElementById('booking-form').reset();
        document.getElementById('booking-summary').innerHTML = '<p>Completează formularul pentru a vedea rezumatul</p>';
    } catch (error) {
        console.error('Error submitting booking:', error);
        alert('Eroare la trimiterea rezervării. Te rog încearcă din nou.');
    }
}
