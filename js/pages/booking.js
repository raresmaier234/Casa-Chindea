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

// Booking page template
const booking = `
    <section class="py-20 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">Rezervare</h1>
                <p class="text-xl text-gray-600">Completează formularul pentru a face o rezervare</p>
            </div>
            <div class="bg-white rounded-2xl shadow-lg p-8">
                <form id="booking-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nume Complet</label>
                            <input type="text" id="full-name" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" id="email" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                            <input type="tel" id="phone" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Numărul de Persoane</label>
                            <select id="guests" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                                <option value="">Selectează</option>
                                <option value="1">1 persoană</option>
                                <option value="2">2 persoane</option>
                                <option value="3">3 persoane</option>
                                <option value="4">4 persoane</option>
                                <option value="5">5+ persoane</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Data Check-in</label>
                            <input type="date" id="checkin" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Data Check-out</label>
                            <input type="date" id="checkout" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipul Camerei</label>
                        <select id="room-type" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="">Selectează tipul camerei</option>
                            <option value="standard">Camera Dublă Standard - 150 RON/noapte</option>
                            <option value="premium">Camera Dublă Premium - 200 RON/noapte</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mesaj Suplimentar (opțional)</label>
                        <textarea id="message" rows="4" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Cerințe speciale, întrebări..."></textarea>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Rezumatul Rezervării</h3>
                        <div id="booking-summary" class="space-y-2 text-gray-600">
                            <p>Completează formularul pentru a vedea rezumatul</p>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-primary hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors duration-300">
                        Trimite Rezervarea
                    </button>
                </form>
            </div>
        </div>
    </section>
`;

export default booking;
