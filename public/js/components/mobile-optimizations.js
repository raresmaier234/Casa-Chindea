/**
 * Mobile Optimizations - Detects slow connections and optimizes fetch/cache behavior
 */

// Detect mobile and slow connections
const mobileOpts = {
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,

    get isSlowConnection() {
        if (this.connection) {
            return this.connection.saveData ||
                   this.connection.effectiveType === '2g' ||
                   this.connection.effectiveType === 'slow-2g' ||
                   this.connection.downlink < 1.5;
        }
        return this.isMobile; // Assume slow on mobile if no connection API
    },

    get cacheTTLMultiplier() {
        return this.isSlowConnection ? 2 : 1;
    },

    get fetchTimeout() {
        return this.isSlowConnection ? 8000 : 15000;
    },

    get earlyFetchTimeout() {
        return this.isMobile ? 3000 : 5000;
    }
};

// Optimized fetch with timeout and abort controller
function fetchWithTimeout(url, options = {}, timeoutMs = mobileOpts.fetchTimeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Add slow connection header for server-side optimization
    const headers = {
        ...options.headers,
        'X-Slow-Connection': mobileOpts.isSlowConnection ? 'true' : 'false'
    };

    return fetch(url, { ...options, headers, signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            return response;
        })
        .catch(err => {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Conexiune lentă - timpul de așteptare a expirat');
            }
            throw err;
        });
}

// Fetch with timeout that returns JSON
function fetchJsonWithTimeout(url, options = {}, timeoutMs = mobileOpts.fetchTimeout) {
    return fetchWithTimeout(url, options, timeoutMs)
        .then(r => r.json())
        .catch(() => null);
}

// Show slow connection indicator if element exists
function showSlowConnectionIndicator() {
    if (mobileOpts.isSlowConnection) {
        const indicator = document.getElementById('slow-connection-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }
}

// Add faster skeleton animation on mobile via CSS
function injectMobileSkeletonCSS() {
    if (mobileOpts.isMobile) {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 640px) {
                .skeleton, [class*="skeleton"], .skeleton-image {
                    animation-duration: 1s !important;
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        showSlowConnectionIndicator();
        injectMobileSkeletonCSS();
    });
} else {
    showSlowConnectionIndicator();
    injectMobileSkeletonCSS();
}

// Export for use in other scripts
window.mobileOpts = mobileOpts;
window.fetchWithTimeout = fetchWithTimeout;
window.fetchJsonWithTimeout = fetchJsonWithTimeout;

