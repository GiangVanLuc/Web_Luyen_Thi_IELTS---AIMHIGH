// ===== AUTH.JS - Xử lý đăng nhập / đăng ký =====

/**
 * Kiểm tra định dạng email hợp lệ
 */
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Kiểm tra độ mạnh mật khẩu
 * @returns {number} 0-4 (0=rỗng, 1=yếu, 2=trung bình, 3=mạnh, 4=rất mạnh)
 */
function validatePassword(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
}

/**
 * Toggle hiển thị/ẩn mật khẩu
 * @param {string} inputId - id của input password
 * @param {string} iconId - id của icon (optional)
 */
function togglePasswordVisibility(inputId = 'password', iconId = null) {
    const input = document.getElementById(inputId);
    const icon = iconId
        ? document.getElementById(iconId)
        : input.closest('.input-wrapper')?.querySelector('.toggle-password i');

    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.replace('bi-eye', 'bi-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.replace('bi-eye-slash', 'bi-eye'); }
    }
}

// Alias để tương thích với login.html
function togglePassword() { togglePasswordVisibility('password'); }

/**
 * Xử lý đăng nhập
 */
function handleLogin(e) {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !validateEmail(email)) {
        showFieldError('email', 'Email không hợp lệ');
        return;
    }
    if (!password || password.length < 6) {
        showFieldError('password', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }

    const submitBtn = e.target.querySelector('[type=submit]');
    setButtonLoading(submitBtn, true, 'Đang đăng nhập...');

    // Simulate API call
    setTimeout(() => {
        const savedUser = JSON.parse(localStorage.getItem('aimhigh_user') || 'null');

        if (!savedUser) {
            setButtonLoading(submitBtn, false, 'Đăng nhập');
            showFormError('Chưa có tài khoản nào. Vui lòng đăng ký trước.');
            return;
        }

        if (savedUser.email !== email || savedUser.password !== password) {
            setButtonLoading(submitBtn, false, 'Đăng nhập');
            showFormError('Email hoặc mật khẩu không đúng.');
            return;
        }

        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify(savedUser));

        const remember = document.getElementById('remember')?.checked;
        if (remember) {
            localStorage.setItem('aimhigh_remember', 'true');
        }

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        window.location.href = redirect || 'dashboard.html';
    }, 800);
}

/**
 * Xử lý đăng ký
 */
function handleRegister(e) {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('fullName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const terms = document.getElementById('terms')?.checked;

    let isValid = true;

    if (!name || name.length < 2) {
        showFieldError('fullName', 'Vui lòng nhập họ và tên (ít nhất 2 ký tự)');
        isValid = false;
    }
    if (!email || !validateEmail(email)) {
        showFieldError('email', 'Email không hợp lệ');
        isValid = false;
    }
    if (!password || validatePassword(password) < 2) {
        showFieldError('password', 'Mật khẩu quá yếu. Dùng chữ hoa, số hoặc ký tự đặc biệt');
        isValid = false;
    }
    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Mật khẩu xác nhận không khớp');
        isValid = false;
    }
    if (!terms) {
        showFormError('Bạn phải đồng ý với điều khoản sử dụng');
        isValid = false;
    }

    if (!isValid) return;

    const submitBtn = e.target.querySelector('[type=submit]');
    setButtonLoading(submitBtn, true, 'Đang tạo tài khoản...');

    setTimeout(() => {
        const existingUser = JSON.parse(localStorage.getItem('aimhigh_user') || 'null');
        if (existingUser && existingUser.email === email) {
            setButtonLoading(submitBtn, false, 'Đăng ký');
            showFieldError('email', 'Email này đã được đăng ký');
            return;
        }

        const newUser = { name, email, password, createdAt: new Date().toISOString() };
        localStorage.setItem('aimhigh_user', JSON.stringify(newUser));
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify(newUser));

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        window.location.href = redirect || 'dashboard.html';
    }, 1000);
}

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {boolean}
 */
function checkAuth() {
    return localStorage.getItem('aimhigh_loggedIn') === 'true';
}

/**
 * Đăng xuất
 */
function logout() {
    localStorage.removeItem('aimhigh_loggedIn');
    localStorage.removeItem('aimhigh_currentUser');
    window.location.href = 'login.html';
}

/**
 * Lấy thông tin user hiện tại
 */
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('aimhigh_currentUser') || localStorage.getItem('aimhigh_user') || '{}');
}

// ===== HELPER FUNCTIONS =====

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = 'var(--error-color)';
    let errEl = field.closest('.form-group')?.querySelector('.field-error');
    if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'field-error';
        errEl.style.cssText = 'color:var(--error-color);font-size:0.8125rem;display:block;margin-top:4px;';
        field.closest('.form-group, .input-wrapper')?.after(errEl) ||
        field.after(errEl);
    }
    errEl.textContent = message;
}

function showFormError(message) {
    let errEl = document.getElementById('formError');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'formError';
        errEl.style.cssText = 'background:rgba(239,68,68,0.1);color:var(--error-color);padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:0.9375rem;';
        const form = document.querySelector('form');
        form?.prepend(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('input[style*="border-color"]').forEach(el => el.style.borderColor = '');
    const formErr = document.getElementById('formError');
    if (formErr) formErr.style.display = 'none';
}

function setButtonLoading(btn, loading, text) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${text}`;
    } else {
        btn.disabled = false;
        btn.textContent = text || btn.dataset.originalText || 'Submit';
    }
}

// Real-time validation on register form
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    if (passwordInput && document.getElementById('strengthBars')) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrengthUI(passwordInput.value);
        });
    }
    const confirmInput = document.getElementById('confirmPassword');
    if (confirmInput) {
        confirmInput.addEventListener('input', () => {
            const pwd = document.getElementById('password')?.value;
            if (confirmInput.value && confirmInput.value !== pwd) {
                confirmInput.style.borderColor = 'var(--error-color)';
            } else {
                confirmInput.style.borderColor = '';
            }
        });
    }
});

function updatePasswordStrengthUI(password) {
    const strength = validatePassword(password);
    const bars = document.querySelectorAll('#strengthBars .strength-bar');
    const label = document.getElementById('strengthLabel');
    const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    const labels = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
    bars.forEach((bar, i) => {
        bar.style.background = i < strength ? colors[strength] : 'var(--border-color)';
    });
    if (label) label.textContent = password.length ? (labels[strength] || 'Nhập mật khẩu') : 'Nhập mật khẩu';
}

