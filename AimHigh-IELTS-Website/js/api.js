// ===== API.JS - Giao tiếp với Backend =====

const API_BASE = 'http://localhost:8080/api';

/**
 * Helper: thực hiện fetch với headers mặc định
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('aimhigh_token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        if (response.status === 401) {
            localStorage.removeItem('aimhigh_loggedIn');
            localStorage.removeItem('aimhigh_token');
            window.location.href = 'login.html';
            return null;
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
    if (data?.token) {
        localStorage.setItem('aimhigh_token', data.token);
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify(data.user));
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
    if (data?.token) {
        localStorage.setItem('aimhigh_token', data.token);
        localStorage.setItem('aimhigh_loggedIn', 'true');
        localStorage.setItem('aimhigh_currentUser', JSON.stringify(data.user));
    }
    return data;
}

/**
 * Đăng xuất
 */
async function apiLogout() {
    try {
        await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
        // Silent fail
    } finally {
        localStorage.removeItem('aimhigh_token');
        localStorage.removeItem('aimhigh_loggedIn');
        localStorage.removeItem('aimhigh_currentUser');
        window.location.href = 'login.html';
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

// ===== FLASHCARDS =====

/**
 * Lấy danh sách flashcard trong deck
 * @param {string} deckId
 */
async function getFlashcards(deckId) {
    return apiFetch(`/flashcards/decks/${deckId}/cards`);
}

/**
 * Tạo flashcard mới
 * @param {object} cardData - { word, meaning, example, phonetic, deckId }
 */
async function createFlashcard(cardData) {
    return apiFetch('/flashcards/cards', {
        method: 'POST',
        body: JSON.stringify(cardData)
    });
}

/**
 * Cập nhật tiến trình review flashcard
 * @param {string} cardId
 * @param {number} level - 1-4
 */
async function updateFlashcardReview(cardId, level) {
    return apiFetch(`/flashcards/cards/${cardId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ level, reviewedAt: new Date().toISOString() })
    });
}

/**
 * Lấy danh sách decks của user
 */
async function getDecks() {
    return apiFetch('/flashcards/decks');
}

/**
 * Tạo deck mới
 * @param {string} name
 */
async function createDeck(name) {
    return apiFetch('/flashcards/decks', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}

// ===== USER =====

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
 * Lấy thống kê dashboard
 */
async function getDashboardStats() {
    return apiFetch('/users/dashboard');
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
    return apiFetch('/admin/tests', {
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
    return apiFetch(`/admin/tests/${testId}`, {
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
    return apiFetch(`/admin/tests/${testId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

/**
 * Xóa đề thi
 * @param {string} testId
 */
async function adminDeleteTest(testId) {
    return apiFetch(`/admin/tests/${testId}`, {
        method: 'DELETE'
    });
}

/**
 * Lấy danh sách đề thi cho admin (có filter, pagination)
 * @param {object} params - { page, limit, skill, status, search }
 */
async function adminGetTests(params = {}) {
    const query = new URLSearchParams({ page: 1, limit: 10, ...params });
    return apiFetch(`/admin/tests?${query}`);
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
 * Lấy thống kê tổng quan cho admin dashboard
 */
async function adminGetDashboardStats() {
    return apiFetch('/admin/dashboard/stats');
}

// ===== EXAM SESSION API (Listening & Reading) =====

/**
 * Lấy dữ liệu đề thi (đã strip correctAnswer)
 * @param {number} examId
 */
async function getExamData(examId) {
    return apiFetch(`/exams/${examId}`);
}

/**
 * Bắt đầu phiên thi mới
 * @param {number} examId
 * @param {string} mode - 'practice' | 'real'
 */
async function startAttempt(examId, mode = 'practice') {
    return apiFetch('/attempts/start', {
        method: 'POST',
        body: JSON.stringify({ examId, mode })
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
async function submitAttemptAnswers(attemptId, answers) {
    return apiFetch(`/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
    });
}

/**
 * Tạo highlight trong Reading practice
 * @param {number} attemptId
 * @param {object} payload - { passageId, startOffset, endOffset, color, note }
 */
async function createPracticeHighlight(attemptId, payload) {
    return apiFetch(`/attempts/${attemptId}/highlights`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Lấy danh sách highlight của attempt
 * @param {number} attemptId
 * @param {number|null} passageId
 */
async function getPracticeHighlights(attemptId, passageId = null) {
    const query = passageId ? `?passageId=${passageId}` : '';
    return apiFetch(`/attempts/${attemptId}/highlights${query}`);
}

/**
 * Xóa highlight
 * @param {number} highlightId
 */
async function deletePracticeHighlight(highlightId) {
    return apiFetch(`/highlights/${highlightId}`, {
        method: 'DELETE'
    });
}

/**
 * Tạo note theo question (API backend hiện tại yêu cầu questionId)
 * @param {number} attemptId
 * @param {object} payload - { questionId, content }
 */
async function createPracticeNote(attemptId, payload) {
    return apiFetch(`/attempts/${attemptId}/notes`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Lấy notes theo attempt
 * @param {number} attemptId
 */
async function getPracticeNotes(attemptId) {
    return apiFetch(`/attempts/${attemptId}/notes`);
}

/**
 * Xóa note
 * @param {number} noteId
 */
async function deletePracticeNote(noteId) {
    return apiFetch(`/notes/${noteId}`, {
        method: 'DELETE'
    });
}
