// CMS Content Loader - loads dynamic content from PocketBase
// Include this in any page that needs CMS content

// Generate consistent IDs for elements (same logic as visual-editor)
function assignCMSIds() {
    // Assign IDs to headings
    document.querySelectorAll('h1, h2, h3').forEach(elem => {
        if (!elem.id && elem.closest('main, section, article')) {
            const text = elem.textContent.trim().substring(0, 30);
            elem.id = `cms-heading-${text.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
        }
    });

    // Assign IDs to paragraphs
    document.querySelectorAll('main p, section p, article p, [class*="description"] p').forEach((elem, idx) => {
        if (!elem.id && elem.textContent.trim().length > 20) {
            elem.id = `cms-paragraph-${idx}`;
        }
    });

    // Assign IDs to images
    document.querySelectorAll('main img, section img, article img, [class*="hero"] img, [class*="gallery"] img').forEach((elem, idx) => {
        if (!elem.id) {
            elem.id = `cms-image-${idx}`;
        }
    });

    // Assign IDs to background images
    document.querySelectorAll('[style*="background-image"]').forEach((elem, idx) => {
        if (!elem.id) {
            elem.id = `cms-bg-${idx}`;
        }
    });
}

async function loadCMSContent(pageName) {
    try {
        const response = await fetch(`/api/admin/cms/sections?page=${pageName}`);
        const data = await response.json();

        if (data.success && data.sections && data.sections.length > 0) {
            // Filter only sections for this specific page
            const pageSections = data.sections.filter(s => s.page === pageName);

            pageSections.forEach(section => {
                // Try multiple ways to find the element
                let elem = document.getElementById(`cms-${section.key}`) ||
                           document.getElementById(section.key);

                // Search all elements with matching ID pattern - exact matches only
                if (!elem) {
                    const allCmsElements = document.querySelectorAll('[id^="cms-"]');
                    for (const el of allCmsElements) {
                        if (el.id === `cms-${section.key}` || el.id === section.key) {
                            elem = el;
                            break;
                        }
                    }
                }

                if (elem) {
                    if ((section.type === 'image' || section.type === 'background') && section.imageUrl) {
                        if (elem.tagName === 'IMG') {
                            elem.src = section.imageUrl + '?t=' + Date.now();
                            if (section.content) {
                                elem.alt = section.content;
                            }
                        } else {
                            elem.style.backgroundImage = `url(${section.imageUrl}?t=${Date.now()})`;
                            elem.style.backgroundSize = 'cover';
                            elem.style.backgroundPosition = 'center';
                        }
                    } else if (section.content) {
                        if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                            elem.value = section.content;
                        } else {
                            elem.textContent = section.content;
                        }
                    }
                }
            });
        }
    } catch (error) {
        // CMS content loading failed silently
    }
}

// Auto-load CMS content based on current page
async function autoLoadCMSContent() {
    // First, assign IDs to elements
    assignCMSIds();

    // Small delay to ensure all elements are rendered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Then load CMS content
    const pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'home';
    await loadCMSContent(pageName);
}

// Run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', autoLoadCMSContent);

