// ===== ADMIN.JS - Admin CMS Logic =====

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN', 'REVIEWER', 'SUPPORT'];

function getAdminCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('aimhigh_currentUser') || localStorage.getItem('aimhigh_user') || '{}') || {};
    } catch (_) {
        return {};
    }
}

function getAdminRole() {
    const user = getAdminCurrentUser();
    return String(user.role || localStorage.getItem('aimhigh_role') || '').toUpperCase();
}

function isAdminRole(role = getAdminRole()) {
    return ADMIN_ROLES.includes(String(role || '').toUpperCase());
}

function requireAdminPage() {
    const token = localStorage.getItem('aimhigh_token');
    if (!token || !isAdminRole()) {
        const loginPath = window.location.pathname.includes('/admin/') ? '../login.html' : 'login.html';
        window.location.href = loginPath;
        return false;
    }
    return true;
}

function adminApiFetch(endpoint, options = {}) {
    if (typeof apiFetch !== 'function') {
        return Promise.reject(new Error('apiFetch is not loaded'));
    }
    return apiFetch(endpoint, options);
}

function showAdminToast(message, type = 'success') {
    showToast(message, type);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/admin/')) {
        requireAdminPage();
    }
});

// ===== Sidebar Pin/Unpin =====
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const icon = document.getElementById('sidebarToggleIcon');
    sidebar.classList.toggle('pinned');

    if (sidebar.classList.contains('pinned')) {
        icon.className = 'bi bi-pin-fill';
    } else {
        icon.className = 'bi bi-pin-angle';
    }

    localStorage.setItem('admin_sidebar_pinned', sidebar.classList.contains('pinned'));
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('mobile-open');
}

// Restore sidebar state
document.addEventListener('DOMContentLoaded', () => {
    const pinned = localStorage.getItem('admin_sidebar_pinned') === 'true';
    const sidebar = document.getElementById('adminSidebar');
    const icon = document.getElementById('sidebarToggleIcon');

    if (sidebar && pinned) {
        sidebar.classList.add('pinned');
        if (icon) icon.className = 'bi bi-pin-fill';
    } else if (icon) {
        icon.className = 'bi bi-pin-angle';
    }
});

// Close mobile sidebar on outside click
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    if (sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) &&
        !e.target.closest('.topbar-btn')) {
        sidebar.classList.remove('mobile-open');
    }
});

// ===== Table Search & Filter =====
function initTableFilter(tableId, searchInputId, filterSelectors = []) {
    const searchInput = document.getElementById(searchInputId);
    const table = document.getElementById(tableId);
    if (!searchInput || !table) return;

    const filterElements = filterSelectors.map(sel => document.getElementById(sel)).filter(Boolean);

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            let matchSearch = !searchTerm || text.includes(searchTerm);

            let matchFilters = true;
            filterElements.forEach(select => {
                const filterVal = select.value.toLowerCase();
                if (filterVal) {
                    matchFilters = matchFilters && text.includes(filterVal);
                }
            });

            row.style.display = (matchSearch && matchFilters) ? '' : 'none';
        });
    }

    searchInput.addEventListener('input', applyFilters);
    filterElements.forEach(el => el.addEventListener('change', applyFilters));
}

// Auto-init table filters on pages
document.addEventListener('DOMContentLoaded', () => {
    // Test manager page
    initTableFilter('testTable', 'searchTest', ['filterSkill', 'filterStatus']);

    // Users page
    initTableFilter('usersTable', 'searchUser', ['filterRole']);
});

// ===== Multi-step form helpers =====
function showStep(steps, stepIndex) {
    steps.forEach((step, i) => {
        step.style.display = i === stepIndex ? '' : 'none';
    });
}

// ===== Upload Media Helper =====
function initUploadZone(zoneId, inputId, options = {}) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && options.onFile) {
            options.onFile(file);
        }
    });

    input.addEventListener('change', (e) => {
        if (e.target.files[0] && options.onFile) {
            options.onFile(e.target.files[0]);
        }
    });
}

// ===== Preview Data Helper =====
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ===== Notification Toast =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
    toast.style.cssText = 'top:20px;right:20px;z-index:9999;min-width:280px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== Pagination Helper =====
function renderPagination(container, currentPage, totalPages, onPageChange) {
    if (!container) return;

    let html = '';
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i></button>`;

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (totalPages > 5) {
        html += `<button class="page-btn" disabled>...</button>`;
        html += `<button class="page-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="bi bi-chevron-right"></i></button>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page && onPageChange) onPageChange(page);
        });
    });
}

// ===== Confirm Delete =====
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}
