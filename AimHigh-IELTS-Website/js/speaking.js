// ===== SPEAKING.JS — Luyện nói Speaking kết nối API Backend, MediaRecorder & AI =====

document.addEventListener('DOMContentLoaded', async function () {
    // --- 1. CONFIG & STATE ---
    const urlParams = new URLSearchParams(window.location.search);
    const examId = parseInt(urlParams.get('examId') || localStorage.getItem('currentExamId') || '1', 10);
    const mode = String(urlParams.get('mode') || localStorage.getItem('currentExamMode') || 'practice').toLowerCase();
    const examSection = String(urlParams.get('section') || localStorage.getItem('currentExamSection') || 'full').toLowerCase();

    let attemptId = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let secondsSpent = 0;
    let timerInterval = null;
    let examData = null;
    let speakingQuestions = [];
    let currentQuestionIndex = 0;
    let speakingControlsBound = false;
    
    // Web Audio API cho Visualizer
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let animationFrameId = null;
    let recordingStream = null;

    // DOM Elements
    const btnRecord = document.querySelector('.btn-record');
    const noteArea = document.getElementById('noteArea');
    const charCount = document.getElementById('charCount');
    const timerBox = document.querySelector('.bottom-controls');

    if (!btnRecord) return;

    // Chèn thẻ Canvas cho Visualizer vào ngay bên trên nút ghi âm
    const colMain = document.getElementById('colMain');
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = 'width: 100%; height: 80px; display: flex; justify-content: center; align-items: center; margin-bottom: 20px;';
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 80;
    canvas.style.cssText = 'border-radius: 12px; background: rgba(240, 232, 200, 0.1); width: 80%; display: none;';
    canvasContainer.appendChild(canvas);
    
    // Chèn canvas vào trước thanh bottom-controls
    const bottomControls = document.querySelector('.bottom-controls');
    if (bottomControls) {
        colMain.insertBefore(canvasContainer, bottomControls);
    }

    // --- 2. INITIALIZE ---
    try {
        const examDetail = await getExamData(examId);
        const exam = examDetail?.data || examDetail;
        examData = exam;
        speakingQuestions = filterSpeakingQuestionsBySection(collectExamQuestions(examData));
        applySpeakingPromptContent();

        const examTitle = exam?.title || exam?.exam?.title || urlParams.get('title');
        if (examTitle) {
            document.title = `${examTitle} - AimHigh Speaking`;
            const navText = document.querySelector('.text-muted.fw-bold');
            if (navText) navText.innerHTML = `<i class="bi bi-chat-quote"></i> Speaking - ${examTitle}`;
        }
        // Khởi tạo attempt
        const attemptRes = await startAttempt(examId, mode);
        const attempt = attemptRes?.data || attemptRes;
        attemptId = attempt?.id;
        if (attemptId) {
            localStorage.setItem('currentAttemptId', attemptId);
        }

        // Tự động lưu Note của Speaking sau mỗi 15 giây
        setInterval(saveNotesProgress, 15000);
        startElapsedTimer();

    } catch (err) {
        console.error('Lỗi khởi tạo Speaking:', err);
    }

    // --- 3. MICROPHONE & RECORDING FLOW ---

    btnRecord.addEventListener('click', async function () {
        if (!isRecording) {
            await startRecordingFlow();
        } else {
            await stopRecordingFlow();
        }
    });

    function startElapsedTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsSpent++;
        }, 1000);
    }

    function collectExamQuestions(data) {
        const root = data?.data || data || {};
        const questions = [];
        const seen = new Set();

        const addQuestion = (question, context = {}) => {
            if (!question || typeof question !== 'object') return;
            const questionNumber = Number(question.questionNumber || question.number || question.questionNo);
            if (!Number.isFinite(questionNumber) || questionNumber <= 0) return;

            const key = `${question.id || ''}:${questionNumber}:${context.partNumber || context.sectionNumber || ''}:${context.groupTitle || ''}`;
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

        const visitGroup = (group, context = {}) => {
            if (!group || typeof group !== 'object') return;
            const groupContext = {
                ...context,
                groupTitle: group.groupTitle || group.title || group.topic || group.name || context.groupTitle,
                instruction: group.instruction || group.instructions || context.instruction
            };
            visitQuestions(group.questions, groupContext);
            if (Array.isArray(group.subBlocks)) {
                group.subBlocks.forEach(subBlock => visitQuestions(subBlock.questions, {
                    ...groupContext,
                    subTitle: subBlock.title || subBlock.subTitle || groupContext.subTitle
                }));
            }
        };

        const visitSection = (section, index = 0) => {
            if (!section || typeof section !== 'object') return;
            const sectionNumber = Number(section.sectionNumber || section.partNumber || section.taskNumber || index + 1);
            const context = {
                sectionNumber,
                partNumber: Number(section.partNumber || sectionNumber),
                taskNumber: Number(section.taskNumber || section.partNumber || sectionNumber),
                sectionTitle: section.title || section.label || `Part ${sectionNumber}`,
                instruction: section.instruction || section.instructions
            };

            visitQuestions(section.questions, context);
            if (Array.isArray(section.groups)) {
                section.groups.forEach(group => visitGroup(group, context));
            }
            if (Array.isArray(section.subBlocks)) {
                section.subBlocks.forEach(subBlock => visitGroup(subBlock, context));
            }
        };

        visitQuestions(root.questions, {});
        if (Array.isArray(root.sections)) {
            root.sections.forEach(visitSection);
        }
        if (Array.isArray(root.parts)) {
            root.parts.forEach((part, index) => visitSection(part, index));
        }

        return questions.sort((a, b) => {
            const partDiff = getQuestionPart(a) - getQuestionPart(b);
            if (partDiff !== 0) return partDiff;
            return Number(a.questionNumber) - Number(b.questionNumber);
        });
    }

    function filterSpeakingQuestionsBySection(questions) {
        const target = Number(examSection);
        if (!Number.isFinite(target) || target <= 0 || examSection === 'full') {
            return questions;
        }
        const filtered = questions.filter(question => getQuestionPart(question) === target);
        return filtered.length ? filtered : questions;
    }

    function applySpeakingPromptContent() {
        if (!speakingQuestions.length) return;
        renderSpeakingNavigation();
        bindSpeakingControls();
        showSpeakingQuestion(0);
    }

    function renderSpeakingNavigation() {
        const parts = [...new Set(speakingQuestions.map(getQuestionPart))].filter(Boolean).sort((a, b) => a - b);
        const partTabs = document.querySelector('.part-tabs');
        const topicList = document.querySelector('.topic-list');
        if (!partTabs || !topicList) return;

        partTabs.innerHTML = parts.map((part, index) => `
            <div class="part-tab ${index === 0 ? 'active' : ''}" data-part="${part}">Part ${part}</div>
        `).join('');

        topicList.innerHTML = parts.map((part, partIndex) => {
            const items = speakingQuestions
                .map((question, index) => ({ question, index }))
                .filter(item => getQuestionPart(item.question) === part);
            const title = items[0]?.question?.sectionTitle || `Part ${part}`;

            return `
                <div id="nav-part${part}" class="nav-content-block ${partIndex === 0 ? 'active' : ''}">
                    <div>
                        <div class="topic-header">
                            <div>
                                <div class="topic-title">${escapeHtml(title)}</div>
                                <div class="topic-count">${items.length} cau hoi</div>
                            </div>
                            <i class="bi bi-chevron-down text-muted"></i>
                        </div>
                        <div class="collapse show">
                            ${items.map((item, localIndex) => `
                                <div class="question-item ${partIndex === 0 && localIndex === 0 ? 'active' : ''}" data-question-index="${item.index}">
                                    ${escapeHtml(getQuestionPrompt(item.question))}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        partTabs.querySelectorAll('.part-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const part = Number(tab.dataset.part);
                const index = speakingQuestions.findIndex(question => getQuestionPart(question) === part);
                if (index >= 0) showSpeakingQuestion(index);
            });
        });

        topicList.querySelectorAll('.question-item').forEach(item => {
            item.addEventListener('click', () => showSpeakingQuestion(Number(item.dataset.questionIndex)));
        });
    }

    function bindSpeakingControls() {
        if (speakingControlsBound) return;
        const buttons = document.querySelectorAll('.btn-nav-circle');
        if (buttons[0]) {
            buttons[0].addEventListener('click', () => showSpeakingQuestion(currentQuestionIndex - 1));
        }
        if (buttons[1]) {
            buttons[1].addEventListener('click', () => showSpeakingQuestion(currentQuestionIndex + 1));
        }
        speakingControlsBound = true;
    }

    function showSpeakingQuestion(index) {
        if (!speakingQuestions.length) return;
        currentQuestionIndex = Math.max(0, Math.min(index, speakingQuestions.length - 1));
        const question = speakingQuestions[currentQuestionIndex];
        const part = getQuestionPart(question);

        document.querySelectorAll('.part-tab').forEach(tab => {
            tab.classList.toggle('active', Number(tab.dataset.part || tab.dataset.target?.replace('part', '')) === part);
        });
        document.querySelectorAll('.nav-content-block').forEach(block => {
            block.classList.toggle('active', block.id === `nav-part${part}`);
        });
        document.querySelectorAll('.question-item').forEach(item => {
            item.classList.toggle('active', Number(item.dataset.questionIndex) === currentQuestionIndex);
        });
        document.querySelectorAll('.main-content-block').forEach(block => block.classList.remove('active'));

        const block = document.getElementById(`main-part${part}`) || document.getElementById('main-part1');
        if (block) {
            block.innerHTML = renderSpeakingMain(question, part);
            block.classList.add('active');
        }
    }

    function renderSpeakingMain(question, part) {
        const prompt = getQuestionPrompt(question);
        const cuePoints = getCuePoints(question);
        const isCueCard = part === 2 || cuePoints.length > 0;

        return `
            ${part === 3 ? '<div class="mb-4 text-muted fw-bold text-uppercase" style="letter-spacing:1px;font-size:0.85rem;">Follow-up Discussion</div>' : ''}
            <button class="btn-audio" title="Nghe cau hoi"><i class="bi bi-volume-up-fill"></i></button>
            <h2 class="question-text-large ${part === 2 ? 'fs-3' : ''}">${formatMultilineText(prompt)}</h2>
            ${isCueCard ? `
                <div class="cue-card">
                    <p class="mb-3 fw-bold text-muted">You should say:</p>
                    ${cuePoints.length ? `<ul>${cuePoints.map(item => `<li>${formatMultilineText(item)}</li>`).join('')}</ul>` : `<p class="mb-0">${formatMultilineText(question.cueCard || question.instruction || '')}</p>`}
                </div>
                ${part === 2 ? '<div class="px-4 py-2 bg-white rounded-pill border border-warning text-warning fw-bold d-flex align-items-center gap-2 shadow-sm"><i class="bi bi-stopwatch"></i> Preparation Time: 01:00</div>' : ''}
            ` : ''}
        `;
    }

    function getCurrentSpeakingQuestionNumber() {
        return Number(speakingQuestions[currentQuestionIndex]?.questionNumber) || 1;
    }

    function getQuestionPart(question) {
        const explicit = Number(question?.partNumber || question?.sectionNumber || question?.taskNumber);
        if (Number.isFinite(explicit) && explicit > 0) return explicit;
        const target = Number(examSection);
        if (Number.isFinite(target) && target > 0) return target;
        return 1;
    }

    function getQuestionPrompt(question) {
        return question?.prompt
            || question?.topic
            || question?.questionText
            || question?.cueCard
            || question?.lineTemplate
            || `Question ${question?.questionNumber || ''}`.trim();
    }

    function getCuePoints(question) {
        if (Array.isArray(question?.cuePoints)) return question.cuePoints;
        if (Array.isArray(question?.bullets)) return question.bullets;
        if (Array.isArray(question?.pointsToCover)) return question.pointsToCover;
        if (Array.isArray(question?.items)) return question.items;
        return [];
    }

    function formatMultilineText(value) {
        return escapeHtml(value).replace(/\n/g, '<br>');
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

    async function startRecordingFlow() {
        audioChunks = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordingStream = stream;

            // Thiết lập MediaRecorder
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = function (e) {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async function () {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await uploadAndSubmitAudio(audioBlob);
            };

            mediaRecorder.start();
            isRecording = true;

            // Cập nhật UI nút ghi âm sang hiệu ứng Pulsating màu cam
            btnRecord.innerHTML = '<i class="bi bi-stop-fill fs-5"></i> Dừng ghi âm';
            btnRecord.style.backgroundColor = '#d85928';
            btnRecord.style.boxShadow = '0 0 20px rgba(216, 89, 40, 0.6)';
            btnRecord.classList.add('pulsate-animation');

            // Bắt đầu vẽ Sóng âm Canvas
            canvas.style.display = 'block';
            startVisualizer(stream);

            showCustomToast('Đang thu âm câu trả lời của bạn...', 'success');

        } catch (err) {
            console.error('Không thể truy cập Microphone:', err);
            showCustomToast('Vui lòng cấp quyền truy cập Microphone trong trình duyệt!', 'error');
        }
    }

    async function stopRecordingFlow() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        mediaRecorder.stop();
        isRecording = false;

        // Tắt Microphone stream
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
        }

        // Dừng vẽ canvas
        stopVisualizer();
        canvas.style.display = 'none';

        // Khôi phục UI nút ghi âm về trạng thái nộp bài
        btnRecord.innerHTML = '<i class="bi bi-hourglass-split fs-5"></i> Đang tải lên Cloud...';
        btnRecord.style.backgroundColor = '#6B7280';
        btnRecord.style.boxShadow = 'none';
        btnRecord.classList.remove('pulsate-animation');
    }

    // --- 4. UPLOAD AUDIO & AI EVALUATION ---

    async function uploadAndSubmitAudio(audioBlob) {
        try {
            const file = new File([audioBlob], `speaking_${Date.now()}.webm`, { type: 'audio/webm' });
            
            // Tải tệp lên Cloudinary
            const token = localStorage.getItem('aimhigh_token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'audio');

            const uploadRes = await fetch('http://localhost:8080/api/media/upload', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('Upload audio lên Cloudinary thất bại.');
            }

            const uploadData = await uploadRes.json();
            const audioUrl = uploadData?.data?.url || uploadData?.url;

            if (!audioUrl) {
                throw new Error('Không nhận được URL lưu trữ từ server.');
            }

            // Gọi chấm điểm AI
            showPremiumLoadingOverlay('Giám khảo AI Gemini đang phân tích tệp ghi âm giọng nói của bạn. Vui lòng giữ nguyên màn hình...');

            const answers = [
                {
                    questionNumber: getCurrentSpeakingQuestionNumber(),
                    answerText: audioUrl,
                    isSkipped: false
                }
            ];

            const resultRes = await submitAttemptAnswers(attemptId, answers, secondsSpent);
            const result = resultRes?.data || resultRes;

            removePremiumLoadingOverlay();

            // Phục hồi lại nút ban đầu
            btnRecord.innerHTML = '<i class="bi bi-mic-fill fs-5"></i> Bắt đầu ghi âm';
            btnRecord.style.backgroundColor = 'var(--record-color)';
            btnRecord.style.boxShadow = '0 4px 12px rgba(242, 106, 54, 0.3)';

            // Hiển thị báo cáo hoàng gia
            showPremiumResultModal(result);

        } catch (err) {
            removePremiumLoadingOverlay();
            btnRecord.innerHTML = '<i class="bi bi-mic-fill fs-5"></i> Bắt đầu ghi âm';
            btnRecord.style.backgroundColor = 'var(--record-color)';
            console.error('Lỗi xử lý bài nói:', err);
            showCustomToast(err.message || 'Lỗi khi tải file hoặc nộp bài.', 'error');
        }
    }

    // --- 5. AUDIO VISUALIZER (CANVAS SINE-WAVE) ---

    function startVisualizer(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        const canvasCtx = canvas.getContext('2d');

        function draw() {
            animationFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = '#FFFDF5';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 1.5;

                // Tạo gradient hoàng gia tuyệt đẹp
                const grad = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
                grad.addColorStop(0, '#C9A227');
                grad.addColorStop(1, '#F26A36');

                canvasCtx.fillStyle = grad;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

                x += barWidth;
            }
        }

        draw();
    }

    function stopVisualizer() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (sourceNode) sourceNode.disconnect();
        if (audioContext) audioContext.close();
    }

    // --- 6. SAVE NOTES PROGRESS ---

    async function saveNotesProgress() {
        if (!attemptId || !noteArea) return;
        try {
            const content = noteArea.value;
            // Lưu note nháp vào câu số 999 để tránh lẫn câu trả lời nói
            await saveAttemptProgress(attemptId, 999, content);
            console.log('Saved speaking notes.');
        } catch (e) {
            console.warn('Note save failed:', e.message);
        }
    }

    // --- 7. UTILITIES UI (TOAST & LOADING MODAL) ---

    function showCustomToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
        toast.style.cssText = 'top:90px;right:20px;z-index:9999;min-width:300px;border-radius:12px;box-shadow:0 8px 32px rgba(242, 106, 54, 0.15);backdrop-filter:blur(8px);background-color:rgba(255,255,255,0.9);border:1px solid #F0E8C8;';
        toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-danger'} me-2"></i> ${message}`;
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
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,253,245,0.9);backdrop-filter:blur(16px);z-index:99999;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:all 0.3s;';
        overlay.innerHTML = `
            <div class="spinner-border text-danger mb-3" role="status" style="width: 3.5rem; height: 3.5rem; border-width: 0.35em;"></div>
            <div class="fw-bold text-dark px-4 text-center" style="font-family:\'Be Vietnam Pro\', sans-serif;max-width:500px;font-size:1.15rem;line-height:1.6;">
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
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);z-index:99999;display:flex;justify-content:center;align-items:center;';
        
        let feedbackHTML = result.feedback || 'Không có nhận xét chi tiết.';
        feedbackHTML = feedbackHTML
            .replace(/\n/g, '<br>')
            .replace(/Band Score:\s*([0-9.]+)/gi, '<strong>Band Score: $1</strong>');

        modal.innerHTML = `
            <div class="aim-card" style="width:90%;max-width:700px;max-height:85vh;overflow-y:auto;background:white;border-radius:24px;border:2px solid var(--record-color);box-shadow:0 25px 60px rgba(0,0,0,0.2);padding:32px;">
                <div class="text-center mb-4">
                    <div style="width:80px;height:80px;background:#F5EDD5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border:2px solid var(--record-color);">
                        <i class="bi bi-mic-fill text-danger" style="font-size:2.3rem;"></i>
                    </div>
                    <h3 class="fw-bold" style="color:#4a3800;font-family:\'Be Vietnam Pro\',sans-serif;">Kết quả chấm nói AI</h3>
                    <p class="text-muted">Đánh giá phát âm & vốn nói IELTS Speaking</p>
                </div>
                
                <div class="d-flex align-items-center justify-content-center gap-3 mb-4" style="background:#FFFDF5;border:1px solid #F0E8C8;padding:16px;border-radius:16px;">
                    <span class="fs-5 fw-bold" style="color:var(--text-main);">Điểm phát âm (Pronunciation Band):</span>
                    <span class="badge bg-danger text-white fs-3 px-3 py-2 rounded-pill fw-extrabold" style="box-shadow:0 4px 10px rgba(242,106,54,0.25);">
                        ${result.bandScore || '6.0'}
                    </span>
                </div>

                <div class="mb-4">
                    <h6 class="fw-bold text-dark mb-2"><i class="bi bi-chat-left-text-fill text-danger me-2"></i>Nhận xét từ Giám khảo AI:</h6>
                    <div class="p-3 border rounded-16" style="background:#FAFAFA;font-size:0.95rem;line-height:1.7;color:#333;">
                        ${feedbackHTML}
                    </div>
                </div>

                <div class="text-center">
                    <button class="btn btn-danger rounded-pill px-5 py-2 fw-bold text-white" style="border:none;box-shadow:0 4px 12px rgba(242,106,54,0.3);" onclick="window.location.href=\'dashboard.html\'">
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
