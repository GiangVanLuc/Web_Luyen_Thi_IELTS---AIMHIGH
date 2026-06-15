// ===== WRITING.JS — Luyện viết Writing kết nối API Backend & AI =====

document.addEventListener('DOMContentLoaded', async function () {
    // --- 1. CONFIG & STATE ---
    const urlParams = new URLSearchParams(window.location.search);
    const examId = parseInt(urlParams.get('examId') || localStorage.getItem('currentExamId') || '1', 10);
    const mode = String(urlParams.get('mode') || localStorage.getItem('currentExamMode') || 'practice').toLowerCase();
    const examSection = String(urlParams.get('section') || localStorage.getItem('currentExamSection') || 'full').toLowerCase();
    
    let attemptId = null;
    let timerInterval = null;
    let secondsSpent = 0;
    let examData = null;
    let writingQuestions = [];
    let activeTask = 'task1'; // 'task1' hoặc 'task2'

    // Lưu trữ độc lập dữ liệu cho 4 ô nhập liệu của từng task
    const taskAnswers = {
        task1: { intro: '', overview: '', body1: '', body2: '' },
        task2: { intro: '', overview: '', body1: '', body2: '' }
    };

    // DOM Elements
    const taskSwitcher = document.getElementById('taskSwitcher');
    const textareas = document.querySelectorAll('.col-writing textarea');
    const wordCountBadge = document.querySelector('.word-count-badge');
    const timerBox = document.querySelector('.timer-box');
    const btnSubmit = document.querySelector('.btn-aim-primary');
    const btnAiGrade = document.querySelector('.btn-aim-outline');

    if (!btnSubmit || !btnAiGrade) return;

    // Thay thế text placeholder & nút để rõ ràng hơn
    btnAiGrade.innerHTML = 'Nộp bài & Chấm AI <span class="tag-free">FREE</span>';
    btnSubmit.innerHTML = 'Học từ vựng gợi ý';

    // --- 2. INITIALIZE ATTEMPT & FETCH EXAM ---
    try {
        // Tải thông tin đề thi
        const examDetail = await getExamData(examId);
        const exam = examDetail?.data || examDetail;
        examData = exam;
        writingQuestions = collectExamQuestions(examData);
        applyExamPromptContent();

        const examTitle = exam?.title || exam?.exam?.title || urlParams.get('title');
        if (examTitle) {
            document.title = `${examTitle} - AimHigh Writing`;
            const navText = document.querySelector('.text-muted.fw-bold');
            if (navText) navText.innerHTML = `<i class="bi bi-book"></i> Writing - ${examTitle}`;
        }

        // Bắt đầu phiên thi
        const attemptRes = await startAttempt(examId, mode);
        const attempt = attemptRes?.data || attemptRes;
        attemptId = attempt?.id;
        
        if (attemptId) {
            localStorage.setItem('currentAttemptId', attemptId);
            // Khôi phục tiến độ cũ nếu có
            await restoreProgress();
            setInitialWritingTaskFromSection();
        }

        // Khởi chạy đồng hồ tính giờ
        startTimer();

        // Kích hoạt auto-save sau mỗi 20 giây
        setInterval(autoSaveCurrentTask, 20000);

    } catch (err) {
        console.error('Lỗi khi khởi tạo phiên thi:', err);
        showCustomToast('Không thể kết nối đến máy chủ. Vui lòng tải lại trang.', 'error');
    }

    // --- 3. EVENT LISTENERS ---

    // Đổi Task 1 / Task 2
    taskSwitcher.addEventListener('change', function (e) {
        // Lưu tạm câu trả lời cũ trước khi đổi
        saveCurrentTaskToState();
        
        activeTask = e.target.value; // 'task1' hoặc 'task2'

        // Khôi phục câu trả lời của Task mới vào các textarea
        loadTaskFromState();
        calculateTotalWords();
    });

    // Lắng nghe người dùng nhập liệu để tính số từ
    textareas.forEach(textarea => {
        textarea.addEventListener('input', calculateTotalWords);
    });

    // Sự kiện Nộp bài & Chấm AI
    btnAiGrade.addEventListener('click', async function () {
        saveCurrentTaskToState();
        
        const totalWords = parseInt(wordCountBadge.textContent, 10);
        if (totalWords < 20) {
            showCustomToast('Bài viết quá ngắn. Vui lòng nhập thêm nội dung!', 'warning');
            return;
        }

        if (!confirm('Bạn có chắc chắn muốn nộp bài thi Writing này để chấm điểm không?')) {
            return;
        }

        // Hiển thị màn hình chờ mờ kính siêu đẹp
        showPremiumLoadingOverlay('Giám khảo AI Gemini đang phân tích bài viết của bạn. Vui lòng đợi trong giây lát...');

        try {
            // Nộp bài thi
            const answers = buildWritingAnswersPayload();

            const resultRes = await submitAttemptAnswers(attemptId, answers, secondsSpent);
            const result = resultRes?.data || resultRes;

            // Xóa overlay loading
            removePremiumLoadingOverlay();

            // Hiển thị báo cáo kết quả hoàng gia
            showPremiumResultModal(result);

        } catch (err) {
            removePremiumLoadingOverlay();
            console.error('Lỗi nộp bài thi:', err);
            showCustomToast(err.message || 'Lỗi khi nộp bài thi tự luận.', 'error');
        }
    });

    // --- 4. CORE FUNCTIONS ---

    // Đồng hồ đếm giờ
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsSpent++;
            const h = Math.floor(secondsSpent / 3600);
            const m = Math.floor((secondsSpent % 3600) / 60);
            const s = secondsSpent % 60;
            timerBox.innerHTML = `
                <small><i class="bi bi-stopwatch"></i> Thời gian làm bài:</small>
                ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}
            `;
        }, 1000);
    }

    // Đóng gói 4 ô nhập thành 1 bài viết thống nhất
    function packAnswers(task) {
        const data = taskAnswers[task];
        return `[Introduction]\n${data.intro}\n\n[Overview/Body 1]\n${data.overview}\n\n[Body 1/Body 2]\n${data.body1}\n\n[Body 2/Conclusion]\n${data.body2}`;
    }

    function buildWritingAnswersPayload() {
        const tasks = [];
        if (examSection === '1' || examSection === 'task1') {
            tasks.push('task1');
        } else if (examSection === '2' || examSection === 'task2') {
            tasks.push('task2');
        } else if (writingQuestions.length === 1) {
            const onlyQuestion = writingQuestions[0];
            const resolvedTask = Number(onlyQuestion.taskNumber || onlyQuestion.sectionNumber || onlyQuestion.questionNumber) === 2 ? 'task2' : 'task1';
            tasks.push(resolvedTask);
        } else {
            tasks.push('task1', 'task2');
        }

        return tasks.map(task => {
            const answerText = packAnswers(task);
            return {
                questionNumber: getQuestionNumberForTask(task),
                answerText,
                isSkipped: answerText.replace(/\[[^\]]+\]/g, '').trim().length === 0
            };
        });
    }

    function getQuestionNumberForTask(task) {
        const question = getQuestionForTask(task);
        const fallback = task === 'task2' ? 2 : 1;
        return Number(question?.questionNumber) || fallback;
    }

    function getTaskByQuestionNumber(questionNumber) {
        const qNum = Number(questionNumber);
        if (!qNum) return null;
        if (getQuestionNumberForTask('task1') === qNum) return 'task1';
        if (getQuestionNumberForTask('task2') === qNum) return 'task2';
        return qNum === 2 ? 'task2' : 'task1';
    }

    function getQuestionForTask(task) {
        if (!writingQuestions.length) return null;

        const taskNumber = task === 'task2' ? 2 : 1;
        const wantedSection = (examSection === '1' || examSection === 'task1') ? 1
            : (examSection === '2' || examSection === 'task2') ? 2
                : taskNumber;

        const isSingleSection = examSection === '1' || examSection === '2' || examSection === 'task1' || examSection === 'task2';
        if (writingQuestions.length === 1 && isSingleSection && wantedSection === taskNumber) {
            return writingQuestions[0];
        }

        return writingQuestions.find(q => Number(q.taskNumber) === taskNumber)
            || writingQuestions.find(q => Number(q.sectionNumber) === taskNumber)
            || writingQuestions.find(q => Number(q.partNumber) === taskNumber)
            || writingQuestions.find(q => Number(q.questionNumber) === taskNumber)
            || writingQuestions[taskNumber - 1]
            || writingQuestions[0];
    }

    function collectExamQuestions(data) {
        const root = data?.data || data || {};
        const questions = [];
        const seen = new Set();

        const addQuestion = (question, context = {}) => {
            if (!question || typeof question !== 'object') return;
            const questionNumber = Number(question.questionNumber || question.number || question.questionNo);
            if (!Number.isFinite(questionNumber) || questionNumber <= 0) return;

            const key = `${question.id || ''}:${questionNumber}:${context.sectionNumber || ''}:${context.groupTitle || ''}`;
            if (seen.has(key)) return;
            seen.add(key);

            questions.push({
                ...question,
                ...context,
                questionNumber
            });
        };

        const visitQuestions = (items, context = {}) => {
            if (!Array.isArray(items)) return;
            items.forEach(item => addQuestion(item, context));
        };

        const visitTableRows = (rows, context = {}) => {
            if (!Array.isArray(rows)) return;
            rows.forEach(row => {
                const cells = Array.isArray(row?.cells) ? row.cells : row;
                if (Array.isArray(cells)) {
                    cells.forEach(cell => addQuestion(cell, context));
                }
            });
        };

        const visitGroup = (group, context = {}) => {
            if (!group || typeof group !== 'object') return;
            const groupContext = {
                ...context,
                groupTitle: group.groupTitle || group.title || group.name || context.groupTitle,
                instruction: group.instruction || group.instructions || context.instruction
            };
            visitQuestions(group.questions, groupContext);
            visitTableRows(group.tableRows, groupContext);
            if (Array.isArray(group.subBlocks)) {
                group.subBlocks.forEach(subBlock => {
                    const subContext = {
                        ...groupContext,
                        subTitle: subBlock.title || subBlock.subTitle || groupContext.subTitle
                    };
                    visitQuestions(subBlock.questions, subContext);
                    visitTableRows(subBlock.tableRows, subContext);
                });
            }
        };

        const visitSection = (section, index = 0) => {
            if (!section || typeof section !== 'object') return;
            const sectionNumber = Number(section.sectionNumber || section.partNumber || section.taskNumber || index + 1);
            const sectionContext = {
                sectionNumber,
                partNumber: Number(section.partNumber || sectionNumber),
                taskNumber: Number(section.taskNumber || section.partNumber || sectionNumber),
                sectionTitle: section.title || section.label || `Section ${sectionNumber}`,
                instruction: section.instruction || section.instructions
            };

            visitQuestions(section.questions, sectionContext);
            if (Array.isArray(section.groups)) {
                section.groups.forEach(group => visitGroup(group, sectionContext));
            }
            if (Array.isArray(section.subBlocks)) {
                section.subBlocks.forEach(subBlock => visitGroup(subBlock, sectionContext));
            }
        };

        visitQuestions(root.questions, {});
        if (Array.isArray(root.sections)) {
            root.sections.forEach(visitSection);
        }
        if (Array.isArray(root.parts)) {
            root.parts.forEach((part, index) => visitSection(part, index));
        }
        if (Array.isArray(root.passages)) {
            root.passages.forEach((passage, index) => visitSection(passage, index));
        }

        return questions.sort((a, b) => Number(a.questionNumber) - Number(b.questionNumber));
    }

    function applyExamPromptContent() {
        if (!writingQuestions.length) return;

        const task1 = getQuestionForTask('task1');
        const task2 = getQuestionForTask('task2');
        const contentTask1 = document.getElementById('contentTask1');
        const contentTask2 = document.getElementById('contentTask2');

        if (contentTask1 && task1) {
            contentTask1.innerHTML = renderWritingPrompt('task1', task1, 'Writing Task 1');
        }
        if (contentTask2 && task2) {
            contentTask2.innerHTML = renderWritingPrompt('task2', task2, 'Writing Task 2');
        }
    }

    function renderWritingPrompt(task, question, fallbackTitle) {
        const taskNumber = task === 'task2' ? 2 : 1;
        const heading = question.sectionTitle || question.groupTitle || fallbackTitle;
        const instruction = question.instruction || question.instructions || question.groupInstruction || '';
        const prompt = question.prompt || question.topic || question.questionText || question.lineTemplate || '';
        const imageUrl = question.imageUrl || question.chartImageUrl || question.diagramUrl || question.mediaUrl || '';
        const cuePoints = Array.isArray(question.cuePoints) ? question.cuePoints
            : Array.isArray(question.bullets) ? question.bullets
                : Array.isArray(question.pointsToCover) ? question.pointsToCover
                    : [];
        const minimumWords = taskNumber === 1 ? 150 : 250;
        const suggestedMinutes = taskNumber === 1 ? 20 : 40;

        return `
            <div class="task-instruction-box" style="padding: 24px;">
                <p class="mb-3 text-center text-muted text-uppercase fw-bold" style="font-size: 0.85rem; letter-spacing: 1px;">
                    ${escapeHtml(heading)} - spend about ${suggestedMinutes} minutes
                </p>
                ${instruction ? `<p class="mb-3"><strong><em>${formatMultilineText(instruction)}</em></strong></p>` : ''}
                <div style="background:#FAFAFA;border-left:4px solid var(--primary);padding:16px;margin-bottom:20px;">
                    <p class="mb-0 fw-bold" style="font-size:1.05rem;line-height:1.6;">${formatMultilineText(prompt || fallbackTitle)}</p>
                </div>
                ${imageUrl ? `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(fallbackTitle)}" style="width:100%;border:1px solid var(--border-color);border-radius:12px;margin-bottom:18px;background:#fff;">` : ''}
                ${cuePoints.length ? `<ul class="mb-3">${cuePoints.map(item => `<li>${formatMultilineText(item)}</li>`).join('')}</ul>` : ''}
                <p class="text-muted mb-0" style="font-size:0.85rem;">
                    Write at least ${minimumWords} words.
                </p>
            </div>
        `;
    }

    function setInitialWritingTaskFromSection() {
        if (!taskSwitcher) return;
        if (examSection === '2' || examSection === 'task2') {
            taskSwitcher.value = 'task2';
            taskSwitcher.dispatchEvent(new Event('change'));
        } else if (examSection === '1' || examSection === 'task1') {
            taskSwitcher.value = 'task1';
            taskSwitcher.dispatchEvent(new Event('change'));
        }
    }

    function formatMultilineText(value) {
        return escapeHtml(value).replace(/\n/g, '<br>');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    // Phân rã văn bản đã pack vào lại 4 ô nhập
    function unpackAnswers(task, packedText) {
        if (!packedText) return;
        const sections = packedText.split(/\n\n?\[.*?\]\n/);
        // split sẽ chia theo block [Tag]
        // Phần đầu thường trống do tag ở đầu
        let idx = 1;
        if (packedText.startsWith('[')) {
            taskAnswers[task].intro = (sections[1] || '').trim();
            taskAnswers[task].overview = (sections[2] || '').trim();
            taskAnswers[task].body1 = (sections[3] || '').trim();
            taskAnswers[task].body2 = (sections[4] || '').trim();
        } else {
            // fallback
            taskAnswers[task].intro = packedText;
        }
    }

    // Lưu văn bản từ các textarea vào state cục bộ
    function saveCurrentTaskToState() {
        taskAnswers[activeTask].intro = textareas[0].value;
        taskAnswers[activeTask].overview = textareas[1].value;
        taskAnswers[activeTask].body1 = textareas[2].value;
        taskAnswers[activeTask].body2 = textareas[3].value;
    }

    // Tải văn bản từ state cục bộ vào các textarea
    function loadTaskFromState() {
        textareas[0].value = taskAnswers[activeTask].intro;
        textareas[1].value = taskAnswers[activeTask].overview;
        textareas[2].value = taskAnswers[activeTask].body1;
        textareas[3].value = taskAnswers[activeTask].body2;
    }

    // Tự động lưu tiến độ lên máy chủ
    async function autoSaveCurrentTask() {
        if (!attemptId) return;
        saveCurrentTaskToState();

        try {
            const currentText = packAnswers(activeTask);
            const questionNum = getQuestionNumberForTask(activeTask);
            
            await saveAttemptProgress(attemptId, questionNum, currentText);
            console.log(`Auto-saved ${activeTask} thành công.`);
        } catch (err) {
            console.warn('Auto-save failed:', err.message);
        }
    }

    // Khôi phục tiến độ bài làm cũ
    async function restoreProgress() {
        try {
            const progressRes = await getAttemptProgress(attemptId);
            const list = progressRes?.data || progressRes || [];
            if (!Array.isArray(list)) return;

            list.forEach(item => {
                const qNum = item.questionId || item.questionNumber;
                const text = item.answerText;
                const task = getTaskByQuestionNumber(qNum);
                if (task) {
                    unpackAnswers(task, text);
                }
            });

            // Tải vào view
            loadTaskFromState();
            calculateTotalWords();

        } catch (e) {
            console.warn('Không thể phục hồi tiến độ bài làm trước đó:', e);
        }
    }

    // Tính toán số từ tổng hợp
    function calculateTotalWords() {
        let totalWords = 0;
        textareas.forEach(textarea => {
            const text = textarea.value.trim();
            if (text.length > 0) {
                const words = text.split(/[\s\n]+/).filter(word => {
                    return /[a-zA-Z0-9\u00C0-\u1EF9]/.test(word);
                });
                totalWords += words.length;
            }
        });
        wordCountBadge.textContent = totalWords;
    }

    // --- 5. UI UTILITIES (PREMIUM TOAST & MODAL) ---

    function showCustomToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : (type === 'warning' ? 'warning' : 'danger')} position-fixed`;
        toast.style.cssText = 'top:90px;right:20px;z-index:9999;min-width:300px;border-radius:12px;box-shadow:0 8px 32px rgba(180, 140, 30, 0.15);backdrop-filter:blur(8px);background-color:rgba(255,255,255,0.9);border:1px solid #F0E8C8;';
        toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-warning'} me-2"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    function showPremiumLoadingOverlay(text) {
        const overlay = document.createElement('div');
        overlay.id = 'premiumLoadingOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,253,245,0.85);backdrop-filter:blur(12px);z-index:99999;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:all 0.3s;';
        overlay.innerHTML = `
            <div class="spinner-border text-warning mb-3" role="status" style="width: 3rem; height: 3rem; border-width: 0.3em;"></div>
            <div class="fw-bold text-dark px-4 text-center" style="font-family:\'Be Vietnam Pro\', sans-serif;max-width:500px;font-size:1.1rem;line-height:1.6;">
                ${text}
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function removePremiumLoadingOverlay() {
        const overlay = document.getElementById('premiumLoadingOverlay');
        if (overlay) overlay.remove();
    }

    function showPremiumResultModal(result) {
        // Tạo một modal tràn màn hình để hiển thị kết quả chấm điểm cực đẹp
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px);z-index:99999;display:flex;justify-content:center;align-items:center;';

        let reportHTML;
        if (window.AiGradingReport) {
            window.AiGradingReport.injectStylesOnce();
            reportHTML = window.AiGradingReport.render(result.feedback, { bandScore: result.bandScore, skill: 'WRITING' });
        } else {
            reportHTML = `<div style="white-space:pre-wrap;">${(result.feedback || 'Không có nhận xét chi tiết.')}</div>`;
        }

        modal.innerHTML = `
            <div class="aim-card" style="width:92%;max-width:760px;max-height:88vh;overflow-y:auto;background:white;border-radius:24px;border:2px solid #C9A227;box-shadow:0 20px 50px rgba(0,0,0,0.15);padding:32px;">
                <div class="text-center mb-4">
                    <div style="width:80px;height:80px;background:#F5EDD5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border:2px solid #C9A227;">
                        <i class="bi bi-award-fill text-warning" style="font-size:2.5rem;"></i>
                    </div>
                    <h3 class="fw-bold" style="color:#4a3800;font-family:\'Be Vietnam Pro\',sans-serif;">Kết quả chấm điểm AI</h3>
                    <p class="text-muted">Giám khảo AI Gemini chấm theo 4 tiêu chí IELTS Writing</p>
                </div>

                ${reportHTML}

                <div class="text-center mt-4">
                    <button class="btn btn-warning rounded-pill px-5 py-2 fw-bold text-dark" style="border:none;box-shadow:0 4px 12px rgba(201,162,39,0.3);" onclick="window.location.href=\'dashboard.html\'">
                        Quay lại Dashboard
                    </button>
                </div>
            </div>
        `;

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                window.location.href = 'dashboard.html';
            }
        });

        document.body.appendChild(modal);
    }
});
