document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = () => {
        const hasFlag = localStorage.getItem('aimhigh_loggedIn') === 'true';
        const hasToken = !!localStorage.getItem('aimhigh_token');
        const currentUserRaw = localStorage.getItem('aimhigh_currentUser') || localStorage.getItem('aimhigh_user') || '{}';
        let hasUser = false;

        try {
            const currentUser = JSON.parse(currentUserRaw);
            hasUser = !!(currentUser && (currentUser.email || currentUser.name));
        } catch (_) {
            hasUser = false;
        }

        return hasFlag || hasToken || hasUser;
    };

    const requireLoginForHeaderLinks = () => {
        const protectedPrefixes = [
            'practice.html',
            'reading.html',
            'listening.html',
            'writing.html',
            'speaking.html',
            'vocabulary.html',
            'Vocabulary-notebook.html',
            'Vocabulary.html',
            'ai-tutor.html'
        ];

        const navAnchors = document.querySelectorAll('.navbar a[href]');
        navAnchors.forEach((anchor) => {
            const href = (anchor.getAttribute('href') || '').trim();
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            const needsAuth = protectedPrefixes.some((prefix) => href.startsWith(prefix));
            if (!needsAuth) return;

            anchor.addEventListener('click', (event) => {
                if (isLoggedIn()) return;
                event.preventDefault();
                const redirect = encodeURIComponent(href);
                window.location.href = `login.html?redirect=${redirect}`;
            });
        });
    };

    requireLoginForHeaderLinks();

    const currentUser = JSON.parse(localStorage.getItem('aimhigh_currentUser') || localStorage.getItem('aimhigh_user') || '{}');
    const userRole = String(currentUser?.role || '').toUpperCase();

    const setupProfileRedirectByRole = () => {
        if (userRole !== 'ADMIN') return;

        const profileLinks = document.querySelectorAll('a.dropdown-item[href="profile.html"]');
        profileLinks.forEach((link) => {
            link.setAttribute('href', 'admin/dashboard.html');

            const icon = link.querySelector('i');
            const text = link.textContent || '';
            if (/Hồ sơ|Ho so/i.test(text)) {
                link.innerHTML = `${icon ? icon.outerHTML : '<i class="bi bi-speedometer2"></i>'} Trang quản trị`;
            }
        });
    };

    setupProfileRedirectByRole();

    // Setup User Info in Navbar
    if (currentUser && currentUser.name) {
        const navNames = document.querySelectorAll('.user-btn span, #navName');
        navNames.forEach(el => el.textContent = currentUser.name);

        const navAvatars = document.querySelectorAll('.user-avatar, #navAvatar');
        if (navAvatars.length && currentUser.name.trim()) {
            const parts = currentUser.name.trim().split(' ');
            const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
            
            navAvatars.forEach(el => {
                if (currentUser.avatarUrl) {
                    const safeUrl = String(currentUser.avatarUrl).replace(/"/g, '&quot;');
                    el.innerHTML = `<img src="${safeUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                } else {
                    el.textContent = initials.toUpperCase().slice(0, 2);
                }
            });
        }
    }

    // Add AI Tutor Link to Desktop Nav Menu dynamically if missing
    const navMenu = document.querySelector('.navbar-nav');
    if (navMenu && !navMenu.querySelector('a[href="ai-tutor.html"]')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="ai-tutor.html"><i class="bi bi-robot text-warning"></i> AI Tutor</a>';
        navMenu.appendChild(li);
    }

    // ===== E2E NOTIFICATION CENTER INJECTION =====
    const injectNotificationBell = () => {
        const userActions = document.getElementById('userActions');
        if (!userActions || !isLoggedIn() || document.getElementById('navbarNotificationDropdown')) return;

        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = 'dropdown me-3 position-relative d-inline-block';
        dropdownWrapper.id = 'navbarNotificationDropdown';
        dropdownWrapper.innerHTML = `
            <button class="btn border-0 text-white position-relative p-1" data-bs-toggle="dropdown" id="navNotificationBell" style="background: transparent; font-size: 1.35rem; transition: all 0.3s ease;">
                <i class="bi bi-bell"></i>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="navNotificationBadge" style="font-size: 0.62rem; padding: 0.25em 0.5em;">0</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end p-0 shadow-lg border-0" style="width: 330px; background: rgba(31, 25, 0, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(234, 220, 168, 0.25) !important; border-radius: 16px; overflow: hidden; margin-top: 12px; z-index: 99999;">
                <div class="d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid rgba(234, 220, 168, 0.18);">
                    <h6 class="m-0 text-white font-weight-bold" style="font-size: 0.95rem; font-family: var(--font-primary);">Thông báo</h6>
                    <a href="#" class="text-warning text-decoration-none" id="navNotificationReadAll" style="font-size: 0.78rem; font-weight: 600;">Đọc hết</a>
                </div>
                <div id="navNotificationList" style="max-height: 290px; overflow-y: auto; background: rgba(10, 8, 0, 0.25);">
                    <div class="text-center py-4 text-muted" id="navNotificationEmpty">
                        <i class="bi bi-bell-slash" style="font-size: 1.5rem; display: block; margin-bottom: 8px;"></i>
                        Không có thông báo mới
                    </div>
                </div>
            </ul>
        `;

        // Inject trước user dropdown
        const userDropdown = userActions.querySelector('.user-dropdown');
        if (userDropdown) {
            userActions.insertBefore(dropdownWrapper, userDropdown);
            userActions.style.display = 'flex';
            userActions.style.alignItems = 'center';
        }

        // Đăng ký sự kiện
        setupNotificationListeners();
        pollUnreadCount();
        setInterval(pollUnreadCount, 30000); // Polling mỗi 30s
    };

    const setupNotificationListeners = () => {
        const bell = document.getElementById('navNotificationBell');
        const readAll = document.getElementById('navNotificationReadAll');

        if (bell) {
            bell.addEventListener('click', fetchNotifications);
        }
        if (readAll) {
            readAll.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof apiFetch !== 'function') return;
                try {
                    await apiFetch('/notifications/read-all', { method: 'POST' });
                    document.getElementById('navNotificationBadge').classList.add('d-none');
                    fetchNotifications();
                } catch (err) {}
            });
        }
    };

    const pollUnreadCount = async () => {
        if (typeof apiFetch !== 'function') return;
        try {
            const res = await apiFetch('/notifications/unread-count');
            const count = Number(res?.data || res || 0);
            const badge = document.getElementById('navNotificationBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        } catch (err) {}
    };

    const fetchNotifications = async () => {
        const listContainer = document.getElementById('navNotificationList');
        if (!listContainer || typeof apiFetch !== 'function') return;

        try {
            listContainer.innerHTML = '<div class="text-center py-4 text-warning"><div class="spinner-border spinner-border-sm" role="status"></div></div>';
            const res = await apiFetch('/notifications');
            const list = res?.data || res || [];
            
            if (Array.isArray(list) && list.length > 0) {
                listContainer.innerHTML = '';
                list.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'p-3 border-bottom position-relative hover-light';
                    div.style.cursor = 'pointer';
                    div.style.transition = 'all 0.2s';
                    div.style.borderBottomColor = 'rgba(234, 220, 168, 0.12)';
                    div.style.backgroundColor = item.read ? 'transparent' : 'rgba(212, 160, 23, 0.06)';
                    div.style.borderLeft = item.read ? 'none' : '4px solid var(--primary-color)';

                    div.innerHTML = `
                        <div style="font-weight: ${item.read ? '500' : '700'}; font-size: 0.88rem; color: #f7edd0; margin-bottom: 2px;">
                            ${escapeHtml(item.title)}
                        </div>
                        <div style="font-size: 0.78rem; color: rgba(234, 220, 168, 0.75); line-height: 1.4; margin-bottom: 4px;">
                            ${escapeHtml(item.message)}
                        </div>
                        <div style="font-size: 0.65rem; color: var(--text-light);">
                            ${new Date(item.createdAt).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}
                        </div>
                    `;

                    // Click để đánh dấu đọc và chuyển hướng
                    div.addEventListener('click', async () => {
                        try {
                            if (!item.read) {
                                await apiFetch(`/notifications/${item.id}/read`, { method: 'POST' });
                            }
                            pollUnreadCount();
                            // Chuyển hướng tới Journal/Kết quả
                            window.location.href = 'dashboard.html';
                        } catch (err) {}
                    });

                    listContainer.appendChild(div);
                });
            } else {
                listContainer.innerHTML = `
                    <div class="text-center py-4 text-muted" id="navNotificationEmpty">
                        <i class="bi bi-bell-slash" style="font-size: 1.5rem; display: block; margin-bottom: 8px;"></i>
                        Không có thông báo mới
                    </div>
                `;
            }
        } catch (err) {
            listContainer.innerHTML = '<div class="text-center py-4 text-danger" style="font-size: 0.8rem;">Không thể tải thông báo</div>';
        }
    };

    function escapeHtml(unsafe) {
        return String(unsafe || '')
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    injectNotificationBell();
});
