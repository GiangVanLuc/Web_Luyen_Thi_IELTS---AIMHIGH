(function () {
    const state = {
        backendAvailable: true,
        serverProfile: null,
        snapshot: null,
        localPrefs: {
            phone: '',
            targetScore: '7.0',
            examDate: '',
            bio: '',
            localAvatarDataUrl: ''
        }
    };

    const el = {};

    document.addEventListener('DOMContentLoaded', initProfilePage);

    function initProfilePage() {
        cacheElements();
        bindEvents();

        const user = getStoredUser();
        if (String(user.role || '').toUpperCase() === 'ADMIN') {
            window.location.href = 'admin/dashboard.html';
            return;
        }

        if (!isAuthenticated()) {
            const redirect = encodeURIComponent('profile.html');
            window.location.href = `login.html?redirect=${redirect}`;
            return;
        }

        hydrateFromLocalUser(user);
        loadProfile();
    }

    function cacheElements() {
        el.navName = document.getElementById('navName');
        el.navAvatar = document.getElementById('navAvatar');
        el.profileName = document.getElementById('profileName');
        el.profileEmail = document.getElementById('profileEmail');
        el.profileAvatar = document.getElementById('profileAvatar');

        el.profileForm = document.getElementById('profileForm');
        el.saveProfileBtn = document.getElementById('saveProfileBtn');
        el.resetProfileBtn = document.getElementById('resetProfileBtn');
        el.backendNotice = document.getElementById('profileBackendNotice');

        el.fullName = document.getElementById('fullName');
        el.phone = document.getElementById('phone');
        el.emailField = document.getElementById('emailField');
        el.avatarUrlField = document.getElementById('avatarUrlField');
        el.targetScore = document.getElementById('targetScore');
        el.examDate = document.getElementById('examDate');
        el.bio = document.getElementById('bio');
        el.avatarInput = document.getElementById('avatarInput');

        el.passwordToggle = document.getElementById('passwordAccordionToggle');
        el.passwordSection = document.getElementById('passwordSection');
        el.passwordToggleIcon = document.getElementById('passwordToggleIcon');
        el.passwordForm = document.getElementById('passwordForm');
        el.savePasswordBtn = document.getElementById('savePasswordBtn');
        el.currentPass = document.getElementById('currentPass');
        el.newPass = document.getElementById('newPass');
        el.confirmPass = document.getElementById('confirmPass');
        el.strengthLabel = document.getElementById('strengthLabel');

        el.logoutLink = document.getElementById('logoutLink');

        el.statTotalAttempts = document.getElementById('statTotalAttempts');
        el.statSubmittedAttempts = document.getElementById('statSubmittedAttempts');
        el.statBestBand = document.getElementById('statBestBand');
        el.statAverageBand = document.getElementById('statAverageBand');
        el.statLastPractice = document.getElementById('statLastPractice');
    }

    function bindEvents() {
        el.profileForm?.addEventListener('submit', handleSaveProfile);
        el.resetProfileBtn?.addEventListener('click', resetProfileForm);
        el.avatarInput?.addEventListener('change', handleAvatarUpload);

        el.passwordToggle?.addEventListener('click', togglePasswordSection);
        el.passwordForm?.addEventListener('submit', handleChangePassword);
        el.newPass?.addEventListener('input', (event) => {
            updatePasswordStrength(event.target.value || '');
        });

        el.logoutLink?.addEventListener('click', handleLogout);
    }

    function isAuthenticated() {
        const hasToken = !!localStorage.getItem('aimhigh_token');
        const hasFlag = localStorage.getItem('aimhigh_loggedIn') === 'true';
        const user = getStoredUser();
        const hasUser = !!(user && (user.email || user.name));
        return hasToken || hasFlag || hasUser;
    }

    function getStoredUser() {
        const currentUserRaw = localStorage.getItem('aimhigh_currentUser');
        const fallbackRaw = localStorage.getItem('aimhigh_user');
        try {
            return JSON.parse(currentUserRaw || fallbackRaw || '{}');
        } catch (error) {
            return {};
        }
    }

    function hydrateFromLocalUser(user) {
        state.serverProfile = {
            name: user.name || '',
            email: user.email || '',
            avatarUrl: user.avatarUrl || ''
        };

        const prefs = readLocalPrefs(user.email);
        state.localPrefs = { ...state.localPrefs, ...prefs };

        renderProfile(state.serverProfile, state.localPrefs);
        renderStats(null);
        takeSnapshot();
    }

    async function loadProfile() {
        if (typeof getProfile !== 'function') {
            state.backendAvailable = false;
            showBackendNotice(true);
            return;
        }

        try {
            const response = await getProfile();
            const profile = unwrapApiData(response);
            if (!profile || !profile.email) {
                throw new Error('Phản hồi profile không hợp lệ');
            }

            state.backendAvailable = true;
            showBackendNotice(false);

            state.serverProfile = {
                id: profile.id,
                name: profile.name || '',
                email: profile.email || '',
                avatarUrl: profile.avatarUrl || '',
                role: profile.role,
                authProvider: profile.authProvider,
                stats: profile.stats || null
            };

            const prefs = readLocalPrefs(profile.email);
            state.localPrefs = { ...state.localPrefs, ...prefs };

            renderProfile(state.serverProfile, state.localPrefs);
            renderStats(profile.stats);
            syncCurrentUser(profile);
            takeSnapshot();
        } catch (error) {
            state.backendAvailable = false;
            showBackendNotice(true);
            showToast(error.message || 'Không tải được profile từ backend', 'warning');
        }
    }

    function renderProfile(profile, prefs) {
        const displayName = profile.name || 'Người dùng AimHigh';
        const displayEmail = profile.email || 'Chưa có email';

        if (el.fullName) el.fullName.value = profile.name || '';
        if (el.emailField) el.emailField.value = profile.email || '';
        if (el.avatarUrlField) el.avatarUrlField.value = profile.avatarUrl || '';

        if (el.phone) el.phone.value = prefs.phone || '';
        if (el.targetScore) el.targetScore.value = prefs.targetScore || '7.0';
        if (el.examDate) el.examDate.value = prefs.examDate || '';
        if (el.bio) el.bio.value = prefs.bio || '';

        if (el.profileName) el.profileName.textContent = displayName;
        if (el.profileEmail) el.profileEmail.textContent = displayEmail;
        if (el.navName) el.navName.textContent = displayName;

        renderAvatar(displayName, profile.avatarUrl, prefs.localAvatarDataUrl);
    }

    function renderAvatar(name, avatarUrl, localAvatarDataUrl) {
        if (!el.profileAvatar) return;

        const imageSource = (localAvatarDataUrl && localAvatarDataUrl.trim())
            || (avatarUrl && avatarUrl.trim())
            || '';

        if (imageSource) {
            el.profileAvatar.innerHTML = `<img src="${escapeHtml(imageSource)}" alt="Avatar">`;
        } else {
            el.profileAvatar.textContent = getInitials(name);
        }

        if (el.navAvatar) {
            el.navAvatar.textContent = getInitials(name);
        }
    }

    function renderStats(stats) {
        const safeStats = stats || {};
        if (el.statTotalAttempts) {
            el.statTotalAttempts.textContent = String(safeStats.totalAttempts ?? 0);
        }
        if (el.statSubmittedAttempts) {
            el.statSubmittedAttempts.textContent = String(safeStats.submittedAttempts ?? 0);
        }
        if (el.statBestBand) {
            el.statBestBand.textContent = Number(safeStats.bestBandScore ?? 0).toFixed(1);
        }
        if (el.statAverageBand) {
            el.statAverageBand.textContent = Number(safeStats.averageBandScore ?? 0).toFixed(1);
        }
        if (el.statLastPractice) {
            el.statLastPractice.textContent = formatDateTime(safeStats.lastPracticedAt);
        }
    }

    async function handleSaveProfile(event) {
        event.preventDefault();

        const payload = collectProfilePayload();
        if (!payload.name) {
            showToast('Vui lòng nhập họ và tên', 'danger');
            return;
        }
        if (!isValidEmail(payload.email)) {
            showToast('Email không hợp lệ', 'danger');
            return;
        }

        state.localPrefs = collectLocalPrefsFromForm();

        if (el.saveProfileBtn) {
            setButtonLoading(el.saveProfileBtn, true, 'Đang lưu...');
        }

        let profileToRender = {
            ...state.serverProfile,
            name: payload.name,
            email: payload.email,
            avatarUrl: payload.avatarUrl
        };

        try {
            if (state.backendAvailable && typeof updateProfile === 'function') {
                const response = await updateProfile(payload);
                const updated = unwrapApiData(response);
                if (updated && updated.email) {
                    profileToRender = {
                        ...profileToRender,
                        id: updated.id,
                        name: updated.name || payload.name,
                        email: updated.email || payload.email,
                        avatarUrl: updated.avatarUrl || payload.avatarUrl,
                        role: updated.role,
                        authProvider: updated.authProvider,
                        stats: updated.stats || profileToRender.stats
                    };
                    renderStats(updated.stats || profileToRender.stats || null);
                }
            } else {
                showBackendNotice(true);
            }

            saveLocalPrefs(profileToRender.email, state.localPrefs);
            state.serverProfile = profileToRender;
            syncCurrentUser(profileToRender);
            renderProfile(profileToRender, state.localPrefs);
            takeSnapshot();
            showToast('Đã lưu thay đổi hồ sơ thành công', 'success');
        } catch (error) {
            showToast(error.message || 'Không thể lưu hồ sơ', 'danger');
        } finally {
            if (el.saveProfileBtn) {
                setButtonLoading(el.saveProfileBtn, false, 'Lưu thay đổi');
            }
        }
    }

    function resetProfileForm() {
        if (!state.snapshot) {
            return;
        }

        state.serverProfile = { ...state.snapshot.profile };
        state.localPrefs = { ...state.snapshot.localPrefs };
        renderProfile(state.serverProfile, state.localPrefs);
        renderStats(state.serverProfile.stats || null);
        updatePasswordStrength('');
        showToast('Đã hoàn tác về dữ liệu gần nhất', 'info');
    }

    function togglePasswordSection() {
        if (!el.passwordSection || !el.passwordToggleIcon) return;

        const isOpening = el.passwordSection.style.display === 'none' || !el.passwordSection.style.display;
        el.passwordSection.style.display = isOpening ? 'block' : 'none';
        el.passwordToggleIcon.className = isOpening ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    }

    async function handleChangePassword(event) {
        event.preventDefault();

        const currentPassword = (el.currentPass?.value || '').trim();
        const newPassword = (el.newPass?.value || '').trim();
        const confirmPassword = (el.confirmPass?.value || '').trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin mật khẩu', 'danger');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'danger');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp', 'danger');
            return;
        }

        if (el.savePasswordBtn) {
            setButtonLoading(el.savePasswordBtn, true, 'Đang cập nhật...');
        }

        try {
            if (typeof window.changePassword !== 'function') {
                throw new Error('Thiếu hàm đổi mật khẩu từ API');
            }

            const response = await window.changePassword(currentPassword, newPassword);
            const message = response?.message || 'Đã cập nhật mật khẩu thành công';

            clearPasswordFields();
            updatePasswordStrength('');
            showToast(message, 'success');
        } catch (error) {
            showToast(error.message || 'Đổi mật khẩu thất bại', 'danger');
        } finally {
            if (el.savePasswordBtn) {
                setButtonLoading(el.savePasswordBtn, false, 'Cập nhật mật khẩu');
            }
        }
    }

    function handleAvatarUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Chỉ hỗ trợ tệp ảnh', 'danger');
            event.target.value = '';
            return;
        }

        if (file.size > 1024 * 1024) {
            showToast('Ảnh vượt quá 1MB, vui lòng chọn ảnh nhỏ hơn', 'warning');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            state.localPrefs.localAvatarDataUrl = String(reader.result || '');
            saveLocalPrefs(getCurrentEmail(), state.localPrefs);
            renderAvatar(getCurrentDisplayName(), state.serverProfile?.avatarUrl, state.localPrefs.localAvatarDataUrl);
            showToast('Đã cập nhật ảnh đại diện (lưu trên trình duyệt hiện tại)', 'info');
        };
        reader.onerror = () => {
            showToast('Không đọc được ảnh đại diện', 'danger');
        };
        reader.readAsDataURL(file);
    }

    async function handleLogout(event) {
        event.preventDefault();

        try {
            if (typeof apiLogout === 'function') {
                await apiLogout();
                return;
            }
        } catch (error) {
            // fallback to local logout
        }

        localStorage.removeItem('aimhigh_loggedIn');
        localStorage.removeItem('aimhigh_token');
        localStorage.removeItem('aimhigh_refreshToken');
        localStorage.removeItem('aimhigh_currentUser');
        window.location.href = 'login.html';
    }

    function collectProfilePayload() {
        const name = (el.fullName?.value || '').trim();
        const email = (el.emailField?.value || '').trim();
        const avatarUrl = normalizeOptionalText(el.avatarUrlField?.value);
        return { name, email, avatarUrl };
    }

    function collectLocalPrefsFromForm() {
        return {
            phone: normalizeOptionalText(el.phone?.value),
            targetScore: normalizeOptionalText(el.targetScore?.value) || '7.0',
            examDate: normalizeOptionalText(el.examDate?.value),
            bio: normalizeOptionalText(el.bio?.value),
            localAvatarDataUrl: state.localPrefs.localAvatarDataUrl || ''
        };
    }

    function takeSnapshot() {
        state.snapshot = {
            profile: { ...(state.serverProfile || {}) },
            localPrefs: { ...(state.localPrefs || {}) }
        };
    }

    function syncCurrentUser(profile) {
        const existingUser = getStoredUser();
        const merged = {
            ...existingUser,
            name: profile.name || existingUser.name,
            email: profile.email || existingUser.email,
            avatarUrl: profile.avatarUrl || existingUser.avatarUrl,
            role: profile.role || existingUser.role,
            authProvider: profile.authProvider || existingUser.authProvider
        };

        localStorage.setItem('aimhigh_currentUser', JSON.stringify(merged));
        if (localStorage.getItem('aimhigh_user')) {
            localStorage.setItem('aimhigh_user', JSON.stringify(merged));
        }
    }

    function readLocalPrefs(email) {
        const key = getProfilePrefsKey(email);
        if (!key) return {};

        try {
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveLocalPrefs(email, prefs) {
        const nextEmail = (email || getCurrentEmail() || '').trim().toLowerCase();
        if (!nextEmail) return;

        const prevEmail = (getCurrentEmail() || '').trim().toLowerCase();
        if (prevEmail && prevEmail !== nextEmail) {
            localStorage.removeItem(getProfilePrefsKey(prevEmail));
        }

        localStorage.setItem(getProfilePrefsKey(nextEmail), JSON.stringify(prefs || {}));
    }

    function getProfilePrefsKey(email) {
        if (!email) return '';
        return `aimhigh_profile_prefs_${String(email).trim().toLowerCase()}`;
    }

    function unwrapApiData(response) {
        if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
            return response.data;
        }
        return response;
    }

    function clearPasswordFields() {
        if (el.currentPass) el.currentPass.value = '';
        if (el.newPass) el.newPass.value = '';
        if (el.confirmPass) el.confirmPass.value = '';
    }

    function updatePasswordStrength(password) {
        const bars = [
            document.getElementById('bar1'),
            document.getElementById('bar2'),
            document.getElementById('bar3'),
            document.getElementById('bar4')
        ];

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

        const colors = ['var(--border-color)', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
        const labels = ['Nhập mật khẩu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];

        bars.forEach((bar, index) => {
            if (!bar) return;
            bar.style.background = index < score ? colors[score] : 'var(--border-color)';
        });

        if (el.strengthLabel) {
            el.strengthLabel.textContent = password ? labels[score] : labels[0];
        }
    }

    function setButtonLoading(button, loading, textWhenLoading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${textWhenLoading}`;
            return;
        }

        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml || button.innerHTML;
    }

    function showBackendNotice(show) {
        if (!el.backendNotice) return;
        el.backendNotice.classList.toggle('d-none', !show);
    }

    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast-success';

        const colorMap = {
            success: 'var(--success-color)',
            danger: 'var(--error-color)',
            warning: '#f59e0b',
            info: '#0ea5e9'
        };
        toast.style.background = colorMap[type] || colorMap.success;

        toast.innerHTML = `<i class="bi bi-info-circle-fill"></i> ${escapeHtml(message || 'Đã xử lý xong')}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2800);
    }

    function getCurrentEmail() {
        return (state.serverProfile?.email || getStoredUser().email || '').trim();
    }

    function getCurrentDisplayName() {
        return (state.serverProfile?.name || getStoredUser().name || 'Người dùng AimHigh').trim();
    }

    function getInitials(fullName) {
        const name = String(fullName || '').trim();
        if (!name) return 'AH';

        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        const first = parts[0][0] || '';
        const last = parts[parts.length - 1][0] || '';
        return `${first}${last}`.toUpperCase();
    }

    function formatDateTime(value) {
        if (!value) return 'Chưa có dữ liệu';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
        return date.toLocaleString('vi-VN', {
            hour12: false,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function normalizeOptionalText(value) {
        const normalized = String(value || '').trim();
        return normalized || '';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
