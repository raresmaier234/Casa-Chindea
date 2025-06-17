import { loadHomePhotos, loadGalleryPhotos, uploadPhotos } from './components/gallery.js';
import { initBookingForm, updateBookingSummary, handleBookingSubmit } from './components/booking.js';
import { initContactForm, handleContactSubmit } from './components/contact.js';
import pages from './pages/index.js';

// Navigation functionality
function loadPage(pageName) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = pages[pageName] || pages.home;
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('text-primary', 'font-bold');
        if (link.dataset.page === pageName) {
            link.classList.add('text-primary', 'font-bold');
        }
    });
    // Close mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');
    // Scroll to top
    window.scrollTo(0, 0);
    // Load page-specific content
    if (pageName === 'home') {
        loadHomePhotos();
    } else if (pageName === 'gallery') {
        loadGalleryPhotos();
        // Attach upload handler if present
        const uploadBtn = document.querySelector('#photo-upload ~ button');
        if (uploadBtn) uploadBtn.onclick = uploadPhotos;
    } else if (pageName === 'booking') {
        initBookingForm();
    } else if (pageName === 'contact') {
        initContactForm();
    }
}

// Initialize app
window.addEventListener('DOMContentLoaded', function () {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
        });
    }
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;
            loadPage(page);
        });
    });
    // Load home page by default
    loadPage('home');
});

// Expose for inline HTML event handlers
window.loadPage = loadPage;
window.uploadPhotos = uploadPhotos;
