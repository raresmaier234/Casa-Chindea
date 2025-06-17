// Contact page template
const contact = `
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">Contact</h1>
                <p class="text-xl text-gray-600">Suntem aici să te ajutăm cu orice întrebare</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Contact Info -->
                <div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">Informații de Contact</h2>
                    <div class="space-y-6">
                        <div class="flex items-start">
                            <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Adresa</h3>
                                <p class="text-gray-600">Hășmaș, județul Harghita<br>România</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-phone"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Telefon</h3>
                                <p class="text-gray-600">+40 XXX XXX XXX</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-envelope"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Email</h3>
                                <p class="text-gray-600">contact@casachindea.ro</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Program</h3>
                                <p class="text-gray-600">Check-in: 15:00<br>Check-out: 11:00</p>
                            </div>
                        </div>
                    </div>
                    <!-- Social Media -->
                    <div class="mt-12">
                        <h3 class="text-xl font-bold text-gray-900 mb-6">Urmărește-ne</h3>
                        <div class="flex space-x-4">
                            <a href="#" class="bg-primary hover:bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" class="bg-primary hover:bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                                <i class="fab fa-instagram"></i>
                            </a>
                            <a href="#" class="bg-primary hover:bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                                <i class="fab fa-tiktok"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <!-- Contact Form -->
                <div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">Trimite-ne un Mesaj</h2>
                    <form id="contact-form" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nume</label>
                            <input type="text" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Subiect</label>
                            <input type="text" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mesaj</label>
                            <textarea rows="6" required class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
                        </div>
                        <button type="submit" class="w-full bg-primary hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                            Trimite Mesajul
                        </button>
                    </form>
                </div>
            </div>
            <!-- Map -->
            <div class="mt-20">
                <h2 class="text-3xl font-bold text-center text-gray-900 mb-8">Locația pe Hartă</h2>
                <div class="h-96 bg-gray-300 rounded-lg overflow-hidden">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2777.8!2d25.9!3d46.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDbCsDQyJzAwLjAiTiAyNcKwNTQnMDAuMCJF!5e0!3m2!1sen!2sro!4v1234567890"
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allowfullscreen="" 
                        loading="lazy">
                    </iframe>
                </div>
            </div>
        </div>
    </section>
`;

export default contact;
