// Rooms page template
const rooms = `
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">Camerele Noastre</h1>
                <p class="text-xl text-gray-600">Confort și eleganță în fiecare cameră</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Room 1 -->
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <img src="https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600" 
                         alt="Camera dublă standard" class="w-full h-64 object-cover">
                    <div class="p-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">Camera Dublă Standard</h3>
                        <div class="space-y-2 text-gray-600 mb-6">
                            <div class="flex items-center">
                                <i class="fas fa-users text-primary mr-3"></i>
                                <span>2 persoane</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-bed text-primary mr-3"></i>
                                <span>Pat dublu confortabil</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-bath text-primary mr-3"></i>
                                <span>Baie privată</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-mountain text-primary mr-3"></i>
                                <span>Terasă cu priveliște</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-3xl font-bold text-primary">150 RON/noapte</span>
                            <button onclick="loadPage('booking')" class="bg-primary hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
                                Rezervă
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Room 2 -->
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <img src="https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=600" 
                         alt="Camera dublă premium" class="w-full h-64 object-cover">
                    <div class="p-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-4">Camera Dublă Premium</h3>
                        <div class="space-y-2 text-gray-600 mb-6">
                            <div class="flex items-center">
                                <i class="fas fa-users text-primary mr-3"></i>
                                <span>2 persoane</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-bed text-primary mr-3"></i>
                                <span>Pat dublu king size</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-bath text-primary mr-3"></i>
                                <span>Baie premium cu jacuzzi</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-mountain text-primary mr-3"></i>
                                <span>Terasă panoramică</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-3xl font-bold text-primary">200 RON/noapte</span>
                            <button onclick="loadPage('booking')" class="bg-primary hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
                                Rezervă
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Room Features -->
            <div class="mt-20 bg-gray-50 rounded-2xl p-12">
                <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">Toate Camerele Includ</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div class="text-center">
                        <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-wifi text-2xl"></i>
                        </div>
                        <h4 class="font-semibold">Wi-Fi Gratuit</h4>
                    </div>
                    <div class="text-center">
                        <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-tv text-2xl"></i>
                        </div>
                        <h4 class="font-semibold">TV LED</h4>
                    </div>
                    <div class="text-center">
                        <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-snowflake text-2xl"></i>
                        </div>
                        <h4 class="font-semibold">Aer Condiționat</h4>
                    </div>
                    <div class="text-center">
                        <div class="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-coffee text-2xl"></i>
                        </div>
                        <h4 class="font-semibold">Set Ceai/Cafea</h4>
                    </div>
                </div>
            </div>
        </div>
    </section>
`;

export default rooms;
