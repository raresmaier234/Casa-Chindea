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
                // mark as loaded immediately for background images
                elem.classList.add('cms-loaded');
            }
        } else if (section.content) {
            if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                elem.value = section.content;
            } else {
                elem.textContent = section.content;
            }
            // Don't reveal immediately — mark as applied and let the loader reveal after fetch completes
            elem.setAttribute('data-cms-applied', 'true');
        } else {
            // For elements without explicit content, mark as applied so they will be revealed when loader finishes
            elem.setAttribute('data-cms-applied', 'true');
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
        // Track fetch start time to adapt fade duration
        let fetchStartedAt = Date.now();
        if (cached) {
            applySections(cached, pageName);
            // Reveal immediately when using cache (fast path)
            markAllCMSElementsLoaded(true);
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

        // Choose fade duration based on how long the fetch took
        try {
            const fetchDuration = Date.now() - fetchStartedAt;
            let fade = '0.5s';
            if (fetchDuration < 200) fade = '0.18s';
            else if (fetchDuration < 600) fade = '0.35s';
            else if (fetchDuration < 1500) fade = '0.5s';
            else fade = '0.75s';
            document.documentElement.style.setProperty('--cms-fade-duration', fade);
        } catch (e) { }

        // Mark all CMS elements as loaded and reveal applied content now that fetch is finished
        markAllCMSElementsLoaded(true);
    }

    // Mark all CMS elements as loaded and load default images
    function markAllCMSElementsLoaded(fetchCompleted) {
        // If fetchCompleted is true we reveal applied content; otherwise behave conservatively
        document.querySelectorAll('[id^="cms-"]').forEach(elem => {
            // Images: if IMG and not already loaded by CMS, only mark loaded when safe
            if (elem.tagName === 'IMG') {
                if (!elem.classList.contains('cms-loaded')) {
                    const skeleton = elem.previousElementSibling;
                    if (!skeleton || !skeleton.classList.contains('about-img-skeleton')) {
                        // no overlay skeleton — reveal immediately
                        elem.classList.add('cms-loaded');
                    }
                    // if there's a skeleton overlay, we leave it until an actual image load triggers reveal
                }
            } else {
                // Non-image elements: reveal only if content was applied or fetch completed
                if (fetchCompleted) {
                    // Reveal elements that have been applied by CMS
                    if (elem.hasAttribute('data-cms-applied')) {
                        // Use double RAF to ensure browser painted the new content before fading in
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            elem.classList.add('cms-loaded');
                            elem.removeAttribute('data-cms-applied');
                        }));
                    } else {
                        // No specific CMS content applied — safe to reveal
                        elem.classList.add('cms-loaded');
                    }
                } else {
                    // Conservative path: if not sure, leave as-is to allow skeleton to show
                }
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
        setTimeout(markAllCMSElementsLoaded, 5000);

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
