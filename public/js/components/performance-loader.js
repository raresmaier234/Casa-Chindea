/**
 * Performance Loader v1.0
 * Optimizes resource loading and improves FCP/LCP
 * Load this FIRST in the <head> for best results
 */

(function() {
    'use strict';

    // Performance timing
    window.perfMetrics = {
        start: performance.now(),
        domReady: 0,
        contentLoaded: 0
    };

    // Detect connection quality
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = connection && (
        connection.saveData ||
        connection.effectiveType === '2g' ||
        connection.effectiveType === 'slow-2g'
    );
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Expose for other scripts
    window.perfConfig = {
        isSlowConnection,
        isMobile,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        imageQuality: isSlowConnection ? 'low' : 'high',
        lazyLoadThreshold: isSlowConnection ? '100px' : '300px'
    };

    // Reduce animations on slow connections
    if (isSlowConnection || window.perfConfig.reducedMotion) {
        const style = document.createElement('style');
        style.id = 'perf-reduce-motion';
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            .skeleton-image, [class*="skeleton"], .animate-pulse {
                animation: none !important;
                background: #e5e7eb !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Lazy load images with Intersection Observer
    window.lazyLoadImages = function() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                delete img.dataset.src;
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        delete img.dataset.src;
                    }
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: window.perfConfig.lazyLoadThreshold,
            threshold: 0.01
        });

        document.querySelectorAll('img[data-src], img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    };

    // Defer non-critical CSS
    window.loadDeferredCSS = function(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.media = 'print';
        link.onload = function() {
            this.media = 'all';
        };
        document.head.appendChild(link);
    };

    // Preload critical resources
    window.preloadResource = function(href, type, crossorigin = true) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = type;
        if (crossorigin) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    };

    // Track DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.perfMetrics.domReady = performance.now() - window.perfMetrics.start;
            window.lazyLoadImages();
        });
    } else {
        window.perfMetrics.domReady = performance.now() - window.perfMetrics.start;
        window.lazyLoadImages();
    }

    // Track full load
    window.addEventListener('load', () => {
        window.perfMetrics.contentLoaded = performance.now() - window.perfMetrics.start;

        // Log performance in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('⚡ Performance:', {
                domReady: Math.round(window.perfMetrics.domReady) + 'ms',
                fullLoad: Math.round(window.perfMetrics.contentLoaded) + 'ms',
                connection: connection?.effectiveType || 'unknown',
                mobile: isMobile
            });
        }
    });

    // Request idle callback for non-critical tasks
    window.runWhenIdle = function(callback, timeout = 2000) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, 100);
        }
    };

    // Batch DOM updates
    window.batchDOMUpdates = function(updates) {
        requestAnimationFrame(() => {
            updates.forEach(fn => fn());
        });
    };

})();

