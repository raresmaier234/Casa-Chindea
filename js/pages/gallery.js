import pb from '../pb.js';

// Gallery page template (string only, for navigation)
const gallery = `
<section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h1 class="text-5xl font-bold text-gray-900 mb-6">Galeria Foto</h1>
            <p class="text-xl text-gray-600">Descoperă frumusețea Casei Chindea</p>
        </div>
        <div id="full-gallery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Photos will be loaded here -->
        </div>
        <div class="mt-16 bg-gray-50 rounded-2xl p-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-6">Adaugă Poze Noi</h3>
            <div class="flex flex-col space-y-4">
                <input type="file" id="photo-upload" accept="image/*" multiple class="border border-gray-300 rounded-lg p-3">
                <button onclick="uploadPhotos()" class="bg-primary hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                    Încarcă Pozele
                </button>
            </div>
        </div>
    </div>
</section>
`;

export default gallery;

// Load photos for home page
export async function loadHomePhotos() {
    try {
        const photos = await pb.collection('photos').getList(1, 6);
        const gallery = document.getElementById('photo-gallery');
        if (photos.items.length > 0) {
            gallery.innerHTML = photos.items.map(photo => `
                <div class="relative overflow-hidden rounded-lg shadow-lg group cursor-pointer">
                    <img src="${pb.files.getUrl(photo, photo.image)}" 
                         alt="Casa Chindea" 
                         class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300"></div>
                </div>
            `).join('');
        } else {
            // Fallback images
            const fallbackImages = [
                'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=600',
                'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=600',
                'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600',
                'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg?auto=compress&cs=tinysrgb&w=600',
                'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600',
                'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=600'
            ];
            gallery.innerHTML = fallbackImages.map((src, index) => `
                <div class="relative overflow-hidden rounded-lg shadow-lg group cursor-pointer">
                    <img src="${src}" 
                         alt="Casa Chindea ${index + 1}" 
                         class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300"></div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

// Load photos for gallery page
export async function loadGalleryPhotos() {
    try {
        const photos = await pb.collection('photos').getList(1, 50);
        const gallery = document.getElementById('full-gallery');
        if (photos.items.length > 0) {
            gallery.innerHTML = photos.items.map(photo => `
                <div class="relative overflow-hidden rounded-lg shadow-lg group cursor-pointer">
                    <img src="${pb.files.getUrl(photo, photo.image)}" 
                         alt="Casa Chindea" 
                         class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                        <i class="fas fa-expand text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                    </div>
                </div>
            `).join('');
        } else {
            gallery.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">Nu există poze încărcate încă.</p>
                    <p class="text-gray-400">Folosește formularul de mai jos pentru a adăuga poze.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading gallery photos:', error);
    }
}

// Upload photos function
export async function uploadPhotos() {
    const fileInput = document.getElementById('photo-upload');
    const files = fileInput.files;
    if (files.length === 0) {
        alert('Te rog selectează cel puțin o poză.');
        return;
    }
    try {
        for (let file of files) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('title', file.name);
            await pb.collection('photos').create(formData);
        }
        alert('Pozele au fost încărcate cu succes!');
        fileInput.value = '';
        loadGalleryPhotos();
    } catch (error) {
        console.error('Error uploading photos:', error);
        alert('Eroare la încărcarea pozelor. Te rog încearcă din nou.');
    }
}
