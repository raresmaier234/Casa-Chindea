/**
 * API Configuration — Auto-prefix for production
 *
 * On production (Vercel), all /api/ requests are automatically
 * redirected to api.casachindea.ro via fetch interception.
 * On local development, requests go to the same origin (no prefix).
 *
 * This script MUST be loaded before any other script that makes API calls.
 */
(function () {
    // Prevent double initialization
    if (window.__apiConfigLoaded) return;
    window.__apiConfigLoaded = true;

    const hostname = window.location.hostname;
    const isProduction = (
        hostname === 'casachindea.ro' ||
        hostname === 'www.casachindea.ro' ||
        hostname.endsWith('.vercel.app')
    );

    const API_BASE = isProduction ? 'https://api.casachindea.ro' : '';
    window.API_BASE = API_BASE;

    // Helper: build a full API URL (for image src, etc.)
    // Usage: window.apiUrl('/api/files/...') → 'https://api.casachindea.ro/api/files/...'
    window.apiUrl = function (path) {
        if (path && path.startsWith('/api/')) {
            return API_BASE + path;
        }
        return path;
    };

    if (!API_BASE) return; // Local dev — no patching needed

    // Patch global fetch to auto-prefix /api/ paths
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
            input = API_BASE + input;
        } else if (input instanceof Request) {
            try {
                const url = new URL(input.url);
                if (url.pathname.startsWith('/api/')) {
                    input = new Request(API_BASE + url.pathname + url.search, input);
                }
            } catch (e) { /* ignore invalid URLs */ }
        }
        return originalFetch.call(this, input, init);
    };
})();
