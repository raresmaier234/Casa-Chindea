// CMS Content Loader v3.0 - Optimized for Production with Preload Support
// Loads dynamic content from PocketBase with instant rendering

(function () {
    'use strict';

    // Cache for CMS content (sessionStorage for faster subsequent loads)
    const CMS_CACHE_KEY = 'cms_cache_';
    const CMS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

    // Get page name from URL
    function getPageName() {
        return window.location.pathname.split('/').pop().replace('.html', '') || 'home';
    }

    // Get cached content
    function getCachedContent(pageName) {
        try {
            const cached = sessionStorage.getItem(CMS_CACHE_KEY + pageName);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CMS_CACHE_DURATION) {
                    return data.sections;
                }
            }
        } catch (e) { }
        return null;
    }

    // Set cached content
    function setCachedContent(pageName, sections) {
        try {
            sessionStorage.setItem(CMS_CACHE_KEY + pageName, JSON.stringify({
                timestamp: Date.now(),
                sections: sections
            }));
        } catch (e) { }
    }

    // Apply content to element
    function applyContent(elem, section) {
        if (!elem) return;

        if ((section.type === 'image' || section.type === 'background') && section.imageUrl) {
            if (elem.tagName === 'IMG') {
                // For images with skeleton overlay, load smoothly
                const newImg = new Image();
                newImg.onload = function () {
                    elem.src = section.imageUrl;
                    elem.classList.add('opacity-100', 'cms-loaded');
                    // Hide skeleton overlay if exists
                    const skeleton = elem.previousElementSibling;
                    if (skeleton && skeleton.classList.contains('about-img-skeleton')) {
                        skeleton.style.display = 'none';
                    }
                };
                newImg.src = section.imageUrl;
                if (section.content) elem.alt = section.content;
            } else {
                elem.style.backgroundImage = `url(${section.imageUrl})`;
                elem.style.backgroundSize = 'cover';
                elem.style.backgroundPosition = 'center';
                elem.classList.add('cms-loaded');
            }
        } else if (section.content) {
            if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                elem.value = section.content;
            } else {
                elem.textContent = section.content;
            }
            elem.classList.add('cms-loaded');
        } else {
            elem.classList.add('cms-loaded');
        }
    }

    // Find element by key
    function findElement(key) {
        return document.getElementById(`cms-${key}`) ||
            document.getElementById(key) ||
            document.querySelector(`[id$="${key}"]`);
    }

    // Apply all sections to page
    function applySections(sections, pageName) {
        const pageSections = sections.filter(s => s.page === pageName);

        pageSections.forEach(section => {
            const elem = findElement(section.key);
            if (elem) {
                applyContent(elem, section);
            }
        });
    }

    // Generate IDs for elements without them
    function assignCMSIds() {
        document.querySelectorAll('h1, h2, h3').forEach(elem => {
            if (!elem.id && elem.closest('main, section, article')) {
                const text = elem.textContent.trim().substring(0, 30);
                elem.id = `cms-heading-${text.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
            }
        });

        document.querySelectorAll('main p, section p, article p, [class*="description"] p').forEach((elem, idx) => {
            if (!elem.id && elem.textContent.trim().length > 20) {
                elem.id = `cms-paragraph-${idx}`;
            }
        });

        document.querySelectorAll('main img, section img, article img, [class*="hero"] img').forEach((elem, idx) => {
            if (!elem.id) elem.id = `cms-image-${idx}`;
        });

        document.querySelectorAll('[style*="background-image"]').forEach((elem, idx) => {
            if (!elem.id) elem.id = `cms-bg-${idx}`;
        });
    }

    // Main load function - uses pre-fetched data if available
    async function loadCMSContent(pageName) {
        pageName = pageName || getPageName();

        // Try cache first for instant rendering
        const cached = getCachedContent(pageName);
        if (cached) {
            applySections(cached, pageName);
            markAllCMSElementsLoaded();
            return; // Use cache, skip fetch
        }

        // Try pre-fetched data from window._cmsPromise
        try {
            let data;
            if (window._cmsPromise) {
                if (window._cmsPromise instanceof Promise) {
                    data = await window._cmsPromise;
                } else {
                    data = window._cmsPromise;
                }
            }

            // Fallback to fresh fetch if no pre-fetched data
            if (!data) {
                const response = await fetch(`/api/admin/cms/sections?page=${pageName}`);
                data = await response.json();
            }

            if (data && data.success && data.sections && data.sections.length > 0) {
                setCachedContent(pageName, data.sections);
                applySections(data.sections, pageName);
            }
        } catch (e) {
            // Silent fail - use default content
        }

        // Mark all CMS elements as loaded to remove skeleton
        markAllCMSElementsLoaded();
    }

    // Mark all CMS elements as loaded and load default images
    function markAllCMSElementsLoaded() {
        document.querySelectorAll('[id^="cms-"]').forEach(elem => {
            // For images that weren't updated by CMS, just mark as loaded (keep skeleton visible)
            if (elem.tagName === 'IMG' && !elem.classList.contains('cms-loaded')) {
                // Don't load placeholder images - keep skeleton visible until real image loads
                // Only mark as loaded if there's no skeleton overlay
                const skeleton = elem.previousElementSibling;
                if (!skeleton || !skeleton.classList.contains('about-img-skeleton')) {
                    elem.classList.add('cms-loaded');
                }
            } else {
                elem.classList.add('cms-loaded');
            }
        });

        // Handle about-lazy-img - don't load placeholders, keep skeleton
        document.querySelectorAll('.about-lazy-img').forEach(img => {
            // Don't auto-load placeholder - wait for CMS image
        });

        // Handle offer-lazy-img - don't load placeholders, keep skeleton
        document.querySelectorAll('.offer-lazy-img').forEach(img => {
            // Don't auto-load placeholder - wait for real image
        });
    }

    // Initialize immediately when script loads
    function init() {
        const pageName = getPageName();

        // Try to apply cached content immediately (before DOM ready)
        const cached = getCachedContent(pageName);

        // Fallback: mark all elements as loaded after 3s max (prevents infinite skeleton)
        setTimeout(markAllCMSElementsLoaded, 3000);

        if (document.readyState === 'loading') {
            // DOM not ready yet - wait for it
            document.addEventListener('DOMContentLoaded', function () {
                assignCMSIds();
                if (cached) {
                    applySections(cached, pageName);
                }
                // Load fresh content
                loadCMSContent(pageName);
            });
        } else {
            // DOM already ready
            assignCMSIds();
            if (cached) {
                applySections(cached, pageName);
            }
            loadCMSContent(pageName);
        }
    }

    // Expose function globally for manual calls
    window.loadCMSContent = loadCMSContent;
    window.assignCMSIds = assignCMSIds;

    // Start immediately
    init();
})();

