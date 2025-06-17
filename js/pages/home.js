// Home page template
const home = `
    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center bg-gradient-to-r from-primary to-secondary">
        <div class="absolute inset-0 bg-black opacity-40"></div>
        <div class="relative z-10 text-center text-white px-4">
            <h1 class="text-5xl md:text-7xl font-bold mb-6">Casa Chindea</h1>
            <p class="text-xl md:text-2xl mb-8">Refugiul tău în inima naturii</p>
            <button onclick="loadPage('booking')" class="bg-accent hover:bg-green-400 text-gray-900 font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105">
                Rezervă Acum
            </button>
        </div>
        <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <i class="fas fa-chevron-down text-white text-2xl"></i>
        </div>
    </section>
    <!-- Features Section -->
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">De ce să alegi Casa Chindea?</h2>
                <p class="text-xl text-gray-600">Experiența perfectă în mijlocul naturii</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div class="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300">
                    <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-mountain text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Peisaje Spectaculoase</h3>
                    <p class="text-gray-600">Priveliști uimitoare către Hășmașul Mare</p>
                </div>
                <div class="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300">
                    <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-bed text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Camere Confortabile</h3>
                    <p class="text-gray-600">6 camere duble cu baie proprie și terasă</p>
                </div>
                <div class="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300">
                    <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-fire text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Foișor & Grătar</h3>
                    <p class="text-gray-600">Spațiu perfect pentru relaxare și mese în aer liber</p>
                </div>
                <div class="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300">
                    <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-car text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">Acces Facil</h3>
                    <p class="text-gray-600">Drum asfaltat și parcare privată</p>
                </div>
            </div>
        </div>
    </section>
    <!-- Photo Gallery Preview -->
    <section class="py-20 bg-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">Galerie Foto</h2>
                <p class="text-xl text-gray-600">Descoperă frumusețea Casei Chindea</p>
            </div>
            <div id="photo-gallery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Photos will be loaded here -->
            </div>
            <div class="text-center mt-8">
                <button onclick="loadPage('gallery')" class="bg-primary hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    Vezi Toate Pozele
                </button>
            </div>
        </div>
    </section>
    <!-- Location Section -->
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">Locația Noastră</h2>
                <p class="text-xl text-gray-600">În inima Hășmașului, la doar 3.8 km de Lacul Roșu</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h3 class="text-2xl font-bold mb-6">Aproape de Atracțiile Principale</h3>
                    <div class="space-y-4">
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt text-primary mr-3"></i>
                            <span>Lacul Roșu - 3.8 km</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt text-primary mr-3"></i>
                            <span>Cheile Bicazului - 15 km</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt text-primary mr-3"></i>
                            <span>Piatra Singuratică - 8 km</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt text-primary mr-3"></i>
                            <span>Trasee montane - la poarta casei</span>
                        </div>
                    </div>
                </div>
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

export default home;
