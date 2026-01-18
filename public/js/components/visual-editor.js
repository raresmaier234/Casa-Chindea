// Visual Editor - allows admins to edit content directly on the page
// Include this in pages that need visual editing

let isAdmin = false;
let editMode = false;

// Check if user is admin
function checkAdminStatus() {
    const userInfo = sessionStorage.getItem('user_info');
    if (userInfo) {
        try {
            const user = JSON.parse(userInfo);
            isAdmin = user.admin === true;
            if (isAdmin) {
                initVisualEditor();
            }
        } catch (e) {
            isAdmin = false;
        }
    }
}

// Initialize visual editor for admins
function initVisualEditor() {
    // Add edit mode toggle button
    const editBtn = document.createElement('div');
    editBtn.id = 'visual-edit-toggle';
    editBtn.className = 'fixed bottom-6 right-6 z-50';
    editBtn.innerHTML = `
        <button onclick="toggleEditMode()" 
            class="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 transition-all">
            <i class="fas fa-edit"></i>
            <span id="edit-mode-text">Activează Editare</span>
        </button>
    `;
    document.body.appendChild(editBtn);
}

// Toggle edit mode
function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('edit-mode-text');

    if (editMode) {
        btn.textContent = 'Dezactivează Editare';
        document.getElementById('visual-edit-toggle').querySelector('button').classList.add('ring-4', 'ring-yellow-300');
        showEditableElements();
        showToast('✏️ Mod editare activat! Dă click pe orice element pentru a-l edita.', 'success');
    } else {
        btn.textContent = 'Activează Editare';
        document.getElementById('visual-edit-toggle').querySelector('button').classList.remove('ring-4', 'ring-yellow-300');
        hideEditableElements();
    }
}

// Show edit buttons on all editable elements
function showEditableElements() {
    // Find all elements with cms- ID prefix
    const editableElements = document.querySelectorAll('[id^="cms-"]');

    editableElements.forEach(elem => {
        if (!elem.querySelector('.visual-edit-overlay')) {
            makeElementEditable(elem);
        }
    });

    // Also find all images without cms- ID but inside editable containers
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
        // Add temporary ID if image doesn't have cms- ID
        if (!img.id || !img.id.startsWith('cms-')) {
            const parent = img.closest('[id^="cms-"]');
            if (parent && !img.querySelector('.visual-edit-overlay')) {
                // This image is inside an editable element, make it editable too
                if (!img.id) {
                    img.id = `cms-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                makeElementEditable(img, true);
            }
        }
    });
}

// Hide edit buttons
function hideEditableElements() {
    document.querySelectorAll('.visual-edit-overlay').forEach(el => el.remove());
}

// Make an element editable
function makeElementEditable(elem, isImage = false) {
    // Add overlay with edit button
    const overlay = document.createElement('div');
    overlay.className = 'visual-edit-overlay absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded cursor-pointer z-40';

    const label = isImage || elem.tagName === 'IMG' ? '🖼️ Editează Imagine' : '✏️ Editează Text';

    overlay.innerHTML = `
        <div class="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1 whitespace-nowrap">
            <span>${label}</span>
        </div>
    `;

    // Make parent position relative if not already
    const position = window.getComputedStyle(elem).position;
    if (position === 'static') {
        elem.style.position = 'relative';
    }

    overlay.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openQuickEditModal(elem);
    });

    elem.appendChild(overlay);
}

// Open quick edit modal for an element
function openQuickEditModal(elem) {
    const elemId = elem.id;
    const key = elemId.replace('cms-', '');
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    // Determine type based on element
    let type = 'text';
    let currentValue = '';

    if (elem.tagName === 'IMG' || elem.style.backgroundImage) {
        type = 'image';
        currentValue = elem.src || '';
    } else {
        // Get text content excluding the overlay
        const clone = elem.cloneNode(true);
        const overlay = clone.querySelector('.visual-edit-overlay');
        if (overlay) {
            overlay.remove();
        }
        currentValue = clone.textContent || clone.innerText || '';

        // Determine if textarea based on length or element height
        if (currentValue.length > 100 || elem.scrollHeight > 100) {
            type = 'textarea';
        } else {
            type = 'text';
        }
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'quick-edit-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-bold text-gray-900">✏️ Editează Conținut</h3>
                <button onclick="closeQuickEdit()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="mb-4 p-3 bg-blue-50 rounded">
                <p class="text-sm text-blue-800"><strong>Element:</strong> ${key}</p>
                <p class="text-sm text-blue-800"><strong>Pagină:</strong> ${currentPage}</p>
            </div>
            <form id="quick-edit-form" onsubmit="saveQuickEdit(event, '${currentPage}', '${key}', '${type}', '${elemId}')">
                ${type === 'image' ? `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Imagine Curentă</label>
                        <img src="${currentValue}" alt="${key}" class="max-h-48 rounded mb-3">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Încarcă imagine nouă</label>
                        <input type="file" id="quick-edit-image" accept="image/*"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2">
                    </div>
                ` : `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Conținut</label>
                        <textarea id="quick-edit-content" rows="${type === 'textarea' ? 8 : 3}"
                            class="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-primary"
                            placeholder="Introdu conținutul...">${currentValue}</textarea>
                    </div>
                `}
                <div class="flex justify-end space-x-2">
                    <button type="button" onclick="closeQuickEdit()" 
                        class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg">
                        Anulează
                    </button>
                    <button type="submit" 
                        class="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg">
                        <i class="fas fa-save mr-2"></i>Salvează
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close quick edit modal
function closeQuickEdit() {
    const modal = document.getElementById('quick-edit-modal');
    if (modal) {
        modal.remove();
    }
}

// Save quick edit
async function saveQuickEdit(e, page, key, type, elemId) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('page', page);
    formData.append('section', 'main');
    formData.append('key', key);
    formData.append('type', type);
    formData.append('order', 0);
    formData.append('active', true);

    if (type === 'image') {
        const imageFile = document.getElementById('quick-edit-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
            // Also send empty content for images
            formData.append('content', '');
        } else {
            showToast('Te rog selectează o imagine', 'error');
            return;
        }
    } else {
        const content = document.getElementById('quick-edit-content').value;
        formData.append('content', content);
    }

    try {
        const token = sessionStorage.getItem('auth_token');
        const response = await fetch('/api/admin/cms/sections', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            closeQuickEdit();

            // For images, update the src immediately without reload
            if (type === 'image' && result.section && result.section.imageUrl) {
                const imgElem = document.getElementById(elemId);
                if (imgElem) {
                    imgElem.src = result.section.imageUrl;
                    showToast('✅ Imaginea a fost salvată!', 'success');
                    // Refresh edit mode to update overlays
                    if (editMode) {
                        hideEditableElements();
                        setTimeout(() => showEditableElements(), 100);
                    }
                } else {
                    showToast('✅ Salvat cu succes! Pagina se reîncarcă...', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                showToast('✅ Salvat cu succes! Pagina se reîncarcă...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Eroare la salvare');
        }
    } catch (error) {
        showToast(`Eroare: ${error.message}`, 'error');
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed top-24 right-4 z-[110] px-6 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
});

