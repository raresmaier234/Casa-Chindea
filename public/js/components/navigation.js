// Shared navigation functionality for Casa Chindea
class CasaChindeaNav {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupMobileMenu();
        this.updateNavigation();
    }

    checkAuthentication() {
        const token = sessionStorage.getItem('auth_token');
        const userInfo = sessionStorage.getItem('user_info');

        if (token && userInfo) {
            try {
                this.currentUser = JSON.parse(userInfo);
            } catch (err) {
                console.error('Error parsing user info:', err);
                this.clearAuthData();
            }
        }
    }

    clearAuthData() {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_info');
        this.currentUser = null;
    }

    updateNavigation() {
        const desktopNav = document.querySelector('#desktop-nav') || document.querySelector('.hidden.md\\:flex');
        const mobileNav = document.querySelector('#mobile-nav') || document.querySelector('#mobile-menu .space-y-1');

        if (!desktopNav || !mobileNav) return;

        // Remove existing auth elements first
        this.removeExistingAuthElements(desktopNav, mobileNav);

        // Update desktop navigation
        const desktopAuthElement = this.currentUser
            ? this.createAuthenticatedDesktopNav()
            : this.createUnauthenticatedDesktopNav();

        desktopNav.appendChild(desktopAuthElement);

        // Update mobile navigation
        const mobileAuthElement = this.currentUser
            ? this.createAuthenticatedMobileNav()
            : this.createUnauthenticatedMobileNav();

        mobileNav.appendChild(mobileAuthElement);
    }

    removeExistingAuthElements(desktopNav, mobileNav) {
        // Remove from desktop nav
        const desktopAuthElements = desktopNav.querySelectorAll('.auth-element, [href*="login"], [href*="profile"], [href*="admin"]');
        desktopAuthElements.forEach(el => {
            if (el.textContent.includes('Login') ||
                el.textContent.includes('Logout') ||
                el.textContent.includes('Profil') ||
                el.textContent.includes('Admin Dashboard')) {
                el.remove();
            }
        });

        // Remove from mobile nav
        const mobileAuthElements = mobileNav.querySelectorAll('.auth-element, [href*="login"], [href*="profile"], [href*="admin"]');
        mobileAuthElements.forEach(el => {
            if (el.textContent.includes('Login') ||
                el.textContent.includes('Logout') ||
                el.textContent.includes('Profil') ||
                el.textContent.includes('Admin Dashboard')) {
                el.remove();
            }
        });
    }

    createAuthenticatedDesktopNav() {
        const element = document.createElement('div');
        element.className = 'relative auth-element';

        // Check if user is admin
        const isAdmin = this.currentUser.admin === true;

        element.innerHTML = `
            <button id="profile-dropdown" 
                class="flex items-center space-x-2 text-primary font-semibold hover:text-secondary transition-colors duration-200">
                <i class="fas fa-user-circle"></i>
                <span>${this.currentUser.name || 'Profil'}</span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div id="dropdown-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <a href="/js/pages/profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-user mr-2"></i>Profilul Meu
                </a>
                ${isAdmin ? `
                    <a href="/js/pages/admin.html" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <i class="fas fa-cog mr-2"></i>Admin Dashboard
                    </a>
                ` : ''}
                <hr class="my-1">
                <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-sign-out-alt mr-2"></i>Logout
                </button>
            </div>
        `;

        // Add event listeners
        setTimeout(() => {
            const dropdown = element.querySelector('#profile-dropdown');
            const menu = element.querySelector('#dropdown-menu');
            const logoutBtn = element.querySelector('#logout-btn');

            if (dropdown && menu) {
                dropdown.addEventListener('click', () => {
                    menu.classList.toggle('hidden');
                });

                document.addEventListener('click', (e) => {
                    if (!element.contains(e.target)) {
                        menu.classList.add('hidden');
                    }
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.logout());
            }
        }, 100);

        return element;
    }

    createUnauthenticatedDesktopNav() {
        const element = document.createElement('a');
        element.href = '/js/pages/login.html';
        element.className = 'nav-link text-primary font-semibold hover:underline transition-colors duration-200 auth-element';
        element.textContent = 'Login';
        return element;
    }

    createAuthenticatedMobileNav() {
        const element = document.createElement('div');
        element.className = 'auth-element border-t border-gray-200 pt-3 mt-3';

        // Check if user is admin
        const isAdmin = this.currentUser.admin === true;

        element.innerHTML = `
            <a href="/js/pages/profile.html"
                class="nav-link block px-3 py-2 text-primary font-semibold hover:bg-gray-50 rounded-md">
                <i class="fas fa-user mr-2"></i>Profilul Meu
            </a>
            ${isAdmin ? `
                <a href="/js/pages/admin.html"
                    class="nav-link block px-3 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-md">
                    <i class="fas fa-cog mr-2"></i>Admin Dashboard
                </a>
            ` : ''}
            <button id="mobile-logout-btn"
                class="nav-link block px-3 py-2 text-red-600 font-semibold w-full text-left hover:bg-gray-50 rounded-md">
                <i class="fas fa-sign-out-alt mr-2"></i>Logout
            </button>
        `;

        setTimeout(() => {
            const logoutBtn = element.querySelector('#mobile-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.logout());
            }
        }, 100);

        return element;
    }

    createUnauthenticatedMobileNav() {
        const element = document.createElement('a');
        element.href = '/js/pages/login.html';
        element.className = 'nav-link block px-3 py-2 text-primary font-semibold hover:underline auth-element';
        element.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
        return element;
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            // Remove any existing event listeners to avoid duplicates
            mobileMenuBtn.removeEventListener('click', this.toggleMobileMenu);

            // Add new event listener
            this.toggleMobileMenu = () => {
                mobileMenu.classList.toggle('hidden');
            };

            mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    }

    logout() {
        this.clearAuthData();

        // Show success message briefly
        const logoutButtons = document.querySelectorAll('#logout-btn, #mobile-logout-btn');
        logoutButtons.forEach(btn => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Deconectat!';
            btn.className = btn.className.replace('text-gray-700', 'text-green-600').replace('text-red-600', 'text-green-600');
        });

        setTimeout(() => {
            window.location.href = '/js/pages/home.html';
        }, 1000);
    }

    // Function to manually refresh navigation (useful for debugging or after login)
    refreshNavigation() {
        this.checkAuthentication();
        this.updateNavigation();
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    window.casaChindeaNav = new CasaChindeaNav();

    // Debug function - accessible from browser console
    window.debugAuth = function () {
        const userInfo = sessionStorage.getItem('user_info');
        const token = sessionStorage.getItem('auth_token');
        console.log('=== AUTH DEBUG ===');
        console.log('Token exists:', !!token);
        console.log('User info:', userInfo ? JSON.parse(userInfo) : null);
        console.log('Current user in nav:', window.casaChindeaNav.currentUser);
        if (window.casaChindeaNav.currentUser) {
            console.log('Is admin?', window.casaChindeaNav.currentUser.admin === true);
        }
        console.log('==================');
    };

    // Function to force navigation refresh
    window.refreshNavigation = function () {
        window.casaChindeaNav.refreshNavigation();
        console.log('Navigation refreshed');
    };
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CasaChindeaNav;
}
