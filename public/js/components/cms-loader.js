// CMS Content Loader - loads dynamic content from PocketBase
// Include this in any page that needs CMS content

async function loadCMSContent(pageName) {
    try {
        const response = await fetch(`/api/admin/cms/sections?page=${pageName}`);
        const data = await response.json();

        if (data.success && data.sections.length > 0) {
            data.sections.forEach(section => {
                const elemId = `cms-${section.key}`;
                const elem = document.getElementById(elemId);

                if (elem) {
                    if (section.type === 'image' && section.imageUrl) {
                        // For IMG elements
                        if (elem.tagName === 'IMG') {
                            elem.src = section.imageUrl;
                            if (section.content) {
                                elem.alt = section.content;
                            }
                        }
                        // For elements with background-image
                        else if (elem.style.backgroundImage !== undefined) {
                            elem.style.backgroundImage = `url(${section.imageUrl})`;
                        }
                        // For div containers that should show an image
                        else {
                            elem.style.backgroundImage = `url(${section.imageUrl})`;
                            elem.style.backgroundSize = 'cover';
                            elem.style.backgroundPosition = 'center';
                        }
                    } else if (section.content) {
                        // Check if element is input or textarea
                        if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                            elem.value = section.content;
                        } else {
                            // For regular elements, set innerHTML or textContent
                            if (section.type === 'html' || section.type === 'textarea') {
                                elem.innerHTML = section.content;
                            } else {
                                elem.textContent = section.content;
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading CMS content:', error);
    }
}

