// ===== TEST.JS - Xử lý làm bài thi =====

let timerInterval = null;
let totalSeconds = 0;
let currentQuestion = 1;
let totalQuestions = 40;
let answers = {};
let autoSaveInterval = null;

/**
 * Bắt đầu countdown timer
 * @param {number} minutes - số phút
 */
function startTimer(minutes) {
    totalSeconds = minutes * 60;
    updateTimerDisplay(totalSeconds);

    timerInterval = setInterval(() => {
        totalSeconds--;
        updateTimerDisplay(totalSeconds);

        if (totalSeconds <= 300) { // 5 phút còn lại
            document.getElementById('timer')?.classList.add('timer-warning');
        }
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            submitTest(true);
        }
    }, 1000);
}

/**
 * Cập nhật hiển thị timer
 */
function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    const display = `${mins}:${secs}`;

    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = display;
        if (seconds <= 300) {
            timerEl.style.color = 'var(--error-color)';
        }
    }
}

/**
 * Dừng timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Chọn đáp án
 * @param {number} questionId
 * @param {string|number} answerId
 */
function selectAnswer(questionId, answerId) {
    answers[questionId] = answerId;

    // Update UI
    const questionEl = document.querySelector(`[data-question="${questionId}"]`);
    if (questionEl) {
        questionEl.querySelectorAll('.option-item, .answer-option').forEach(opt => {
            opt.classList.remove('selected', 'active');
        });
        const selectedOpt = questionEl.querySelector(`[data-answer="${answerId}"]`);
        selectedOpt?.classList.add('selected');
    }

    // Update navigator
    updateNavigatorCell(questionId, 'answered');
    updateProgress();
    autoSave();
}

/**
 * Chuyển đến câu hỏi cụ thể
 * @param {number} questionNumber
 */
function navigateToQuestion(questionNumber) {
    const allQuestions = document.querySelectorAll('.question-block, [data-question]');
    allQuestions.forEach(q => q.style.display = 'none');

    const targetQ = document.querySelector(`[data-question="${questionNumber}"], #question-${questionNumber}`);
    if (targetQ) {
        targetQ.style.display = 'block';
        targetQ.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    currentQuestion = questionNumber;
    updateNavigatorCell(questionNumber, 'current');
    updateProgress();
}

/**
 * Cập nhật màu ô navigator
 */
function updateNavigatorCell(questionNumber, status) {
    const cell = document.querySelector(`.nav-cell[data-q="${questionNumber}"], .q-nav-btn[data-q="${questionNumber}"]`);
    if (!cell) return;
    cell.classList.remove('answered', 'current', 'skipped');
    if (status === 'answered') {
        cell.classList.add('answered');
    } else if (status === 'current') {
        cell.classList.add('current');
    }
}

/**
 * Cập nhật thanh tiến độ
 */
function updateProgress() {
    const answered = Object.keys(answers).length;
    const percent = Math.round((answered / totalQuestions) * 100);

    const progressBar = document.querySelector('.test-progress-bar, #testProgress');
    if (progressBar) progressBar.style.width = percent + '%';

    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = `${answered}/${totalQuestions} câu`;

    const answeredCount = document.getElementById('answeredCount');
    if (answeredCount) answeredCount.textContent = answered;
}

/**
 * Nộp bài
 * @param {boolean} autoSubmit - true nếu hết giờ
 */
function submitTest(autoSubmit = false) {
    stopTimer();
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    const answered = Object.keys(answers).length;
    const unanswered = totalQuestions - answered;

    if (!autoSubmit && unanswered > 0) {
        const confirm = window.confirm(
            `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`
        );
        if (!confirm) {
            startTimer(Math.floor(totalSeconds / 60) + 1);
            return;
        }
    }

    // Save result to localStorage
    const result = {
        answers,
        totalAnswered: answered,
        totalQuestions,
        timeSpent: calculateTimeSpent(),
        submittedAt: new Date().toISOString()
    };
    localStorage.setItem('aimhigh_lastResult', JSON.stringify(result));
    localStorage.removeItem('aimhigh_autoSave');

    // Show loading state then redirect
    showSubmitOverlay();
    setTimeout(() => {
        window.location.href = 'result.html';
    }, 1500);
}

/**
 * Xác nhận thoát giữa chừng
 */
function confirmExit() {
    const answered = Object.keys(answers).length;
    if (answered > 0) {
        const confirm = window.confirm('Bài làm của bạn sẽ không được lưu nếu thoát. Bạn có chắc muốn thoát không?');
        if (confirm) {
            stopTimer();
            window.location.href = 'index.html';
        }
    } else {
        stopTimer();
        window.location.href = 'index.html';
    }
}

/**
 * Tự động lưu bài làm
 */
function autoSave() {
    const saveData = {
        answers,
        currentQuestion,
        timeRemaining: totalSeconds,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('aimhigh_autoSave', JSON.stringify(saveData));
}

/**
 * Khôi phục bài làm đã lưu
 */
function restoreAutoSave() {
    const saved = JSON.parse(localStorage.getItem('aimhigh_autoSave') || 'null');
    if (!saved) return false;

    const savedTime = new Date(saved.savedAt);
    const now = new Date();
    const diffMinutes = (now - savedTime) / 1000 / 60;

    if (diffMinutes > 60) {
        localStorage.removeItem('aimhigh_autoSave');
        return false;
    }

    const restore = window.confirm(
        `Tìm thấy bài làm dở từ ${Math.round(diffMinutes)} phút trước. Bạn muốn tiếp tục không?`
    );

    if (restore) {
        answers = saved.answers || {};
        currentQuestion = saved.currentQuestion || 1;
        Object.keys(answers).forEach(qId => {
            updateNavigatorCell(parseInt(qId), 'answered');
        });
        updateProgress();
        return true;
    }
    return false;
}

/**
 * Bắt đầu auto-save theo chu kỳ
 */
function startAutoSave(intervalSeconds = 30) {
    autoSaveInterval = setInterval(autoSave, intervalSeconds * 1000);
}

/**
 * Tính thời gian đã làm bài
 */
function calculateTimeSpent() {
    const initialSeconds = parseInt(document.getElementById('initialTime')?.dataset.seconds || '1800');
    return initialSeconds - totalSeconds;
}

/**
 * Hiển thị overlay khi nộp bài
 */
function showSubmitOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(255,255,255,0.95);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;gap:16px;
    `;
    overlay.innerHTML = `
        <div class="spinner-border text-primary" style="width:3rem;height:3rem;"></div>
        <h4 style="color:var(--text-primary);">Đang nộp bài...</h4>
        <p style="color:var(--text-secondary);">AI đang chấm điểm bài của bạn</p>
    `;
    document.body.appendChild(overlay);
}

/**
 * Highlight text trong passage (Reading)
 */
function initHighlight() {
    const passage = document.getElementById('passage');
    if (!passage) return;

    passage.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const selectedText = selection.toString().trim();
        if (selectedText.length < 2) return;

        showHighlightMenu(selection, selectedText);
    });
}

function showHighlightMenu(selection, text) {
    document.querySelector('.highlight-menu')?.remove();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.className = 'highlight-menu';
    menu.style.cssText = `
        position:fixed;top:${rect.top - 50}px;left:${rect.left}px;
        background:var(--secondary-color);color:white;padding:8px;
        border-radius:8px;display:flex;gap:8px;z-index:1000;box-shadow:var(--shadow-lg);
    `;
    menu.innerHTML = `
        <button onclick="highlightSelection(this, 'yellow')" style="background:#fef08a;color:#713f12;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">Vàng</button>
        <button onclick="highlightSelection(this, 'green')" style="background:#bbf7d0;color:#065f46;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">Xanh</button>
        <button onclick="saveToFlashcard('${text.replace(/'/g, "\\'")}')" style="background:var(--primary-color);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">+ Flashcard</button>
    `;
    document.body.appendChild(menu);
    setTimeout(() => menu.remove(), 3000);
}

function highlightSelection(btn, color) {
    const span = document.createElement('span');
    span.style.background = color;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
        selection.getRangeAt(0).surroundContents(span);
    }
    btn.closest('.highlight-menu')?.remove();
}

function saveToFlashcard(word) {
    const savedWords = JSON.parse(localStorage.getItem('aimhigh_savedWords') || '[]');
    if (!savedWords.includes(word)) {
        savedWords.push(word);
        localStorage.setItem('aimhigh_savedWords', JSON.stringify(savedWords));
        showToast(`Đã lưu "${word}" vào Flashcard`);
    }
    document.querySelector('.highlight-menu')?.remove();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;bottom:24px;right:24px;background:var(--success-color);color:white;
        padding:12px 20px;border-radius:8px;font-weight:500;z-index:9999;
        display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-lg);
        animation:slideUp 0.3s ease;
    `;
    toast.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    // Warn before leaving page
    window.addEventListener('beforeunload', (e) => {
        if (Object.keys(answers).length > 0 && timerInterval) {
            autoSave();
            e.returnValue = 'Bài làm của bạn sẽ không được lưu nếu thoát.';
        }
    });

    // Init highlight for reading tests
    initHighlight();

    // Start auto-save
    startAutoSave(30);
});

