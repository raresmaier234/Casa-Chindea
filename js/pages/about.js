// About page template
const about = `
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-bold text-gray-900 mb-6">Despre Casa Chindea</h1>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    Refugiul perfect pentru cei care caută liniștea și frumusețea naturii montane
                </p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                <div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-6">Povestea Noastră</h2>
                    <div class="space-y-4 text-gray-600 text-lg">
                        <p>
                            Casa Chindea s-a născut din pasiunea pentru natură și dorința de a oferi oaspeților 
                            o experiență autentică în mijlocul peisajelor spectaculoase ale Hășmașului Mare.
                        </p>
                        <p>
                            Situată strategic la poalele munților, casa noastră oferă accesul perfect către 
                            cele mai frumoase trasee montane și atracții naturale din zonă, fiind în același 
                            timp un refugiu liniștit unde te poți relaxa după o zi plină de aventuri.
                        </p>
                        <p>
                            Fiecare detaliu a fost gândit pentru confortul și satisfacția oaspeților noștri, 
                            de la camerele spațioase cu priveliști panoramice până la facilitățile moderne 
                            care fac șederea ta memorabilă.
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <img src="https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400" 
                         alt="Casa Chindea exterior" class="rounded-lg shadow-lg">
                    <img src="https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=400" 
                         alt="Peisaj montan" class="rounded-lg shadow-lg mt-8">
                    <img src="https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=400" 
                         alt="Interior confortabil" class="rounded-lg shadow-lg -mt-8">
                    <img src="https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=400" 
                         alt="Terasă cu priveliște" class="rounded-lg shadow-lg">
                </div>
            </div>
            <!-- Facilities -->
            <div class="bg-gray-50 rounded-2xl p-12">
                <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">Facilitățile Noastre</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-bed"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">6 Camere Duble</h3>
                        <p class="text-gray-600">Camere spațioase cu baie proprie și terasă panoramică</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-utensils"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">Bucătărie Utilată</h3>
                        <p class="text-gray-600">Bucătărie complet echipată pentru prepararea meselor</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-couch"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">Living Generos</h3>
                        <p class="text-gray-600">Spațiu de relaxare confortabil pentru toți oaspeții</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-fire"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">Foișor & Grătar</h3>
                        <p class="text-gray-600">Foișor închis cu grătar și sobă pentru ceaun</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-wifi"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">Wi-Fi Rapid</h3>
                        <p class="text-gray-600">Internet wireless gratuit în toată locația</p>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-car"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">Parcare Privată</h3>
                        <p class="text-gray-600">Locuri de parcare sigure pentru oaspeți</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
`;

export default about;
