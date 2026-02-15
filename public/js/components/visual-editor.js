// Visual Editor v2.0 - Enhanced admin editing experience
// Include this in pages that need visual editing

let isAdmin = false;
let editMode = false;
let editableElements = [];

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

    // Create sidebar panel (hidden initially)
    createEditorSidebar();
}

// Create the editor sidebar
function createEditorSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'editor-sidebar';
    sidebar.className = 'fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-[100] transform translate-x-full transition-transform duration-300';
    sidebar.innerHTML = `
        <div class="h-full flex flex-col">
            <!-- Header -->
            <div class="bg-primary text-white p-4 flex items-center justify-between">
                <h3 class="font-bold text-lg flex items-center">
                    <i class="fas fa-edit mr-2"></i>Editor Vizual
                </h3>
                <button onclick="toggleEditMode()" class="hover:bg-white/20 p-2 rounded">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b">
                <button onclick="switchEditorTab('elements')" id="tab-elements" class="flex-1 py-3 px-4 text-sm font-medium text-primary border-b-2 border-primary">
                    <i class="fas fa-list mr-1"></i>Elemente
                </button>
                <button onclick="switchEditorTab('edit')" id="tab-edit" class="flex-1 py-3 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                    <i class="fas fa-pencil-alt mr-1"></i>Editare
                </button>
            </div>

            <!-- Elements List Tab -->
            <div id="panel-elements" class="flex-1 overflow-y-auto p-4">
                <p class="text-sm text-gray-500 mb-3">Click pe un element pentru a-l edita:</p>
                <div id="elements-list" class="space-y-2">
                    <!-- Elements will be listed here -->
                </div>
            </div>

            <!-- Edit Tab -->
            <div id="panel-edit" class="flex-1 overflow-y-auto p-4 hidden">
                <div id="edit-form-container">
                    <p class="text-sm text-gray-500 text-center py-8">Selectează un element din pagină pentru a-l edita</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t bg-gray-50">
                <p class="text-xs text-gray-500 text-center">
                    <i class="fas fa-info-circle mr-1"></i>
                    Modificările se salvează în baza de date
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(sidebar);
}

// Switch between editor tabs
function switchEditorTab(tab) {
    const tabElements = document.getElementById('tab-elements');
    const tabEdit = document.getElementById('tab-edit');
    const panelElements = document.getElementById('panel-elements');
    const panelEdit = document.getElementById('panel-edit');

    if (tab === 'elements') {
        tabElements.classList.add('text-primary', 'border-primary');
        tabElements.classList.remove('text-gray-500');
        tabEdit.classList.remove('text-primary', 'border-primary');
        tabEdit.classList.add('text-gray-500', 'border-transparent');
        panelElements.classList.remove('hidden');
        panelEdit.classList.add('hidden');
    } else {
        tabEdit.classList.add('text-primary', 'border-primary');
        tabEdit.classList.remove('text-gray-500');
        tabElements.classList.remove('text-primary', 'border-primary');
        tabElements.classList.add('text-gray-500', 'border-transparent');
        panelEdit.classList.remove('hidden');
        panelElements.classList.add('hidden');
    }
}

// Toggle edit mode
function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('edit-mode-text');
    const sidebar = document.getElementById('editor-sidebar');

    if (editMode) {
        btn.textContent = 'Dezactivează Editare';
        document.getElementById('visual-edit-toggle').querySelector('button').classList.add('ring-4', 'ring-yellow-300');
        sidebar.classList.remove('translate-x-full');
        document.body.style.paddingRight = '320px';
        scanEditableElements();
        showEditableOverlays();
    } else {
        btn.textContent = 'Activează Editare';
        document.getElementById('visual-edit-toggle').querySelector('button').classList.remove('ring-4', 'ring-yellow-300');
        sidebar.classList.add('translate-x-full');
        document.body.style.paddingRight = '0';
        hideEditableOverlays();
    }
}

// Scan page for all editable elements
function scanEditableElements() {
    editableElements = [];

    // 1. Elements with cms- prefix
    document.querySelectorAll('[id^="cms-"]').forEach(elem => {
        addEditableElement(elem);
    });

    // 2. Common editable patterns - headings with specific classes
    document.querySelectorAll('h1, h2, h3').forEach(elem => {
        if (!elem.id && elem.closest('main, section, article')) {
            const text = elem.textContent.trim().substring(0, 30);
            elem.id = `cms-heading-${text.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
            addEditableElement(elem);
        }
    });

    // 3. Paragraphs in main content
    document.querySelectorAll('main p, section p, article p, [class*="description"] p').forEach((elem, idx) => {
        if (!elem.id && elem.textContent.trim().length > 20) {
            elem.id = `cms-paragraph-${idx}`;
            addEditableElement(elem);
        }
    });

    // 4. Images in main content
    document.querySelectorAll('main img, section img, article img, [class*="hero"] img, [class*="gallery"] img').forEach((elem, idx) => {
        if (!elem.id) {
            elem.id = `cms-image-${idx}`;
        }
        addEditableElement(elem, true);
    });

    // 5. Background images
    document.querySelectorAll('[style*="background-image"]').forEach((elem, idx) => {
        if (!elem.id) {
            elem.id = `cms-bg-${idx}`;
        }
        addEditableElement(elem, true, true);
    });

    // Update elements list in sidebar
    updateElementsList();
}

// Add element to editables list
function addEditableElement(elem, isImage = false, isBgImage = false) {
    const id = elem.id || `cms-auto-${Date.now()}`;

    // Check if already added
    if (editableElements.find(e => e.id === id)) return;

    let type = 'text';
    let preview = '';

    if (isImage || elem.tagName === 'IMG') {
        type = 'image';
        preview = elem.src || elem.style.backgroundImage || '';
    } else if (isBgImage) {
        type = 'background';
        preview = elem.style.backgroundImage || '';
    } else {
        const text = elem.textContent.trim();
        preview = text.substring(0, 50) + (text.length > 50 ? '...' : '');
        type = text.length > 100 ? 'textarea' : 'text';
    }

    editableElements.push({
        id: id,
        element: elem,
        type: type,
        preview: preview,
        tagName: elem.tagName
    });
}

// Update the elements list in sidebar
function updateElementsList() {
    const list = document.getElementById('elements-list');

    if (editableElements.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nu s-au găsit elemente editabile</p>';
        return;
    }

    const grouped = {
        images: editableElements.filter(e => e.type === 'image' || e.type === 'background'),
        headings: editableElements.filter(e => ['H1', 'H2', 'H3'].includes(e.tagName)),
        text: editableElements.filter(e => e.type === 'text' || e.type === 'textarea')
    };

    list.innerHTML = `
        ${grouped.images.length > 0 ? `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">
                    <i class="fas fa-image mr-1"></i>Imagini (${grouped.images.length})
                </h4>
                ${grouped.images.map(e => `
                    <div onclick="selectElement('${e.id}')" 
                        class="p-2 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer mb-1 flex items-center gap-2 text-sm">
                        <img src="${e.preview.replace(/url\(['"]?|['"]?\)/g, '')}" class="w-10 h-10 object-cover rounded" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23e5e7eb%22 width=%2240%22 height=%2240%22/></svg>'">
                        <span class="truncate flex-1">${e.id.replace('cms-', '')}</span>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${grouped.headings.length > 0 ? `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">
                    <i class="fas fa-heading mr-1"></i>Titluri (${grouped.headings.length})
                </h4>
                ${grouped.headings.map(e => `
                    <div onclick="selectElement('${e.id}')" 
                        class="p-2 bg-green-50 hover:bg-green-100 rounded cursor-pointer mb-1 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="font-medium">${e.tagName}</span>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                        <p class="text-xs text-gray-600 truncate">${e.preview}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${grouped.text.length > 0 ? `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">
                    <i class="fas fa-paragraph mr-1"></i>Texte (${grouped.text.length})
                </h4>
                ${grouped.text.map(e => `
                    <div onclick="selectElement('${e.id}')" 
                        class="p-2 bg-yellow-50 hover:bg-yellow-100 rounded cursor-pointer mb-1 text-sm">
                        <p class="text-xs text-gray-600 truncate">${e.preview}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

// Show overlays on editable elements
function showEditableOverlays() {
    editableElements.forEach(e => {
        const elem = e.element;
        if (!elem.querySelector('.visual-edit-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'visual-edit-overlay absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-500/10 cursor-pointer transition-all hover:bg-blue-500/20 z-40 flex items-center justify-center';

            const icon = e.type === 'image' || e.type === 'background' ? 'fa-image' : 'fa-edit';
            overlay.innerHTML = `
                <div class="bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas ${icon} mr-1"></i>Click pentru editare
                </div>
            `;

            overlay.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                selectElement(e.id);
            });

            // Ensure parent has relative positioning
            const pos = window.getComputedStyle(elem).position;
            if (pos === 'static') {
                elem.style.position = 'relative';
            }

            elem.appendChild(overlay);
            elem.classList.add('group');
        }
    });
}

// Hide all overlays
function hideEditableOverlays() {
    document.querySelectorAll('.visual-edit-overlay').forEach(el => el.remove());
    editableElements.forEach(e => e.element.classList.remove('group'));
}

// Select an element for editing
function selectElement(id) {
    const elemData = editableElements.find(e => e.id === id);
    if (!elemData) return;

    // Highlight selected element
    editableElements.forEach(e => {
        const overlay = e.element.querySelector('.visual-edit-overlay');
        if (overlay) {
            overlay.classList.remove('border-green-500', 'bg-green-500/20');
            overlay.classList.add('border-blue-400', 'bg-blue-500/10');
        }
    });

    const selectedOverlay = elemData.element.querySelector('.visual-edit-overlay');
    if (selectedOverlay) {
        selectedOverlay.classList.remove('border-blue-400', 'bg-blue-500/10');
        selectedOverlay.classList.add('border-green-500', 'bg-green-500/20');
    }

    // Scroll element into view
    elemData.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Show edit form
    showEditForm(elemData);
    switchEditorTab('edit');
}

// Show edit form for selected element
function showEditForm(elemData) {
    const container = document.getElementById('edit-form-container');
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const key = elemData.id.replace('cms-', '');

    let currentValue = '';
    if (elemData.type === 'image') {
        currentValue = elemData.element.src || '';
    } else if (elemData.type === 'background') {
        currentValue = elemData.element.style.backgroundImage.replace(/url\(['"]?|['"]?\)/g, '') || '';
    } else {
        const clone = elemData.element.cloneNode(true);
        const overlay = clone.querySelector('.visual-edit-overlay');
        if (overlay) overlay.remove();
        currentValue = clone.textContent || clone.innerText || '';
    }

    container.innerHTML = `
        <div class="space-y-4">
            <div class="p-3 bg-gray-100 rounded-lg">
                <p class="text-xs text-gray-500">Element ID</p>
                <p class="font-mono text-sm">${elemData.id}</p>
            </div>

            ${elemData.type === 'image' || elemData.type === 'background' ? `
                <!-- Image Editor -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Imagine curentă</label>
                    <img src="${currentValue}" class="w-full h-32 object-cover rounded-lg border mb-3" 
                        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 100%22><rect fill=%22%23e5e7eb%22 width=%22200%22 height=%22100%22/><text x=%22100%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%239ca3af%22>No image</text></svg>'">
                </div>
                
                <div id="drop-zone-editor" class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <i class="fas fa-cloud-upload-alt text-gray-400 text-2xl mb-2"></i>
                    <p class="text-sm text-gray-600">Trage o imagine aici</p>
                    <p class="text-xs text-gray-400">sau click pentru selecție</p>
                    <input type="file" id="image-upload-input" accept="image/*" class="hidden">
                </div>

                <div class="text-center text-xs text-gray-400">sau</div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">URL Imagine</label>
                    <input type="url" id="image-url-input" value="${currentValue}" 
                        class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://...">
                </div>
            ` : `
                <!-- Text Editor -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Conținut</label>
                    <textarea id="text-content-input" rows="${elemData.type === 'textarea' ? 8 : 4}"
                        class="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                        placeholder="Introdu textul...">${currentValue.trim()}</textarea>
                </div>
                
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    <i class="fas fa-info-circle"></i>
                    <span>Modificările vor fi vizibile imediat după salvare</span>
                </div>
            `}

            <div class="flex gap-2 pt-4 border-t">
                <button onclick="cancelEdit()" 
                    class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">
                    <i class="fas fa-times mr-1"></i>Anulează
                </button>
                <button onclick="saveEdit('${currentPage}', '${key}', '${elemData.type}', '${elemData.id}')" 
                    class="flex-1 bg-primary hover:bg-secondary text-white py-2 rounded-lg text-sm">
                    <i class="fas fa-save mr-1"></i>Salvează
                </button>
            </div>
        </div>
    `;

    // Setup drag & drop for images
    if (elemData.type === 'image' || elemData.type === 'background') {
        setupImageUpload();
    }
}

// Setup image upload with drag & drop
function setupImageUpload() {
    const dropZone = document.getElementById('drop-zone-editor');
    const fileInput = document.getElementById('image-upload-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-primary/10');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-primary/10');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/10');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });
}

// Handle selected image file
function handleImageFile(file) {
    const dropZone = document.getElementById('drop-zone-editor');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        dropZone.innerHTML = `
            <img src="${e.target.result}" class="max-h-24 mx-auto rounded">
            <p class="text-sm text-green-600 mt-2"><i class="fas fa-check mr-1"></i>${file.name}</p>
        `;
    };
    reader.readAsDataURL(file);

    // Store file for upload
    dropZone.dataset.file = 'pending';
    window._pendingImageFile = file;
}

// Cancel editing
function cancelEdit() {
    const container = document.getElementById('edit-form-container');
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-8">Selectează un element din pagină pentru a-l edita</p>';
    switchEditorTab('elements');

    // Remove highlight from all elements
    editableElements.forEach(e => {
        const overlay = e.element.querySelector('.visual-edit-overlay');
        if (overlay) {
            overlay.classList.remove('border-green-500', 'bg-green-500/20');
            overlay.classList.add('border-blue-400', 'bg-blue-500/10');
        }
    });
}

// Save edit
async function saveEdit(page, key, type, elemId) {
    const formData = new FormData();
    formData.append('page', page);
    formData.append('section', 'main');
    formData.append('key', key);
    formData.append('type', type);
    formData.append('order', 0);
    formData.append('active', true);

    if (type === 'image' || type === 'background') {
        // Check if file was uploaded
        if (window._pendingImageFile) {
            formData.append('image', window._pendingImageFile);
            formData.append('content', '');
        } else {
            // Use URL
            const urlInput = document.getElementById('image-url-input');
            if (urlInput && urlInput.value) {
                formData.append('content', urlInput.value);
            } else {
                showToast('Selectează o imagine sau introdu un URL', 'error');
                return;
            }
        }
    } else {
        const content = document.getElementById('text-content-input').value;
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
            window._pendingImageFile = null;

            // Update element immediately
            const elem = document.getElementById(elemId);
            if (elem) {
                if (type === 'image' && result.section && result.section.imageUrl) {
                    elem.src = result.section.imageUrl + '?t=' + Date.now();
                } else if (type === 'background' && result.section && result.section.imageUrl) {
                    elem.style.backgroundImage = `url('${result.section.imageUrl}?t=${Date.now()}')`;
                } else if (type === 'text' || type === 'textarea') {
                    const content = document.getElementById('text-content-input').value;
                    // Remove overlay temporarily
                    const overlay = elem.querySelector('.visual-edit-overlay');
                    if (overlay) overlay.remove();
                    elem.textContent = content;
                    // Re-add overlay
                    if (editMode) {
                        setTimeout(() => {
                            scanEditableElements();
                            showEditableOverlays();
                        }, 100);
                    }
                }
            }

            showToast('✅ Salvat cu succes!', 'success');
            cancelEdit();
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
