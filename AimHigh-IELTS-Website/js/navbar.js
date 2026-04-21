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
});
