// ===== API.JS - Giao tiếp với Backend =====

const API_BASE = 'http://localhost:8085/api';

/**
 * Helper: thực hiện fetch với headers mặc định
 */
async function apiFetch(endpoint, options = {}) {
    const { _retry = false, ...fetchOptions } = options;
    const token = localStorage.getItem('aimhigh_token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...fetchOptions,
            headers: { ...defaultHeaders, ...fetchOptions.headers }
        });

        if (response.status === 401) {
            if (!_retry && !endpoint.startsWith('/auth/')) {
                const refreshedToken = await apiRefreshAccessToken();
                if (refreshedToken) {
                    return apiFetch(endpoint, { ...fetchOptions, _retry: true });
                }
            }
            localStorage.removeItem('aimhigh_loggedIn');
            localStorage.removeItem('aimhigh_token');
            localStorage.removeItem('aimhigh_refreshToken');
            const isSubDir = window.location.pathname.includes('/admin/');
            window.location.href = isSubDir ? '../login.html' : 'login.html';
            return null;
        }

        if (response.status === 403) {
            const isAdminEndpoint = endpoint.startsWith('/admin/');
            const currentUser = JSON.parse(localStorage.getItem('aimhigh_currentUser') || '{}');
            const role = String(currentUser?.role || '').toUpperCase();
            const errorData = await response.json().catch(() => ({}));

            const adminRoles = ['ADMIN'];
            if (isAdminEndpoint && !adminRoles.includes(role)) {
                throw new Error('Bạn chưa có quyền ADMIN. Vui lòng đăng nhập bằng tài khoản ADMIN để dùng chức năng này.');
            }

            throw new Error(errorData.message || 'Bạn không có quyền truy cập chức năng này (HTTP 403).');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error(`API Error [${endpoint}]:`, err.message);
        throw err;
    }
}

async function apiRefreshAccessToken() {
    const refreshToken = localStorage.getItem('aimhigh_refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data?.accessToken) return null;

        localStorage.setItem('aimhigh_token', data.accessToken);
        if (data?.refreshToken) {
            localStorage.setItem('aimhigh_refreshToken', data.refreshToken);
        }
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify({
            email: data.email,
            name: data.name,
            role: data.role
        }));
        return data.accessToken;
    } catch (_) {
        return null;
    }
}

// ===== AUTH =====

/**
 * Đăng nhập
 * @param {string} email
 * @param {string} password
 */
async function apiLogin(email, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    if (data?.accessToken) {
        localStorage.setItem('aimhigh_token', data.accessToken);
        if (data?.refreshToken) {
            localStorage.setItem('aimhigh_refreshToken', data.refreshToken);
        }
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify({
            email: data.email,
            name: data.name,
            role: data.role
        }));
    }
    return data;
}

/**
 * Đăng ký
 * @param {object} userData - { name, email, password }
 */
async function apiRegister(userData) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    if (data?.accessToken) {
        localStorage.setItem('aimhigh_token', data.accessToken);
        if (data?.refreshToken) {
            localStorage.setItem('aimhigh_refreshToken', data.refreshToken);
        }
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify({
            email: data.email,
            name: data.name,
            role: data.role
        }));
    }
    return data;
}

/**
 * Đăng xuất
 */
async function apiLogout() {
    const refreshToken = localStorage.getItem('aimhigh_refreshToken');
    try {
        if (refreshToken) {
            await apiFetch('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });
        }
    } catch (e) {
        // Silent fail
    } finally {
        localStorage.removeItem('aimhigh_token');
        localStorage.removeItem('aimhigh_refreshToken');
        localStorage.removeItem('aimhigh_loggedIn');
        localStorage.removeItem('aimhigh_currentUser');
        const isSubDir = window.location.pathname.includes('/admin/');
        window.location.href = isSubDir ? '../login.html' : 'login.html';
    }
}

// ===== TESTS =====

/**
 * Lấy danh sách bài thi
 * @param {string} skillType - 'listening' | 'reading' | 'writing' | 'speaking'
 * @param {number} page - trang hiện tại (bắt đầu từ 1)
 * @param {object} filters - { difficulty, search }
 */
async function getTests(skillType, page = 1, filters = {}) {
    const params = new URLSearchParams({ page, limit: 12, ...filters });
    return apiFetch(`/tests/${skillType}?${params}`);
}

/**
 * Lấy chi tiết bài thi
 * @param {string} testId
 */
async function getTestById(testId) {
    return apiFetch(`/tests/${testId}`);
}

/**
 * Nộp bài thi
 * @param {string} testId
 * @param {object} answers - { questionId: answerId, ... }
 */
async function submitTest(testId, answers) {
    return apiFetch(`/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, submittedAt: new Date().toISOString() })
    });
}

/**
 * Lấy kết quả bài thi
 * @param {string} resultId
 */
async function getResult(resultId) {
    return apiFetch(`/results/${resultId}`);
}

/**
 * Lấy lịch sử bài thi của user
 * @param {number} page
 */
async function getTestHistory(page = 1) {
    return apiFetch(`/results/history?page=${page}&limit=10`);
}



/**
 * Lấy thông tin profile
 */
async function getProfile() {
    return apiFetch('/users/profile');
}

/**
 * Cập nhật thông tin profile
 * @param {object} userData
 */
async function updateProfile(userData) {
    return apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
}

/**
 * Tải lên ảnh đại diện Avatar
 * @param {File} file
 */
async function apiUploadAvatar(file) {
    const token = localStorage.getItem('aimhigh_token');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/users/avatar`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed: HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Lấy thống kê dashboard
 */
async function getDashboardStats() {
    return apiFetch('/users/dashboard');
}

/**
 * Lấy thống kê admin dashboard
 */
async function adminGetDashboardStats() {
    return apiFetch('/admin/dashboard/stats');
}

/**
 * Đổi mật khẩu
 * @param {string} currentPassword
 * @param {string} newPassword
 */
async function changePassword(currentPassword, newPassword) {
    return apiFetch('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });
}

// ===== MOCK DATA (Fallback khi backend chưa sẵn sàng) =====

const MOCK_TESTS = {
    listening: [
        { id: 'l1', title: 'Cambridge IELTS 18 - Test 1', difficulty: 'Hard', questions: 40, duration: 30, rating: 4.8 },
        { id: 'l2', title: 'Cambridge IELTS 17 - Test 2', difficulty: 'Medium', questions: 40, duration: 30, rating: 4.6 },
        { id: 'l3', title: 'Cambridge IELTS 16 - Test 3', difficulty: 'Medium', questions: 40, duration: 30, rating: 4.5 },
    ],
    reading: [
        { id: 'r1', title: 'Cambridge IELTS 18 - Reading Test 1', difficulty: 'Hard', questions: 40, duration: 60, rating: 4.7 },
        { id: 'r2', title: 'Technology and Society', difficulty: 'Medium', questions: 40, duration: 60, rating: 4.5 },
    ]
};

/**
 * Lấy mock data khi backend không hoạt động
 */
function getMockTests(skillType, page = 1) {
    const tests = MOCK_TESTS[skillType] || [];
    return Promise.resolve({
        data: tests,
        total: tests.length,
        page,
        totalPages: 1
    });
}

/**
 * Wrapper: thử API thật trước, fallback sang mock nếu lỗi
 */
async function getTestsWithFallback(skillType, page, filters) {
    try {
        return await getTests(skillType, page, filters);
    } catch (e) {
        console.warn('Backend không khả dụng, dùng mock data');
        return getMockTests(skillType, page);
    }
}

// ===== ADMIN API =====

/**
 * Upload media file (audio, image)
 * @param {File} file
 * @param {string} type - 'audio' | 'image'
 */
async function adminUploadMedia(file, type = 'audio') {
    const token = localStorage.getItem('aimhigh_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${API_BASE}/admin/media/upload`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed: HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Tạo đề thi mới
 * @param {object} testData - { title, skill, duration, difficulty, description, passage, questions, status }
 */
async function adminCreateTest(testData) {
    return apiFetch('/admin/exams', {
        method: 'POST',
        body: JSON.stringify(testData)
    });
}

/**
 * Cập nhật đề thi
 * @param {string} testId
 * @param {object} testData
 */
async function adminUpdateTest(testId, testData) {
    return apiFetch(`/admin/exams/${testId}`, {
        method: 'PUT',
        body: JSON.stringify(testData)
    });
}

/**
 * Cập nhật trạng thái đề thi (publish/archive/draft)
 * @param {string} testId
 * @param {string} status - 'published' | 'draft' | 'archived'
 */
async function adminUpdateTestStatus(testId, status) {
    return apiFetch(`/admin/exams/${testId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

/**
 * Xóa đề thi
 * @param {string} testId
 */
async function adminDeleteTest(testId) {
    return apiFetch(`/admin/exams/${testId}`, {
        method: 'DELETE'
    });
}

/**
 * Lấy danh sách đề thi cho admin (có filter, pagination)
 * @param {object} params - { page, limit, skill, status, search }
 */
async function adminGetTests(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        if (key === 'skill') {
            query.set(key, String(value).toUpperCase());
        } else {
            query.set(key, String(value));
        }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/admin/exams${suffix}`);
}

async function adminImportExamJson(payload) {
    return apiFetch('/admin/exams/import/json', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function adminImportExamExcel(file) {
    const token = localStorage.getItem('aimhigh_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/admin/exams/import/excel`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });

    if (response.status === 401) {
        localStorage.removeItem('aimhigh_loggedIn');
        localStorage.removeItem('aimhigh_token');
        const isSubDir = window.location.pathname.includes('/admin/');
        window.location.href = isSubDir ? '../login.html' : 'login.html';
        return null;
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
}

// ===== ADMIN VOCABULARY API =====

async function adminGetVocabulary(params = {}) {
    const query = new URLSearchParams({ page: 0, size: 50, ...params });
    return apiFetch(`/admin/vocabulary?${query}`);
}

async function adminUpsertVocabulary(payload) {
    return apiFetch('/admin/vocabulary', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function adminDeleteVocabulary(vocabularyId) {
    return apiFetch(`/admin/vocabulary/${vocabularyId}`, {
        method: 'DELETE'
    });
}

// ===== Kho từ vựng: Thư mục > Chủ đề (taxonomy) =====
async function adminGetVocabTaxonomy() {
    return apiFetch('/admin/vocabulary/taxonomy');
}
async function adminCreateVocabFolder(name) {
    return apiFetch('/admin/vocabulary/folders', { method: 'POST', body: JSON.stringify({ name }) });
}
async function adminUpdateVocabFolder(id, name) {
    return apiFetch(`/admin/vocabulary/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}
async function adminDeleteVocabFolder(id) {
    return apiFetch(`/admin/vocabulary/folders/${id}`, { method: 'DELETE' });
}
async function adminCreateVocabTopic(name, folderId) {
    return apiFetch('/admin/vocabulary/topics', { method: 'POST', body: JSON.stringify({ name, folderId }) });
}
async function adminUpdateVocabTopic(id, name, folderId) {
    return apiFetch(`/admin/vocabulary/topics/${id}`, { method: 'PUT', body: JSON.stringify({ name, folderId }) });
}
async function adminDeleteVocabTopic(id) {
    return apiFetch(`/admin/vocabulary/topics/${id}`, { method: 'DELETE' });
}
// Student: cây chủ đề kho AimHigh Pick (dùng chung, admin cập nhật là thấy)
async function getVocabTaxonomy() {
    return apiFetch('/vocabulary/taxonomy');
}

async function adminImportVocabularyJson(payload) {
    return apiFetch('/admin/vocabulary/import/json', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function adminImportVocabularyExcel(file) {
    const token = localStorage.getItem('aimhigh_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/admin/vocabulary/import/excel`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
    });

    if (response.status === 401) {
        localStorage.removeItem('aimhigh_loggedIn');
        localStorage.removeItem('aimhigh_token');
        const isSubDir = window.location.pathname.includes('/admin/');
        window.location.href = isSubDir ? '../login.html' : 'login.html';
        return null;
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
}

async function adminDownloadExamTemplate(skill) {
    const token = localStorage.getItem('aimhigh_token');
    const response = await fetch(`${API_BASE}/admin/exams/template/${encodeURIComponent(skill)}`, {
        method: 'GET',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.blob();
}

async function adminDownloadFullSampleExamTemplate(skill) {
    const token = localStorage.getItem('aimhigh_token');
    const response = await fetch(`${API_BASE}/admin/exams/template/${encodeURIComponent(skill)}/full-sample`, {
        method: 'GET',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.blob();
}

/**
 * Lấy danh sách bài nộp chưa chấm điểm
 * @param {object} params - { page, limit, skill }
 */
async function adminGetUngradedSubmissions(params = {}) {
    const query = new URLSearchParams({ page: 1, limit: 20, ...params });
    return apiFetch(`/admin/submissions/ungraded?${query}`);
}

/**
 * Chấm điểm bài nộp
 * @param {string} submissionId
 * @param {object} gradeData - { scores: { task, coherence, lexical, grammar }, overall, feedback }
 */
async function adminGradeSubmission(submissionId, gradeData) {
    return apiFetch(`/admin/submissions/${submissionId}/grade`, {
        method: 'POST',
        body: JSON.stringify(gradeData)
    });
}

/**
 * Lấy danh sách users cho admin
 * @param {object} params - { page, limit, role, search }
 */
async function adminGetUsers(params = {}) {
    const query = new URLSearchParams({ page: 1, limit: 10, ...params });
    return apiFetch(`/admin/users?${query}`);
}

/**
 * Tạo tài khoản mới (admin)
 * @param {object} payload - { name, email, password, role }
 */
async function adminCreateUser(payload) {
    return apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Cập nhật vai trò user
 * @param {string} userId
 * @param {string} role - 'student' | 'teacher' | 'admin'
 */
async function adminUpdateUserRole(userId, role) {
    return apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
    });
}

/**
 * Khóa / mở khóa tài khoản
 * @param {string} userId
 * @param {boolean} locked
 */
async function adminToggleUserLock(userId, locked) {
    return apiFetch(`/admin/users/${userId}/lock`, {
        method: 'PATCH',
        body: JSON.stringify({ locked })
    });
}

/**
 * Lấy danh sách nhật ký hệ thống (Admin)
 * @param {object} params - { page, limit, action, accountEmail, search }
 */
async function adminGetAuditLogs(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        query.set(key, String(value));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/admin/audit-logs${suffix}`);
}


// ===== EXAM SESSION API (Listening & Reading) =====

function normalizeAttemptMode(mode) {
    const raw = String(mode || '').trim().toUpperCase();
    if (raw === 'REAL' || raw === 'EXAM') return 'EXAM';
    return 'PRACTICE';
}

/**
 * Lấy dữ liệu đề thi (đã strip correctAnswer)
 * @param {number} examId
 */
async function getExamData(examId) {
    return apiFetch(`/exams/${examId}`);
}

/**
 * Lấy danh sách đề thi cho trang practice
 */
async function getExamList() {
    return apiFetch('/exams');
}

/**
 * Bắt đầu phiên thi mới
 * @param {number} examId
 * @param {string} mode - 'practice' | 'real'
 */
async function startAttempt(examId, mode = 'practice') {
    const backendMode = normalizeAttemptMode(mode);
    return apiFetch('/attempts/start', {
        method: 'POST',
        body: JSON.stringify({ examId, mode: backendMode })
    });
}

/**
 * Lưu tiến độ thi (auto-save, mỗi câu)
 * @param {number} attemptId
 * @param {number} questionNumber
 * @param {string} answerText
 */
async function saveAttemptProgress(attemptId, questionNumber, answerText) {
    return apiFetch(`/attempts/${attemptId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ questionNumber, answerText })
    });
}

/**
 * Lấy lại tiến độ thi đã lưu (sau khi F5)
 * @param {number} attemptId
 */
async function getAttemptProgress(attemptId) {
    return apiFetch(`/attempts/${attemptId}/progress`);
}

/**
 * Nộp bài thi
 * @param {number} attemptId
 * @param {Array} answers - [{ questionNumber, answerText, isSkipped }]
 */
async function submitAttemptAnswers(attemptId, answers, timeSpent = null) {
    const payload = { answers };
    if (Number.isFinite(Number(timeSpent)) && Number(timeSpent) >= 0) {
        payload.timeSpent = Math.floor(Number(timeSpent));
    }
    return apiFetch(`/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Lấy kết quả bài làm theo attempt
 * @param {number} attemptId
 */
async function getAttemptResult(attemptId) {
    return apiFetch(`/attempts/${attemptId}/result`);
}

/**
 * Lấy lịch sử các lần làm bài của user hiện tại
 */
async function getMyAttempts() {
    return apiFetch('/users/me/attempts');
}

// ===== NOTE & HIGHLIGHT API =====

async function createNote(attemptId, questionId, content) {
    return apiFetch(`/attempts/${attemptId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ questionId, content })
    });
}
async function updateNote(noteId, content) {
    return apiFetch(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content })
    });
}

async function getAttemptNotes(attemptId) {
    return apiFetch(`/attempts/${attemptId}/notes`);
}

async function deleteNote(noteId) {
    return apiFetch(`/notes/${noteId}`, { method: 'DELETE' });
}

async function createHighlight(attemptId, passageId, startOffset, endOffset, note) {
    return apiFetch(`/attempts/${attemptId}/highlights`, {
        method: 'POST',
        body: JSON.stringify({ passageId, startOffset, endOffset, note })
    });
}

async function getAttemptHighlights(attemptId, passageId = null) {
    const suffix = passageId == null ? '' : `?passageId=${encodeURIComponent(passageId)}`;
    return apiFetch(`/attempts/${attemptId}/highlights${suffix}`);
}

async function updateHighlightNote(highlightId, note) {
    return apiFetch(`/highlights/${highlightId}/note`, {
        method: 'PATCH',
        body: JSON.stringify({ note })
    });
}

async function deleteHighlight(highlightId) {
    return apiFetch(`/highlights/${highlightId}`, { method: 'DELETE' });
}

// ===== USER VOCABULARY API =====

async function apiLookupVocab(word) {
    return apiFetch(`/vocabulary/lookup?word=${encodeURIComponent(word)}`);
}

async function apiGetGlobalVocab(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        query.set(key, String(value));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/vocabulary${suffix}`);
}

async function apiSaveUserVocab(vocabId, options = {}) {
    const payload = {
        vocabId
    };

    if (options && typeof options === 'object') {
        if (Number.isFinite(Number(options.groupId))) {
            payload.groupId = Number(options.groupId);
        }
        if (typeof options.groupName === 'string') {
            payload.groupName = options.groupName;
        }
        if (typeof options.note === 'string') {
            payload.note = options.note;
        }
    } else if (typeof options === 'string') {
        payload.groupName = options;
    }

    return apiFetch(`/user-vocabulary`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function apiSaveCustomUserVocab(payload = {}) {
    return apiFetch('/user-vocabulary/custom', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function apiGetUserVocab(filters = {}) {
    let queryData = {};

    if (typeof filters === 'boolean') {
        queryData.learned = filters;
    } else if (filters && typeof filters === 'object') {
        queryData = { ...filters };
    }

    const query = new URLSearchParams();
    Object.entries(queryData).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        query.set(key, String(value));
    });

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/user-vocabulary${suffix}`);
}

async function apiDeleteUserVocab(id) {
    return apiFetch(`/user-vocabulary/${id}`, {
        method: 'DELETE'
    });
}

async function apiUpdateUserVocabStatus(id, learnLevel) {
    return apiFetch(`/user-vocabulary/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ learnLevel })
    });
}

async function apiUpdateUserVocab(id, payload = {}) {
    return apiFetch(`/user-vocabulary/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
}

async function apiBatchSaveUserVocab(vocabIds, options = {}) {
    return apiFetch('/user-vocabulary/batch-save', {
        method: 'POST',
        body: JSON.stringify({
            vocabIds,
            groupId: options.groupId,
            groupName: options.groupName,
            note: options.note
        })
    });
}

async function apiBatchUpdateUserVocabStatus(userVocabularyIds, learnLevel) {
    return apiFetch('/user-vocabulary/batch-status', {
        method: 'PATCH',
        body: JSON.stringify({ userVocabularyIds, learnLevel })
    });
}

async function apiBatchDeleteUserVocab(userVocabularyIds) {
    return apiFetch('/user-vocabulary/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ userVocabularyIds })
    });
}

async function apiGetUserVocabGroups() {
    return apiFetch('/user-vocabulary-groups');
}

async function apiCreateUserVocabGroup(name) {
    return apiFetch('/user-vocabulary-groups', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}

async function apiRenameUserVocabGroup(groupId, name) {
    return apiFetch(`/user-vocabulary-groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
    });
}

async function apiDeleteUserVocabGroup(groupId) {
    return apiFetch(`/user-vocabulary-groups/${groupId}`, {
        method: 'DELETE'
    });
}
