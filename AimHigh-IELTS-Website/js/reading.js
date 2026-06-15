// ===== READING.JS — Render động từ API & Tích hợp Vocab =====
// Fetch /api/exams/{id} rồi build passage + questions vào DOM.
// Tích hợp API Backend: startAttempt, autoSave, submit.

// ─── CONFIG từ URL/localStorage ───────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const examSection = urlParams.get('section') || localStorage.getItem('currentExamSection') || 'full';
const examId = parseInt(urlParams.get('examId') || localStorage.getItem('currentExamId') || '1', 10);
const rawExamModeFromContext = String(urlParams.get('mode') || localStorage.getItem('currentExamMode') || 'practice').toLowerCase();
const isReviewMode = rawExamModeFromContext === 'review';
const examModeFromContext = rawExamModeFromContext === 'real' ? 'real' : 'practice';
const examTitleFromContext = urlParams.get('title') || localStorage.getItem('currentExamTitle') || '';

// Section config (sẽ được điền sau khi fetch)
let cfg = { total: 40, time: 60*60, from: 1, to: 40, label: '', info: '' };
const SEC_TIME = { full: 60*60, '1': 20*60, '2': 20*60, '3': 20*60 };

let examData = null;   // raw JSON từ API
let TOTAL    = 0;
let sectionOrderMap = [];
let normalizedParts = [];

let ans = {}, timerInt, activeTool = null, noteVisible = false, notes = [];
let timeLeft = 0;
let attemptId = null;  // ID phiên thi từ Backend
let autoSaveInt = null; // Interval auto-save
const ATTEMPT_META_KEY = 'currentAttemptMeta';
let questionIdMap = new Map();
let questionNumberMap = new Map();
let reviewResultData = null;
let reviewQuestionMap = new Map();
let reviewQuestionOrder = [];
let activeReviewQuestion = null;
let activeReviewPassageFocus = null;
const REVIEW_HIGHLIGHT_STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'than', 'then', 'what', 'when', 'where', 'which',
    'your', 'their', 'there', 'have', 'were', 'was', 'are', 'is', 'to', 'of', 'in', 'on', 'at', 'by', 'an', 'a',
    'dap', 'an', 'dung', 'cau', 'buoc', 'xem', 'lai', 'cho', 'khi', 'cua', 'trong', 'voi', 'nhung', 'duoc', 'khong', 'nay',
    'đáp', 'án', 'đúng', 'câu', 'bước', 'xem', 'lại', 'cho', 'khi', 'của', 'trong', 'với', 'những', 'được', 'không', 'này'
]);

function rememberQuestionId(question) {
    const qNum = Number(question?.questionNumber);
    const qId = Number(question?.id);
    if (!Number.isFinite(qNum) || qNum <= 0 || !Number.isFinite(qId) || qId <= 0) return;
    questionIdMap.set(qNum, qId);
    questionNumberMap.set(qId, qNum);
}

function getQuestionIdByNumber(questionNumber) {
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return null;
    return questionIdMap.get(qNum) || null;
}

function getQuestionNumberById(questionId) {
    const qId = Number(questionId);
    if (!Number.isFinite(qId) || qId <= 0) return null;
    return questionNumberMap.get(qId) || null;
}

function getCurrentQuestionNumber() {
    if (document.body.classList.contains('real-mode') && Number.isFinite(currentRealQ)) {
        return Number(currentRealQ);
    }

    const currentBtn = document.querySelector('.qnb.cur');
    if (currentBtn) {
        const value = Number(currentBtn.textContent);
        if (Number.isFinite(value) && value > 0) return value;
    }

    const visibleQuestion = document.querySelector('#qScroll .qi[data-q]');
    if (visibleQuestion) {
        const value = Number(visibleQuestion.dataset.q);
        if (Number.isFinite(value) && value > 0) return value;
    }

    return Number(cfg.from || 1);
}

function getQuestionNumberFromSelection(selection) {
    if (!selection) return null;
    const anchorNode = selection.anchorNode;
    const anchorEl = anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE
        ? anchorNode
        : anchorNode?.parentElement;
    const questionEl = anchorEl?.closest?.('.qi[data-q]');
    if (!questionEl) return null;
    const value = Number(questionEl.dataset.q);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function encodeNoteContent(selectedText, noteText) {
    return JSON.stringify({
        selectedText: String(selectedText || ''),
        note: String(noteText || '')
    });
}

function decodeNoteContent(rawContent) {
    const raw = String(rawContent || '');
    if (!raw) return { selectedText: '', note: '' };

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return {
                selectedText: String(parsed.selectedText || ''),
                note: String(parsed.note || '')
            };
        }
    } catch (_) {
        // Fallback for legacy plain-text notes.
    }

    return { selectedText: raw, note: '' };
}

function buildAttemptMeta() {
    return {
        skill: 'READING',
        examId: Number(examId),
        mode: String(examModeFromContext || 'practice').toLowerCase(),
        section: String(examSection || 'full')
    };
}

function saveAttemptContext(id) {
    if (!id) return;
    localStorage.setItem('currentAttemptId', String(id));
    localStorage.setItem(ATTEMPT_META_KEY, JSON.stringify(buildAttemptMeta()));
}

function clearAttemptContext() {
    localStorage.removeItem('currentAttemptId');
    localStorage.removeItem(ATTEMPT_META_KEY);
}

function getReusableAttemptId() {
    const rawId = Number(localStorage.getItem('currentAttemptId'));
    const rawMeta = localStorage.getItem(ATTEMPT_META_KEY);
    if (!Number.isFinite(rawId) || rawId <= 0) return null;
    if (!rawMeta) return rawId;

    try {
        const meta = JSON.parse(rawMeta);
        const current = buildAttemptMeta();
        const sameExamAndSkill =
            String(meta?.skill || '') === current.skill
            && Number(meta?.examId) === current.examId;
        if (sameExamAndSkill) return rawId;
    } catch (_) {
        // Keep using existing ID even if metadata is malformed.
        return rawId;
    }

    return null;
}

function normalizeAttemptModeLocal(value) {
    const raw = String(value || '').trim().toUpperCase();
    return (raw === 'REAL' || raw === 'EXAM') ? 'EXAM' : 'PRACTICE';
}

function normalizeAttemptStatusLocal(value) {
    return String(value || '').trim().toUpperCase();
}

async function findInProgressAttemptFromServer() {
    try {
        const res = await getMyAttempts();
        const attempts = res?.data || res || [];
        if (!Array.isArray(attempts) || attempts.length === 0) return null;

        const currentExamId = Number(examId);
        const expectedMode = normalizeAttemptModeLocal(examModeFromContext);

        const candidates = attempts.filter((item) =>
            Number(item?.examId) === currentExamId
            && normalizeAttemptStatusLocal(item?.status) === 'IN_PROGRESS'
        );

        if (!candidates.length) return null;

        const sameMode = candidates.find((item) => normalizeAttemptModeLocal(item?.mode) === expectedMode);
        const picked = sameMode || candidates[0];
        const foundId = Number(picked?.id);
        return Number.isFinite(foundId) && foundId > 0 ? foundId : null;
    } catch (error) {
        console.warn('Không thể lấy danh sách phiên thi để khôi phục:', error?.message || error);
        return null;
    }
}

async function ensureAttemptIdReady() {
    if (Number.isFinite(attemptId) && attemptId > 0) return attemptId;

    const localId = getReusableAttemptId();
    if (localId) {
        attemptId = localId;
        saveAttemptContext(attemptId);
        return attemptId;
    }

    const serverId = await findInProgressAttemptFromServer();
    if (serverId) {
        attemptId = serverId;
        saveAttemptContext(attemptId);
        return attemptId;
    }

    return null;
}

function isRealMode() {
    return String(examModeFromContext || '').toLowerCase() === 'real';
}

function hasDetailedResultData(result) {
    if (!result || typeof result !== 'object') return false;
    const hasSummary = Number.isFinite(Number(result.totalQuestions)) && Number(result.totalQuestions) > 0;
    const hasBlocks = (Array.isArray(result.parts) && result.parts.length > 0)
        || (Array.isArray(result.passages) && result.passages.length > 0);
    const hasTitle = typeof result.examTitle === 'string' && result.examTitle.trim().length > 0;
    return hasSummary || hasBlocks || hasTitle;
}

function delayMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function resolveDetailedResult(attemptIdValue, submitResult, maxRetry = 4) {
    if (hasDetailedResultData(submitResult)) return submitResult;

    let latestError = null;
    for (let i = 0; i < maxRetry; i++) {
        try {
            const apiResult = await getAttemptResult(attemptIdValue);
            const payload = apiResult?.data || apiResult;
            if (hasDetailedResultData(payload)) {
                return payload;
            }
        } catch (err) {
            latestError = err;
        }
        await delayMs(400 * (i + 1));
    }

    if (latestError) {
        console.warn('Không lấy được kết quả chi tiết ngay sau nộp bài:', latestError.message);
    }
    return submitResult;
}

function getReviewAttemptIdFromContext() {
    const queryAttemptId = Number(urlParams.get('attemptId'));
    if (Number.isFinite(queryAttemptId) && queryAttemptId > 0) return queryAttemptId;

    const lastAttemptId = Number(localStorage.getItem('lastResultAttemptId'));
    if (Number.isFinite(lastAttemptId) && lastAttemptId > 0) return lastAttemptId;

    return null;
}

function formatDurationHhMmSs(totalSeconds) {
    const sec = Number(totalSeconds);
    if (!Number.isFinite(sec) || sec < 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function normalizeReviewAnswer(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
}

function buildReviewQuestionMap(result) {
    const map = new Map();
    const blocks = Array.isArray(result?.passages)
        ? result.passages
        : (Array.isArray(result?.parts) ? result.parts : []);

    blocks.forEach((block) => {
        (block?.questions || []).forEach((question) => {
            const qNum = Number(question?.questionNumber);
            if (!Number.isFinite(qNum) || qNum <= 0) return;
            map.set(qNum, question);
        });
    });

    return map;
}

function normalizeAnswerForComparison(value) {
    const raw = normalizeReviewAnswer(value);
    const letterMatch = raw.match(/^([A-Z])(?:[\s.)]|$)/);
    if (letterMatch) return letterMatch[1];
    return raw;
}

function extractQuotedAnswerFromExplanation(explanation) {
    const text = String(explanation || '');
    if (!text) return '';

    const patterns = [
        /đáp án đúng(?:\s*là)?\s*[:：]\s*["“']?([^"”'\n.]+)["”']?/i,
        /correct answer(?:\s*is)?\s*[:：]\s*["“']?([^"”'\n.]+)["”']?/i,
        /\b(?:đáp án|answer)\b[^\n]*?["“']([^"”']{1,80})["”']/i
    ];

    for (const regex of patterns) {
        const matched = text.match(regex);
        const candidate = String(matched?.[1] || '').trim();
        if (candidate) return candidate;
    }

    return '';
}

function resolveCorrectAnswerForReview(resultQuestion) {
    const direct = String(resultQuestion?.correctAnswer || '').trim();
    if (direct) return direct;

    const choices = Array.isArray(resultQuestion?.choices) ? resultQuestion.choices : [];
    const correctChoice = choices.find(choice => choice?.isCorrect === true);
    if (correctChoice) {
        const label = String(correctChoice.label || '').trim();
        const text = String(correctChoice.text || '').trim();
        if (label && text && label.toUpperCase() !== text.toUpperCase()) {
            return `${label}. ${text}`;
        }
        return label || text;
    }

    return extractQuotedAnswerFromExplanation(resultQuestion?.explanation);
}

function isFillLikeQuestionType(questionType) {
    const t = String(questionType || '').toLowerCase();
    return t.includes('completion') || t.includes('fill') || t.includes('sentence') || t.includes('table') || t.includes('summary');
}

function getReviewQuestionContainer(questionNumber) {
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return null;

    const card = document.getElementById(`qi${qNum}`);
    if (card) return card;

    const input = document.getElementById(`q${qNum}`);
    if (input) {
        return input.closest('.fill-line') || input.closest('.qinp-wrap') || input.parentElement;
    }

    const badge = document.getElementById(`b${qNum}`);
    if (badge) {
        return badge.closest('.fill-line') || badge.parentElement;
    }

    return null;
}

function findReviewQuestionOrderIndex(questionNumber) {
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return -1;
    return reviewQuestionOrder.findIndex(item => item === qNum);
}

function getQuestionStatusClass(resultQuestion) {
    if (!resultQuestion) return 'review-skipped';
    if (resultQuestion.isSkipped) return 'review-skipped';
    return resultQuestion.isCorrect ? 'review-correct' : 'review-wrong';
}

function getQuestionStatusLabel(resultQuestion) {
    if (!resultQuestion) return 'Bỏ qua';
    if (resultQuestion.isSkipped) return 'Bỏ qua';
    return resultQuestion.isCorrect ? 'Đúng' : 'Sai';
}

function clearActivePassageFocus() {
    if (!activeReviewPassageFocus) return;
    const parent = activeReviewPassageFocus.parentNode;
    if (!parent) {
        activeReviewPassageFocus = null;
        return;
    }
    while (activeReviewPassageFocus.firstChild) {
        parent.insertBefore(activeReviewPassageFocus.firstChild, activeReviewPassageFocus);
    }
    parent.removeChild(activeReviewPassageFocus);
    activeReviewPassageFocus = null;
}

function collectReviewKeywords(question) {
    const bucket = [];
    const explanation = String(question?.explanation || '');

    const quoteRegex = /["'“”]([^"'“”]{4,120})["'“”]/g;
    let match;
    while ((match = quoteRegex.exec(explanation)) !== null) {
        const raw = String(match[1] || '').trim();
        if (raw.length >= 4) bucket.push(raw);
    }

    const fromQuestion = String(question?.questionText || '')
        .replace(/<[^>]*>/g, ' ')
        .split(/[^\p{L}\p{N}]+/u)
        .map(w => w.trim())
        .filter(w => w.length >= 4);

    bucket.push(...fromQuestion.slice(0, 12));

    const unique = [];
    const seen = new Set();
    bucket.forEach((item) => {
        const normalized = item.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        unique.push(item);
    });

    return unique.slice(0, 12);
}

function tokenizeForReviewHighlight(text, minLength = 4) {
    return String(text || '')
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ')
        .split(/[^\p{L}\p{N}]+/u)
        .map((item) => item.trim())
        .filter((item) => item.length >= minLength && !REVIEW_HIGHLIGHT_STOPWORDS.has(item));
}

function pushHighlightCandidate(candidates, seen, text, weight) {
    const raw = String(text || '').trim();
    if (raw.length < 3) return;

    const normalized = raw.toLowerCase();
    if (seen.has(normalized)) return;

    seen.add(normalized);
    candidates.push({ text: raw, normalized, weight: Number(weight) || 0 });
}

function buildPassageHighlightCandidates(resultQuestion) {
    const candidates = [];
    const seen = new Set();

    const correctAnswerRaw = String(resolveCorrectAnswerForReview(resultQuestion) || '').trim();
    const correctAnswerText = correctAnswerRaw.replace(/^[A-Z](?:\s*[.):-]\s*|\s+)/, '').trim();
    if (correctAnswerText) {
        pushHighlightCandidate(candidates, seen, correctAnswerText, 34);
        tokenizeForReviewHighlight(correctAnswerText, 4)
            .slice(0, 8)
            .forEach((token) => pushHighlightCandidate(candidates, seen, token, 18));
    }
    if (correctAnswerRaw && correctAnswerRaw.toLowerCase() !== correctAnswerText.toLowerCase()) {
        pushHighlightCandidate(candidates, seen, correctAnswerRaw, 20);
    }

    const explanation = String(resultQuestion?.explanation || '');
    const quoteRegex = /["'“”]([^"'“”]{4,140})["'“”]/g;
    let match;
    while ((match = quoteRegex.exec(explanation)) !== null) {
        const quote = String(match[1] || '').trim();
        if (!quote) continue;
        pushHighlightCandidate(candidates, seen, quote, 26);
        tokenizeForReviewHighlight(quote, 4)
            .slice(0, 6)
            .forEach((token) => pushHighlightCandidate(candidates, seen, token, 14));
    }

    tokenizeForReviewHighlight(resultQuestion?.questionText, 5)
        .slice(0, 14)
        .forEach((token) => pushHighlightCandidate(candidates, seen, token, 11));

    tokenizeForReviewHighlight(explanation, 5)
        .slice(0, 10)
        .forEach((token) => pushHighlightCandidate(candidates, seen, token, 8));

    return candidates.slice(0, 32);
}

function getVisiblePassageRoots() {
    const visiblePassageRoots = Array.from(document.querySelectorAll('#passagePanel [data-section]'))
        .filter((el) => el.style.display !== 'none');
    return visiblePassageRoots.length ? visiblePassageRoots : [document.getElementById('passageText')];
}

function isBoundaryCharForHighlight(charValue) {
    return !charValue || /[^\p{L}\p{N}]/u.test(charValue);
}

function isKeywordBoundaryMatch(textLower, index, length) {
    const prevChar = textLower[index - 1];
    const nextChar = textLower[index + length];
    return isBoundaryCharForHighlight(prevChar) && isBoundaryCharForHighlight(nextChar);
}

function computeContextSupportScore(contextLower, supportTerms, activeNeedle) {
    let score = 0;
    for (const term of supportTerms) {
        if (!term || term === activeNeedle) continue;
        if (contextLower.includes(term)) {
            score += term.length >= 6 ? 2 : 1;
            if (score >= 14) break;
        }
    }
    return score;
}

function resolveSentenceLikeRange(text, matchStart, matchEnd) {
    const source = String(text || '');
    if (!source) return { start: matchStart, end: matchEnd };

    const delimiters = new Set(['.', '!', '?', ';', '\n']);

    let start = matchStart;
    while (start > 0 && !delimiters.has(source[start - 1])) start--;

    let end = matchEnd;
    while (end < source.length && !delimiters.has(source[end])) end++;
    if (end < source.length) end++;

    while (start < matchStart && /\s/.test(source[start])) start++;
    while (end > matchEnd && /\s/.test(source[end - 1])) end--;

    const length = end - start;
    if (length < 18 || length > 280) {
        return { start: matchStart, end: matchEnd };
    }

    return { start, end };
}

function highlightTextNodeRange(node, start, end) {
    if (!node) return null;
    const source = String(node.textContent || '');
    if (!source) return null;

    const safeStart = Math.max(0, Math.min(start, source.length - 1));
    const safeEnd = Math.max(safeStart + 1, Math.min(end, source.length));
    if (safeStart >= safeEnd) return null;

    const range = document.createRange();
    range.setStart(node, safeStart);
    range.setEnd(node, safeEnd);

    const marker = document.createElement('mark');
    marker.className = 'review-focus-highlight';
    try {
        range.surroundContents(marker);
    } catch (_) {
        const fragment = range.extractContents();
        marker.appendChild(fragment);
        range.insertNode(marker);
    }

    return marker;
}

function findAndHighlightPassageForQuestion(resultQuestion) {
    const roots = getVisiblePassageRoots();
    const candidates = buildPassageHighlightCandidates(resultQuestion);
    if (!candidates.length) return false;

    const supportTerms = Array.from(new Set(
        candidates.flatMap((candidate) => tokenizeForReviewHighlight(candidate.text, 4))
    )).slice(0, 20);

    let best = null;

    for (const root of roots) {
        if (!root) continue;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const text = String(node?.textContent || '').trim();
                if (!text) return NodeFilter.FILTER_REJECT;
                if (node.parentElement?.closest('.review-focus-highlight')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let current;
        while ((current = walker.nextNode())) {
            const source = String(current.textContent || '');
            const sourceLower = source.toLowerCase();

            for (const candidate of candidates) {
                const needle = candidate.normalized;
                if (needle.length < 3) continue;

                let searchFrom = 0;
                while (searchFrom < sourceLower.length) {
                    const index = sourceLower.indexOf(needle, searchFrom);
                    if (index === -1) break;
                    searchFrom = index + Math.max(1, needle.length);

                    if (!isKeywordBoundaryMatch(sourceLower, index, needle.length)) continue;

                    const contextStart = Math.max(0, index - 120);
                    const contextEnd = Math.min(sourceLower.length, index + needle.length + 120);
                    const contextLower = sourceLower.slice(contextStart, contextEnd);

                    let score = candidate.weight;
                    score += Math.min(14, computeContextSupportScore(contextLower, supportTerms, needle));
                    score += Math.min(8, Math.floor(needle.length / 6));
                    if (needle.includes(' ')) score += 4;
                    if (needle.length <= 4) score -= 2;

                    if (!best || score > best.score) {
                        best = {
                            node: current,
                            text: source,
                            start: index,
                            end: index + needle.length,
                            score
                        };
                    }
                }
            }
        }
    }

    if (!best) return false;

    const expandedRange = resolveSentenceLikeRange(best.text, best.start, best.end);
    const marker = highlightTextNodeRange(best.node, expandedRange.start, expandedRange.end)
        || highlightTextNodeRange(best.node, best.start, best.end);
    if (!marker) return false;

    activeReviewPassageFocus = marker;
    marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
}

function findAndHighlightPassageKeyword(keyword) {
    const key = String(keyword || '').trim();
    if (key.length < 3) return false;

    const roots = getVisiblePassageRoots();

    const needle = key.toLowerCase();

    for (const root of roots) {
        if (!root) continue;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const text = String(node?.textContent || '').trim();
                if (!text) return NodeFilter.FILTER_REJECT;
                if (node.parentElement?.closest('.review-focus-highlight')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let current;
        while ((current = walker.nextNode())) {
            const source = String(current.textContent || '');
            const index = source.toLowerCase().indexOf(needle);
            if (index === -1) continue;

            const range = document.createRange();
            range.setStart(current, index);
            range.setEnd(current, index + key.length);
            const marker = document.createElement('mark');
            marker.className = 'review-focus-highlight';
            try {
                range.surroundContents(marker);
            } catch (_) {
                const fragment = range.extractContents();
                marker.appendChild(fragment);
                range.insertNode(marker);
            }
            activeReviewPassageFocus = marker;
            marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
    }

    return false;
}

function jumpToPassageForQuestion(questionNumber) {
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return;

    if (!document.body.classList.contains('real-mode')) {
        const parts = getPracticeParts();
        const targetPartIdx = parts.findIndex(p => qNum >= p.from && qNum <= p.to);
        if (targetPartIdx >= 0 && targetPartIdx !== currentNavPart) {
            switchPracticePart(targetPartIdx);
        }
    }

    clearActivePassageFocus();
    const resultQuestion = reviewQuestionMap.get(qNum);
    const found = findAndHighlightPassageForQuestion(resultQuestion)
        || collectReviewKeywords(resultQuestion).some((keyword) => findAndHighlightPassageKeyword(keyword));

    if (!found) {
        const passageText = document.getElementById('passageText');
        if (passageText) passageText.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeReviewDetailPanel() {
    const panel = document.getElementById('reviewDetailPanel');
    if (panel) panel.remove();
}

function ensureReviewDetailPanel() {
    const qPanel = document.querySelector('.qpanel');
    const qScroll = document.getElementById('qScroll');
    const host = qPanel || qScroll;
    if (!host) return null;

    let panel = document.getElementById('reviewDetailPanel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'reviewDetailPanel';
    panel.className = 'review-detail-panel';
    panel.innerHTML = `
        <div class="review-detail-head">
            <strong id="reviewDetailTitle">Giải thích đáp án</strong>
            <div class="review-detail-actions">
                <button type="button" class="review-locate-btn" id="reviewLocateBtn">Xem vị trí</button>
                <button type="button" class="review-close-btn" id="reviewCloseBtn" title="Đóng" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
        </div>
        <div class="review-detail-meta" id="reviewDetailMeta">Chọn một câu hỏi để xem chi tiết.</div>
        <div class="review-detail-body" id="reviewDetailBody">Bấm vào câu hỏi ở phía trên để đối chiếu đáp án và giải thích.</div>
    `;

    host.appendChild(panel);

    const locateBtn = panel.querySelector('#reviewLocateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (!Number.isFinite(activeReviewQuestion) || activeReviewQuestion <= 0) return;
            jumpToPassageForQuestion(activeReviewQuestion);
        });
    }

    const closeBtn = panel.querySelector('#reviewCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeReviewDetailPanel());
    }

    return panel;
}

function renderReviewKeywordList(resultQuestion) {
    const keywords = collectReviewKeywords(resultQuestion).slice(0, 6);
    if (!keywords.length) {
        return '<span class="review-keyword-chip">(Không có keyword nổi bật)</span>';
    }
    return keywords.map((keyword) => `<span class="review-keyword-chip">${eh(keyword)}</span>`).join('');
}

function ensureReviewOpenButton(questionContainer, questionNumber) {
    if (!questionContainer) return;

    let button = questionContainer.querySelector('.review-open-detail-btn');
    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'review-open-detail-btn';
        button.innerHTML = '<i class="bi bi-journal-text"></i>';
        questionContainer.appendChild(button);
    }

    const qNum = Number(questionNumber);
    const title = `Xem giải thích câu ${qNum}`;
    button.setAttribute('title', title);
    button.setAttribute('aria-label', title);

    if (!button.dataset.bound) {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            showReviewDetail(qNum, { highlight: true });
        });
        button.dataset.bound = 'true';
    }
}

function showReviewDetail(questionNumber, options = {}) {
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return;

    const detailPanel = ensureReviewDetailPanel();
    if (!detailPanel) return;

    const resultQuestion = reviewQuestionMap.get(qNum);
    if (!resultQuestion) return;

    activeReviewQuestion = qNum;

    document.querySelectorAll('.review-active').forEach((el) => el.classList.remove('review-active'));
    const activeQuestionEl = getReviewQuestionContainer(qNum);
    if (activeQuestionEl) activeQuestionEl.classList.add('review-active');

    const titleEl = document.getElementById('reviewDetailTitle');
    const metaEl = document.getElementById('reviewDetailMeta');
    const bodyEl = document.getElementById('reviewDetailBody');
    if (!titleEl || !metaEl || !bodyEl) return;

    titleEl.textContent = `Câu ${qNum} - Giải thích đáp án`;

    const userAnswer = String(resultQuestion.userAnswer || '').trim() || '(Bỏ qua)';
    const correctAnswer = resolveCorrectAnswerForReview(resultQuestion) || 'Chưa cập nhật đáp án';
    const statusLabel = getQuestionStatusLabel(resultQuestion);
    const questionType = String(resultQuestion.questionType || 'Other');
    const questionText = String(resultQuestion.questionText || '(Không có nội dung câu hỏi)');

    metaEl.innerHTML = `
        <span class="review-state ${getQuestionStatusClass(resultQuestion)}">${statusLabel}</span>
        <span class="review-meta-chip">Loại câu: <strong>${eh(questionType)}</strong></span>
        <span class="review-meta-chip">Bạn chọn: <strong>${eh(userAnswer)}</strong></span>
        <span class="review-meta-chip review-meta-chip-correct">Đáp án đúng: <strong>${eh(correctAnswer)}</strong></span>
    `;

    const explanation = String(resultQuestion.explanation || 'Chưa có giải thích cho câu hỏi này.').trim();
    bodyEl.innerHTML = `
        <div class="review-step">
            <div class="review-step-title">Bước 1: Khoanh vùng từ khóa</div>
            <div class="review-step-keywords">${renderReviewKeywordList(resultQuestion)}</div>
        </div>
        <div class="review-step">
            <div class="review-step-title">Bước 2: Đối chiếu lời giải</div>
            <div class="review-step-content">${eh(explanation).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="review-step">
            <div class="review-step-title">Bước 3: Xem lại câu gốc</div>
            <div class="review-step-content">${eh(questionText)}</div>
        </div>
    `;

    if (options.highlight !== false) {
        jumpToPassageForQuestion(qNum);
    }
}

function addReviewCorrectHint(questionNumber, anchorElement, answerText) {
    if (!anchorElement) return;
    const qNum = Number(questionNumber);
    if (!Number.isFinite(qNum) || qNum <= 0) return;

    const hintId = `review-hint-${qNum}`;
    let hint = document.getElementById(hintId);
    if (!hint) {
        hint = document.createElement('div');
        hint.id = hintId;
        hint.className = 'review-correct-hint';
        anchorElement.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = `Đáp án đúng: ${answerText || 'Chưa cập nhật đáp án'}`;
}

// Tách chuỗi đáp án thành tập chữ cái (cho câu chọn-2): "A,E" / "AE" -> {A,E}
function lettersOfAnswer(value) {
    const set = new Set();
    String(value || '').toUpperCase().replace(/[^A-I]/g, ' ').split(/\s+/).forEach(t => {
        if (t.length >= 1) for (const ch of t) if (ch >= 'A' && ch <= 'I') set.add(ch);
    });
    return set;
}

// Review cho khối MCQ chọn-2 (mcq-multi): tick lại lựa chọn, tô đúng/sai, hiện đáp án đúng.
function decorateMcqMultiReview(qNum, resultQuestion) {
    const wrap = Array.from(document.querySelectorAll('.mcq-multi[data-qnums]'))
        .find(w => String(w.dataset.qnums || '').split(',').map(Number).includes(Number(qNum)));
    if (!wrap || wrap.dataset.reviewed === 'true') return !!wrap;
    wrap.dataset.reviewed = 'true';

    const correctSet = lettersOfAnswer(resolveCorrectAnswerForReview(resultQuestion));
    const userSet = lettersOfAnswer(resultQuestion?.userAnswer);

    wrap.querySelectorAll('input[type="checkbox"]').forEach((box) => {
        const val = String(box.value || '').trim().toUpperCase();
        box.disabled = true;
        box.checked = userSet.has(val);
        const opt = box.closest('.mcq-multi-opt');
        if (!opt) return;
        if (correctSet.has(val)) opt.classList.add('review-correct-option');
        if (userSet.has(val) && !correctSet.has(val)) opt.classList.add('review-wrong-option');
    });

    const badge = wrap.querySelector('.mcq-multi-badge');
    if (badge) badge.classList.add(resultQuestion?.isCorrect ? 'review-correct' : 'review-wrong');

    if (!wrap.querySelector('.review-correct-hint')) {
        const hint = document.createElement('div');
        hint.className = 'review-correct-hint';
        hint.textContent = `Đáp án đúng: ${Array.from(correctSet).join(', ') || '(chưa cập nhật)'}`;
        wrap.appendChild(hint);
    }
    return true;
}

function decorateReviewQuestion(questionNumber, resultQuestion) {
    const qNum = Number(questionNumber);
    if (decorateMcqMultiReview(qNum, resultQuestion)) return;
    const questionContainer = getReviewQuestionContainer(qNum);
    if (!questionContainer) return;

    const statusClass = getQuestionStatusClass(resultQuestion);
    const correctAnswerText = resolveCorrectAnswerForReview(resultQuestion);
    const correctNormalized = normalizeAnswerForComparison(correctAnswerText);
    const userNormalized = normalizeAnswerForComparison(resultQuestion?.userAnswer);

    questionContainer.classList.add('review-question', statusClass);
    ensureReviewOpenButton(questionContainer, qNum);

    questionContainer.querySelectorAll('.ropt input[type="radio"]').forEach((inputEl) => {
        inputEl.disabled = true;
        const optionValue = normalizeAnswerForComparison(inputEl.value);
        if (optionValue && optionValue === userNormalized) {
            inputEl.checked = true;
        }

        const optionEl = inputEl.closest('.ropt');
        if (!optionEl) return;
        if (optionValue && optionValue === correctNormalized) {
            optionEl.classList.add('review-correct-option');
        }
        if (!resultQuestion?.isCorrect && userNormalized && optionValue === userNormalized) {
            optionEl.classList.add('review-wrong-option');
        }
    });

    const directInput = document.getElementById(`q${qNum}`);
    if (directInput) {
        directInput.disabled = true;
        directInput.classList.add('review-answer-input');
        if (resultQuestion?.isSkipped) directInput.classList.add('review-skipped-field');
        else if (resultQuestion?.isCorrect) directInput.classList.add('review-correct-field');
        else directInput.classList.add('review-wrong-field');
    }

    const slot = document.getElementById(`ms${qNum}`);
    if (slot) slot.disabled = true;

    questionContainer.querySelectorAll('.match-chip').forEach((chip) => {
        chip.disabled = true;
    });

    const shouldShowHint = directInput
        || isFillLikeQuestionType(resultQuestion?.questionType)
        || resultQuestion?.isSkipped
        || !resultQuestion?.isCorrect;

    if (shouldShowHint) {
        addReviewCorrectHint(qNum, directInput || questionContainer, correctAnswerText);
    }

    const navButton = document.getElementById(`nb${qNum}`);
    if (navButton) {
        navButton.classList.add(statusClass);
    }
}

function goToPracticeFromReview() {
    if (reviewResultData?.examId) {
        window.location.href = `reading.html?examId=${reviewResultData.examId}&mode=practice`;
        return;
    }
    window.location.href = 'practice.html?skill=reading';
}

function applyReviewMode(result) {
    if (!hasDetailedResultData(result)) {
        console.warn('Thiếu dữ liệu chi tiết để bật chế độ review.');
        return;
    }

    reviewResultData = result;
    reviewQuestionMap = buildReviewQuestionMap(result);

    const examTitle = result?.examTitle || examTitleFromContext || cfg.label;
    const titleEl = document.querySelector('.exam-title');
    if (titleEl) titleEl.textContent = examTitle;

    const totalQuestions = Number(result?.totalQuestions || TOTAL || reviewQuestionMap.size || 0);
    const totalCorrect = Number(result?.totalCorrect || 0);

    const snInfo = document.querySelector('.sn-info');
    if (snInfo) {
        snInfo.innerHTML = `Đối chiếu kết quả &nbsp;|&nbsp; <strong>${totalCorrect}/${totalQuestions}</strong> câu đúng`;
    }

    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = formatDurationHhMmSs(result?.timeSpent);
    }

    const doneBtn = document.querySelector('.btn-done');
    if (doneBtn) {
        doneBtn.textContent = 'Làm bài khác';
        doneBtn.onclick = () => goToPracticeFromReview();
    }

    reviewQuestionMap.forEach((resultQuestion, qNum) => {
        const userAnswer = String(resultQuestion?.userAnswer || '').trim();
        if (userAnswer) {
            pa(qNum, userAnswer);
        }
        decorateReviewQuestion(qNum, resultQuestion);
    });

    // Bài làm 1 phần: chỉ giữ lại các passage/part đã làm; ẩn passage không làm khỏi review.
    const attemptedSecs = new Set();
    normalizedParts.forEach((p) => {
        for (let q = p.from; q <= p.to; q++) {
            if (reviewQuestionMap.has(q)) { attemptedSecs.add(p.secNum); break; }
        }
    });
    if (attemptedSecs.size > 0 && attemptedSecs.size < normalizedParts.length) {
        const boxes = document.querySelectorAll('.partbox');
        normalizedParts.forEach((p, idx) => {
            if (attemptedSecs.has(p.secNum)) return;
            if (boxes[idx]) boxes[idx].style.display = 'none';
            document.querySelectorAll(`#passagePanel [data-section="${p.secNum}"]`).forEach(el => el.style.display = 'none');
            document.querySelectorAll(`#questionPanel [data-section="${p.secNum}"]`).forEach(el => el.style.display = 'none');
        });
    }

    const sortedQuestionNumbers = Array.from(reviewQuestionMap.keys()).sort((a, b) => a - b);
    reviewQuestionOrder = sortedQuestionNumbers.slice();
    const firstWrong = sortedQuestionNumbers.find((qNum) => {
        const question = reviewQuestionMap.get(qNum);
        return question && !question.isSkipped && !question.isCorrect;
    });
    const firstQuestion = firstWrong || sortedQuestionNumbers[0];

    if (Number.isFinite(firstQuestion) && firstQuestion > 0) {
        goQ(firstQuestion);
    }
}

// Vocab Constants
const VOCAB_STORAGE_KEY = 'aimhigh_vocab';
const VOCAB_GROUPS_KEY = 'aimhigh_vocab_groups';
let selectedWord = '';

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (isReviewMode) {
        document.body.classList.add('practice-mode', 'review-mode');
    } else if (examModeFromContext === 'real') {
        document.body.classList.add('real-mode');
    } else {
        document.body.classList.add('practice-mode');
    }
    await loadExam();

    // Đồng bộ danh sách nhóm từ vựng của người dùng (nếu đã đăng nhập) để chọn khi lưu từ
    if (localStorage.getItem('aimhigh_token') && typeof apiGetUserVocabGroups === 'function') {
        try {
            const res = await apiGetUserVocabGroups();
            const remote = res?.data || res || [];
            const names = Array.isArray(remote)
                ? remote.map(g => String(g?.name || '').trim()).filter(Boolean)
                : [];
            if (names.length) saveVocabGroups([...new Set(names)]);
        } catch (_) { /* giữ nhóm mặc định nếu đồng bộ lỗi */ }
    }
});

async function loadExam() {
    try {
        // --- Gọi API Backend lấy đề thi ---
        const apiRes = await getExamData(examId);
        examData = apiRes.data || apiRes;
    } catch (err) {
        document.getElementById('passageText').innerHTML =
            '<p style="padding:30px;color:#ef4444;">Không thể tải đề thi. Vui lòng thử lại.</p>';
        console.error('Lỗi tải đề thi:', err);
        return;
    }

    // --- Khởi tạo phiên thi (Attempt) ---
    if (isReviewMode) {
        attemptId = getReviewAttemptIdFromContext();
        if (!attemptId) {
            document.getElementById('qScroll').innerHTML =
                '<p style="padding:30px;color:#ef4444;">Thiếu attemptId để mở chế độ đối chiếu kết quả.</p>';
            return;
        }

        try {
            reviewResultData = await resolveDetailedResult(attemptId, null, 5);
            if (!hasDetailedResultData(reviewResultData)) {
                const fallback = JSON.parse(localStorage.getItem('aimhigh_lastResult') || 'null');
                if (Number(fallback?.attemptId) === attemptId && hasDetailedResultData(fallback)) {
                    reviewResultData = fallback;
                }
            }
        } catch (err) {
            console.warn('Không thể tải kết quả chi tiết cho chế độ review:', err?.message || err);
        }
    } else {
        try {
            const examMode = examModeFromContext;
            const attemptRes = await startAttempt(examId, examMode);
            const attemptData = attemptRes.data || attemptRes;
            attemptId = attemptData.id;
            saveAttemptContext(attemptId);
            console.log('Phiên thi đã khởi tạo. AttemptId:', attemptId);
        } catch (err) {
            console.warn('Không thể tạo phiên thi (có thể đang có phiên chưa hoàn thành):', err.message);
            attemptId = await ensureAttemptIdReady();
        }
    }

    // ── Build config theo section được chọn ──────────────────────────────────
    initSectionOrderMap();
    buildNormalizedParts();
    buildConfig();

    // ── Render passage & questions ────────────────────────────────────────────
    renderPassages();
    renderQuestions();

    // ── UI updates ────────────────────────────────────────────────────────────
    const examTitle = examTitleFromContext || cfg.label;
    const titleEl   = document.querySelector('.exam-title');
    if (titleEl) titleEl.textContent = examTitle;
    const snInfo = document.querySelector('.sn-info');
    if (snInfo) snInfo.innerHTML = `Đề: <strong>${cfg.label}</strong> &nbsp;|&nbsp; ${cfg.info}`;

    const h = Math.floor(timeLeft/3600), m = Math.floor((timeLeft%3600)/60), s = timeLeft%60;
    document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);

    const mUEl    = document.getElementById('mU');    if (mUEl) mUEl.textContent = TOTAL;
    const mTotEl  = document.getElementById('mTotal');if (mTotEl) mTotEl.textContent = TOTAL;

    // ── Mode ─────────────────────────────────────────────────────────────────
    const examMode = examModeFromContext;
    if (isReviewMode) {
        buildNav();
        applyReviewMode(reviewResultData);
    } else if (examMode === 'real') {
        document.body.classList.add('real-mode');
        initRealMode();
    } else {
        buildNav();
        startTimer();
    }

    // ── Auto-save progress mỗi 60 giây ───────────────────────────────────
    if (!isReviewMode) {
        startAutoSave();

        // ── Khôi phục tiến độ nếu user F5 ────────────────────────────────────
        await restoreProgress();
    }

    // ── Khôi phục ghi chú/highlight của attempt hiện tại ─────────────────
    if (attemptId) {
        await restorePracticeAnnotations();
    }

    // Restore highlights cho từ đã lưu từ vựng
    await restoreHighlights();
    
    document.getElementById('passageText').addEventListener('mouseup', onSel);
    document.addEventListener('keydown', onKey);
    syncSubnav();
    initResizeHandle();
}

function initSectionOrderMap() {
    const sections = examData?.sections || [];
    const used = new Set();
    sectionOrderMap = sections.map((sec, idx) => {
        let num = parseInt(sec?.sectionNumber, 10);
        if (!Number.isFinite(num) || num < 1 || used.has(num)) num = idx + 1;
        used.add(num);
        return num;
    });
}

function getSecNo(idx) {
    return sectionOrderMap[idx] || (idx + 1);
}

function getSecBounds(sec) {
    let qF = 999, qT = 0;
    if (sec?.groups) {
        sec.groups.forEach(g => {
            if (g?.questions) {
                g.questions.forEach(q => {
                    if (q.questionNumber < qF) qF = q.questionNumber;
                    if (q.questionNumber > qT) qT = q.questionNumber;
                });
            }
        });
    }
    return {
        from: sec?.questionFrom || (qF !== 999 ? qF : 1),
        to: sec?.questionTo || (qT !== 0 ? qT : 13)
    };
}

function getPracticeParts() {
    const parts = normalizedParts;

    if (examSection === 'full') return parts;
    return parts.filter(p => String(p.secNum) === examSection);
}

function fallbackRangesBySectionCount(count, total) {
    if (count === 3 && total === 40) {
        return [
            { from: 1, to: 13 },
            { from: 14, to: 26 },
            { from: 27, to: 40 }
        ];
    }
    const base = Math.floor(total / Math.max(count, 1));
    const rem = total % Math.max(count, 1);
    const ranges = [];
    let cur = 1;
    for (let i = 0; i < count; i++) {
        const size = base + (i < rem ? 1 : 0);
        ranges.push({ from: cur, to: cur + size - 1 });
        cur += size;
    }
    return ranges;
}

function buildNormalizedParts() {
    const sections = examData?.sections || [];
    const total = parseInt(examData?.exam?.totalQuestions || 40, 10);
    const raw = sections.map((sec, idx) => {
        const b = getSecBounds(sec);
        return { secNum: getSecNo(idx), from: parseInt(b.from, 10), to: parseInt(b.to, 10) };
    });

    let valid = raw.length > 0;
    let expectedStart = 1;
    for (const p of raw.sort((a, b) => a.secNum - b.secNum)) {
        if (!Number.isFinite(p.from) || !Number.isFinite(p.to) || p.from > p.to) { valid = false; break; }
        if (p.from !== expectedStart) { valid = false; break; }
        expectedStart = p.to + 1;
    }
    if (expectedStart !== total + 1) valid = false;

    if (!valid) {
        const fallback = fallbackRangesBySectionCount(sections.length || 3, total);
        normalizedParts = fallback.map((r, idx) => ({
            secNum: getSecNo(idx),
            label: `Part ${getSecNo(idx)}`,
            from: r.from,
            to: r.to,
            sub: `Read the text and answer questions ${r.from}\u2013${r.to}`
        }));
        return;
    }

    normalizedParts = raw
        .sort((a, b) => a.secNum - b.secNum)
        .map(p => ({
            ...p,
            label: `Part ${p.secNum}`,
            sub: `Read the text and answer questions ${p.from}\u2013${p.to}`
        }));
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function buildConfig() {
    const exam = examData.exam || {};
    const parts = normalizedParts;

    if (examSection === 'full') {
        cfg.total = exam.totalQuestions || 40;
        cfg.time  = (exam.duration || 60) * 60;
        cfg.from  = 1;
        cfg.to    = cfg.total;
        cfg.label = exam.title || 'Reading Test';
        cfg.info  = `${cfg.total} câu | ${exam.duration || 60} phút`;
    } else {
        const part = parts.find(p => String(p.secNum) === examSection) || parts[0] || { from:1, to:13, secNum:1 };
        cfg.from  = part.from;
        cfg.to    = part.to;
        cfg.total = cfg.to - cfg.from + 1;
        cfg.time  = SEC_TIME[examSection] || 20*60;
        cfg.label = `${exam.title || 'Reading Test'} – Part ${part.secNum}`;
        cfg.info  = `${cfg.total} câu | 20 phút`;
    }
    TOTAL    = cfg.total;
    timeLeft = isRealMode() ? cfg.time : 0;
}



// ─── RENDER PASSAGES ─────────────────────────────────────────────────────────
function renderPassages() {
    const container = document.getElementById('passageText');
    container.innerHTML = '';
    const isRealMode = document.body.classList.contains('real-mode');

    (examData.sections || []).forEach((sec, idx) => {
        const secNum = getSecNo(idx);
        if (examSection !== 'full' && String(secNum) !== examSection) return;

        const wrap = document.createElement('div');
        wrap.dataset.section = secNum;

        const bounds = getSecBounds(sec);
        const from = bounds.from;
        const to = bounds.to;

                let html = '';

                if (!isRealMode) {
                    html += `<div class="p-label">Reading Passage ${secNum}</div>`;
                        html += `
                            <div class="p-section-head">Part ${secNum} — Questions ${from}–${to}</div>
                            <div class="p-meta">You should spend about 20 minutes on questions ${from}–${to} which are based on the texts below.</div>`;
                }

        // Passages
        (sec.passages || []).forEach((p, pi) => {
            const passageIdAttr = Number.isFinite(Number(p?.id)) ? ` data-passage-id="${Number(p.id)}"` : '';
            if (pi > 0) html += `<div class="subtitle" style="margin-top:26px;">${eh(p.title)}</div>`;
            else        html += `<div class="p-title">${eh(p.title)}</div>`;
            if (p.subtitle) html += `<p style="font-size:.79rem;color:var(--text-2);font-style:italic;text-align:center;margin-bottom:16px;">${eh(p.subtitle)}</p>`;
            html += `<div class="passage-chunk"${passageIdAttr}>${renderPassageContent(p.content)}</div>`;
        });

        if (!isRealMode && secNum > 1) {
            const outer = document.createElement('div');
            outer.dataset.section = secNum;
            outer.innerHTML = `<div class="divider">${html}</div>`;
            container.appendChild(outer);
        } else {
            wrap.innerHTML = html;
            container.appendChild(wrap);
        }
    });
}

/**
 * Chuyển nội dung passage thành HTML.
 * Hỗ trợ:
 * - Đoạn bắt đầu bằng "A. ", "B. "... → dùng .plbl
 * - Đoạn thường → <p class="ni">
 * - Bullet bắt đầu bằng "• " → <p class="ni">
 */
function renderPassageContent(content) {
    if (!content) return '';

    // Nếu nội dung đã là HTML (ví dụ có thẻ <p>), render theo HTML để xuống dòng đúng.
    if (looksLikeHtml(content)) {
        return `<div class="p-text">${sanitizePassageHtml(content)}</div>`;
    }

    let html = '<div class="p-text">';
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    paragraphs.forEach(para => {
        const trimmed = para.trim();
        // Labeled paragraph: "A. Text" or "A. Title — rest"
        const labelMatch = trimmed.match(/^([A-F])\.\s+(.+)$/s);
        if (labelMatch) {
            const label = labelMatch[1];
            const text  = labelMatch[2];
            // Tách bold title (trước em dash) nếu có
            const titleMatch = text.match(/^(.+?)\s+[—–-]{1,2}\s+(.+)$/s);
            if (titleMatch) {
                html += `<p><span class="plbl">${label}</span><strong>${eh(titleMatch[1])}</strong> — ${ehMultiline(titleMatch[2])}</p>`;
            } else {
                html += `<p><span class="plbl">${label}</span>${ehMultiline(text)}</p>`;
            }
        } else {
            html += `<p class="ni">${ehMultiline(trimmed)}</p>`;
        }
    });
    html += '</div>';
    return html;
}

function looksLikeHtml(content) {
    return /<\/?[a-z][\s\S]*>/i.test(String(content || ''));
}

function sanitizePassageHtml(rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');

    // Loại bỏ thẻ nguy hiểm.
    doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(node => node.remove());

    const allowedTags = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'U', 'SPAN', 'DIV', 'UL', 'OL', 'LI']);

    doc.body.querySelectorAll('*').forEach((el) => {
        if (!allowedTags.has(el.tagName)) {
            el.replaceWith(doc.createTextNode(el.textContent || ''));
            return;
        }

        [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || name === 'style') {
                el.removeAttribute(attr.name);
            }
        });

        if (el.tagName === 'P' && !el.classList.contains('ni')) {
            el.classList.add('ni');
        }
    });

    return doc.body.innerHTML;
}

// ─── RENDER QUESTIONS ────────────────────────────────────────────────────────
function renderQuestions() {
    const qScroll = document.getElementById('qScroll');
    qScroll.innerHTML = '';
    questionIdMap = new Map();
    questionNumberMap = new Map();

    (examData.sections || []).forEach((sec, idx) => {
        const secNum = getSecNo(idx);
        if (examSection !== 'full' && String(secNum) !== examSection) return;

        const wrap = document.createElement('div');
        wrap.dataset.section = secNum;

        (sec.groups || []).forEach(g => {
            wrap.innerHTML += renderGroup(g, sec);
        });

        qScroll.appendChild(wrap);
    });
}

function normalizeDisplayType(type) {
    const t = String(type || '').toUpperCase();
    if (t === 'TRUE_FALSE_NOT_GIVEN') return 'TRUE_FALSE_NG';
    if (t === 'FILL_IN_BLANK' || t === 'FILL_BLANK' || t === 'SENTENCE_COMPLETION') return 'FILL_BLOCK';
    return t;
}

function resolveDisplayTypeForGroup(g) {
    const normalized = normalizeDisplayType(g?.displayType || g?.type || '');
    const instruction = String(g?.instruction || g?.instructions || '').toLowerCase();
    const questions = Array.isArray(g?.questions) ? g.questions : [];

    // Recover from mis-labeled data where paragraph matching is stored as FILL_BLANK.
    const looksLikeParagraphMatching =
        instruction.includes('which paragraph contains')
        || instruction.includes('write the correct letter, a-g')
        || instruction.includes('write the correct letter a-g');

    if (looksLikeParagraphMatching) return 'MATCHING';
    if (normalized === 'FILL_BLOCK' && Array.isArray(g?.matchOptions) && g.matchOptions.length) return 'MATCHING';

    // Fallback for API data that omits instruction/type details:
    // paragraph-matching groups often have no choices and answers limited to A-G.
    if (normalized === 'FILL_BLOCK' && questions.length) {
        const allNoChoices = questions.every(q => !Array.isArray(q?.choices) || q.choices.length === 0);
        const allAnswersAreLetters = questions.every(q => /^[A-G]$/i.test(String(q?.correctAnswer || '').trim()));
        if (allNoChoices && allAnswersAreLetters) return 'MATCHING';

        // Runtime payload may strip correct answers; infer by question text shape.
        const allNoBlankSlots = questions.every(q => {
            const text = String(q?.questionText || q?.lineTemplate || '').toLowerCase();
            return !text.includes('___') && !text.includes('....') && !text.includes('……');
        });
        if (allNoChoices && allNoBlankSlots) return 'MATCHING';
    }

    return normalized;
}

function inferGroupRange(g, sec) {
    let from = parseInt(g?.questionFrom || 0, 10);
    let to = parseInt(g?.questionTo || 0, 10);
    if (from > 0 && to >= from) return { from, to };

    const title = String(g?.groupTitle || g?.title || '');
    const m = title.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (m) return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };

    from = parseInt(sec?.questionFrom || cfg.from || 1, 10);
    to = parseInt(sec?.questionTo || cfg.to || from, 10);
    return { from, to: Math.max(from, to) };
}

function buildFallbackQuestions(g, sec, normalizedDisplay) {
    const { from, to } = inferGroupRange(g, sec);
    const list = [];
    for (let qn = from; qn <= to; qn++) {
        if (normalizedDisplay === 'TRUE_FALSE_NG') {
            list.push({
                questionNumber: qn,
                questionText: `Question ${qn}`,
                choices: [
                    { label: 'TRUE', text: 'TRUE' },
                    { label: 'FALSE', text: 'FALSE' },
                    { label: 'NOT GIVEN', text: 'NOT GIVEN' }
                ]
            });
        } else {
            list.push({
                questionNumber: qn,
                questionText: `Question ${qn}`,
                lineTemplate: `[${qn}] ___`
            });
        }
    }
    return list;
}

function getGroupInstruction(g, sec, display, questions) {
    const explicitInstruction = String(
        g?.instruction || g?.instructions || g?.description || g?.desc || ''
    ).trim();
    if (explicitInstruction) return explicitInstruction;

    const qs = questions || [];
    let from = parseInt(g?.questionFrom || 0, 10);
    let to = parseInt(g?.questionTo || 0, 10);
    if (!(from > 0 && to >= from)) {
        if (qs.length) {
            from = parseInt(qs[0]?.questionNumber || 0, 10);
            to = parseInt(qs[qs.length - 1]?.questionNumber || from, 10);
        } else {
            const inferred = inferGroupRange(g, sec);
            from = inferred.from;
            to = inferred.to;
        }
    }

    const boxRange = `In boxes ${from}-${to} on your answer sheet,`;
    const firstChoices = qs?.[0]?.choices || [];
    const hasYesNo = firstChoices.some(c => String(c?.label || '').toUpperCase() === 'YES')
        && firstChoices.some(c => String(c?.label || '').toUpperCase() === 'NO');

    if (display === 'TRUE_FALSE_NG') {
        if (hasYesNo) {
            return `Do the following statements agree with the views of the writer? ${boxRange} write YES if the statement agrees with the views, NO if the statement contradicts the views, NOT GIVEN if there is no information on this.`;
        }
        return `Do the following statements agree with the information given in Reading Passage? ${boxRange} write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.`;
    }
    if (display === 'MULTIPLE_CHOICE') {
        return `Choose the correct letter for each question from ${from} to ${to}.`;
    }
    if (display === 'MATCHING' || display === 'MATCHING_HEADINGS') {
        return `Choose the correct letter and write your answers for questions ${from}-${to}.`;
    }
    if (display === 'TABLE_COMPLETION' || display === 'SUMMARY_COMPLETION' || display === 'FILL_BLOCK') {
        return `Complete questions ${from}-${to} based on the reading passage.`;
    }

    return `Answer questions ${from}-${to} based on the reading passage.`;
}

// Ưu tiên canonical group.type (Pha 0); fallback heuristic resolveDisplayTypeForGroup.
function resolveRenderKind(g) {
    const canonical = String(g.type || '').toUpperCase();
    switch (canonical) {
        case 'MULTIPLE_CHOICE_MULTI': return 'MULTIPLE_CHOICE_MULTI';
        case 'MULTIPLE_CHOICE': return 'MULTIPLE_CHOICE';
        case 'TRUE_FALSE_NOTGIVEN':
        case 'YES_NO_NOTGIVEN': return 'TRUE_FALSE_NG';
        case 'MATCHING': return 'MATCHING';
        case 'MAP_LABELLING': return 'MAP_LABELLING';
        case 'DIAGRAM_LABELLING': return 'DIAGRAM_LABELLING';
        case 'TABLE_COMPLETION': return 'TABLE_COMPLETION';
        case 'SUMMARY_COMPLETION': return 'SUMMARY_COMPLETION';
        case 'SUMMARY_WORDBANK': return 'SUMMARY_WORDBANK';
        case 'NOTE_COMPLETION':
        case 'FORM_COMPLETION':
        case 'FLOWCHART_COMPLETION':
        case 'SENTENCE_COMPLETION': return 'FILL_BLOCK';
        default: break;
    }
    // Không có canonical → dùng heuristic cũ, rồi tinh chỉnh chọn-2/labelling.
    let display = resolveDisplayTypeForGroup(g);
    if (display === 'MULTIPLE_CHOICE') {
        const qs = Array.isArray(g.questions) ? g.questions : [];
        if (Number(g.maxSelect) >= 2 || qs.some(q => Number(q.maxSelect) >= 2)) return 'MULTIPLE_CHOICE_MULTI';
    }
    if (display === 'MATCHING' && Array.isArray(g.dropZones) && g.dropZones.length) return 'MAP_LABELLING';
    if (display === 'MATCHING_HEADINGS') return 'MATCHING';
    return display;
}

function renderGroup(g, sec) {
    const display = resolveRenderKind(g);
    const sourceQuestions = (g.questions || []).length
        ? (g.questions || [])
        : buildFallbackQuestions(g, sec, display === 'MULTIPLE_CHOICE_MULTI' ? 'MULTIPLE_CHOICE' : display);
    const groupInstruction = getGroupInstruction(g, sec, display, sourceQuestions);

    let html = `<div style="height:8px;"></div>
      <div class="qsh">
                <div class="qsh-title">${eh(g.groupTitle || g.title || '')}</div>
        <div class="qsh-inst">${eh(groupInstruction)}</div>
      </div>`;

    switch (display) {
        case 'TRUE_FALSE_NG':
        case 'MULTIPLE_CHOICE':
            sourceQuestions.forEach(q => { html += renderQItem(q); });
            break;

        case 'MULTIPLE_CHOICE_MULTI':
            html += renderMcqMulti(g, sourceQuestions);
            break;

        case 'MAP_LABELLING':
        case 'DIAGRAM_LABELLING':
            sourceQuestions.forEach(q => rememberQuestionId(q));
            html += (window.ExamLabelling ? ExamLabelling.render(g) : renderMatchingDrag(sourceQuestions, g, 'MATCHING', sec));
            break;

        case 'SUMMARY_WORDBANK':
            html += renderSummaryWordbank(g, sourceQuestions);
            break;

        case 'MATCHING':
        case 'MATCHING_HEADINGS': {
                        html += renderMatchingDrag(sourceQuestions, g, display, sec);
            break;
        }

        case 'FILL_BLOCK': {
            // Có thể có subBlocks (Section 2 lifting) hoặc thẳng questions
            if (g.subBlocks && g.subBlocks.length) {
                html += `<div class="fill-block">`;
                if (g.blockTitle) html += `<div class="fill-title">${eh(g.blockTitle)}</div>`;
                g.subBlocks.forEach(sb => {
                    html += `<div class="fill-title" style="margin-top:9px;">${eh(sb.blockTitle || '')}</div>`;
                    (sb.questions || []).forEach(q => { html += renderFillLine(q); });
                });
                html += `</div>`;
            } else {
                html += `<div class="fill-block">`;
                if (g.blockTitle) html += `<div class="fill-title">${eh(g.blockTitle)}</div>`;
                sourceQuestions.forEach(q => { html += renderFillLine(q); });
                html += `</div>`;
            }
            break;
        }

        case 'TABLE_COMPLETION': {
            // Fallback: đề gắn nhãn "table" nhưng câu để phẳng → render fill-block, tránh bảng rỗng.
            if (Array.isArray(g.tableRows) && g.tableRows.length) {
                html += renderTableCompletion(g);
            } else {
                html += `<div class="fill-block">`;
                sourceQuestions.forEach(q => { html += renderFillLine(q); });
                html += `</div>`;
            }
            break;
        }

        case 'SUMMARY_COMPLETION': {
            if (String(g.summaryTemplate || '').trim()) {
                html += renderSummaryCompletion(g);
            } else {
                html += `<div class="fill-block">`;
                sourceQuestions.forEach(q => { html += renderFillLine(q); });
                html += `</div>`;
            }
            break;
        }

        default:
            sourceQuestions.forEach(q => { html += renderFillLine(q); });
    }

    return html;
}

// ── QItem (MCQ / TF-NG) ───────────────────────────────────────────────────────
function renderQItem(q) {
    rememberQuestionId(q);
    const qn = q.questionNumber;
    let html = `<div id="qi${qn}" class="qi" data-q="${qn}">
      <div class="qi-head">
        <span class="qbadge">${qn}</span>
        <span class="qtext">${eh(q.questionText || '')}</span>
      </div>
      <div class="ropts">`;
    (q.choices || []).forEach(c => {
                const display = formatChoiceDisplay(c);
        html += `<label class="ropt">
          <input type="radio" name="q${qn}" value="${eh(c.label)}" onchange="pa(${qn},'${eh(c.label)}')">
          <span class="rcircle"></span>
                    <span class="rtext">${eh(display)}</span>
        </label>`;
    });
    html += `</div></div>`;
    return html;
}

function formatChoiceDisplay(choice) {
        const label = String(choice?.label || '').trim();
        const text = String(choice?.text || '').trim();

        if (!label) return text;
        if (!text) return label;
        if (label.toUpperCase() === text.toUpperCase()) return text;
        return `${label}. ${text}`;
}

// ── Fill line ─────────────────────────────────────────────────────────────────
function renderFillLine(q) {
    rememberQuestionId(q);
    const qn  = q.questionNumber;
    const tpl = q.lineTemplate || q.questionText || `Question ${qn}: ___`;
    const w   = q.inputWidth   || 100;

    // Thay chỗ trống (___ hoặc dãy gạch dài _______) bằng badge + input; nếu không có thì gắn vào cuối.
    const inputHtml = `<span id="b${qn}" class="fb">${qn}</span> <input class="finp" id="q${qn}" placeholder="……" style="width:${w}px;" oninput="pa(${qn},this.value)">`;
    const line = tpl.includes('___') ? tpl.replace(/_{3,}/, inputHtml) : `${tpl} ${inputHtml}`;
    return `<div class="fill-line">${line}</div>`;
}

// ── Matching options ──────────────────────────────────────────────────────────
// Trả về [{value, text}]: value = chữ cái nộp/đáp án, text = mô tả (rỗng cho matching-paragraph).
function resolveMatchOptionValues(g, display, sec) {
    const letterObjs = (letters) => letters.map(l => ({ value: String(l), text: '' }));

    if (display === 'MATCHING_HEADINGS' && g.headingList) {
        return g.headingList
            .map(h => ({ value: String(h.label || '').trim(), text: String(h.text || h.heading || '').trim() }))
            .filter(o => o.value);
    }
    if (Array.isArray(g.matchOptions) && g.matchOptions.length) {
        return g.matchOptions.map(o => {
            if (o && typeof o === 'object') {
                return { value: String(o.letter || o.label || o.id || '').trim(), text: String(o.text || o.value || o.name || '').trim() };
            }
            return { value: String(o || '').trim(), text: '' };
        }).filter(o => o.value);
    }

    const ins = String(g?.instruction || g?.instructions || '');
    const rangeMatch = ins.match(/\bA\s*[-–]\s*([A-Z])\b/i);
    if (rangeMatch) {
        const end = String(rangeMatch[1]).toUpperCase().charCodeAt(0);
        if (end >= 65 && end <= 90) {
            const letters = [];
            for (let c = 65; c <= end; c++) letters.push(String.fromCharCode(c));
            return letterObjs(letters);
        }
    }

    const passageHtml = (sec?.passages || []).map(p => String(p?.content || '')).join(' ');
    const labelSet = new Set();
    const boldMatches = passageHtml.match(/<b>\s*([A-Z])\s*<\/b>/gi) || [];
    boldMatches.forEach(m => {
        const letter = m.replace(/<[^>]+>/g, '').trim().toUpperCase();
        if (/^[A-Z]$/.test(letter)) labelSet.add(letter);
    });

    const letters = Array.from(labelSet).sort();
    if (letters.length >= 3 && letters[0] === 'A') {
        return letterObjs(letters);
    }

    return letterObjs(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
}

function formatMatchingOptionLabel(value, display) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (display !== 'MATCHING_HEADINGS' && /^[A-Z]$/.test(raw)) return `Paragraph ${raw}`;
    return raw;
}

function formatMatchValueForDisplay(value) {
    const raw = String(value || '').trim();
    // Ô slot chỉ hiện chữ cái (gọn, đúng cho mọi loại matching: đoạn văn / người / sentence-ending / word-bank).
    return raw;
}

function renderMatchingDrag(questions, g, display, sec) {
    const opts = resolveMatchOptionValues(g, display, sec);
    let html = `<div class="match-block">`;

    questions.forEach(q => {
        rememberQuestionId(q);
        const qn = q.questionNumber;
        html += `<div id="qi${qn}" class="qi match-row" data-q="${qn}">
          <input type="hidden" id="q${qn}" value="">
          <button type="button" class="match-slot" id="ms${qn}" data-q="${qn}"
              onclick="focusMatchSlot(${qn})"
              ondblclick="clearMatchAnswer(${qn})"
              ondragover="onMatchDragOver(event)"
              ondrop="onMatchDrop(event,${qn})">
            <span class="match-slot-text" id="mst${qn}">${qn}</span>
          </button>
          <div class="match-qtext">${eh(q.questionText || '')}</div>
        </div>`;
    });

    html += `<div class="match-options-wrap">
      <div class="match-options-title">List of options</div>
      <div class="match-options">`;

    opts.forEach(opt => {
        const val = String(opt.value || '').trim();
        if (!val) return;
        const label = opt.text ? `${val}. ${opt.text}` : formatMatchingOptionLabel(val, display);
        html += `<button type="button" class="match-chip" data-val="${eh(val)}"
            draggable="true"
            ondragstart="onMatchDragStart(event,this.dataset.val)"
            onclick="onMatchOptionClick(this.dataset.val)">${eh(label)}</button>`;
    });

    html += `</div></div></div>`;
    return html;
}

// ── Table completion ──────────────────────────────────────────────────────────
function renderTableCompletion(g) {
    const headers = g.tableHeaders || [];
    let html = `<div class="real-tbl-wrap"><table class="qtbl"><thead><tr>`;
    headers.forEach(h => { html += `<th>${eh(h)}</th>`; });
    html += `</tr></thead><tbody>`;

    (g.tableRows || []).forEach(row => {
        html += `<tr><td><strong>${eh(row.strategy || '')}</strong></td>`;
        (row.cells || []).forEach(cell => {
            if (cell.questionNumber) {
                rememberQuestionId({ questionNumber: cell.questionNumber, id: cell.questionId || cell.id });
                const qn = cell.questionNumber;
                const w  = cell.inputWidth || 80;
                const tpl = cell.cellText || '';
                const inputHtml = `<span id="b${qn}" class="fb" style="display:inline-flex;vertical-align:middle;">${qn}</span> <input class="finp" id="q${qn}" placeholder="…" style="width:${w}px;" oninput="pa(${qn},this.value)">`;
                html += `<td>${tpl.replace('___', inputHtml)}</td>`;
            } else {
                html += `<td>${eh(cell.cellText || '')}</td>`;
            }
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}

// ── Summary completion ────────────────────────────────────────────────────────
function renderSummaryCompletion(g) {
    let tpl = g.summaryTemplate || '';
    // Thay [34], [35]... bằng badge + input
    (g.questions || []).forEach(q => {
        rememberQuestionId(q);
        const qn = q.questionNumber;
        const w  = q.inputWidth || 80;
        tpl = tpl.replace(
            `[${qn}]`,
            `<span id="b${qn}" class="fb" style="display:inline-flex;vertical-align:middle;">${qn}</span><input class="finp" id="q${qn}" placeholder="…" style="width:${w}px;" oninput="pa(${qn},this.value)">`
        );
    });
    let html = `<div class="summary-block">`;
    if (g.summaryTitle) html += `<strong>${eh(g.summaryTitle)}</strong><br><br>`;
    html += tpl + `</div>`;
    return html;
}

// ── MCQ chọn-2 (MULTIPLE_CHOICE_MULTI) ──────────────────────────────────────
function renderMcqMulti(g, questions) {
    const qNums = questions.map(q => Number(q.questionNumber)).filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    questions.forEach(q => rememberQuestionId(q));
    const maxSelect = Number(g.maxSelect) || Number(questions[0]?.maxSelect) || qNums.length || 2;
    const groupId = qNums.join('_');
    const choices = (g.choices && g.choices.length) ? g.choices : (questions[0]?.choices || []);
    const fromTo = qNums.length ? `${qNums[0]}–${qNums[qNums.length - 1]}` : '';

    let html = `<div class="mcq-multi" id="mcm${groupId}" data-qnums="${qNums.join(',')}" data-max="${maxSelect}">
        <div class="mcq-multi-head">
            <span class="mcq-multi-badge" id="mcmb${groupId}">${fromTo}</span>
            <span class="mcq-multi-hint">Chọn ${maxSelect} đáp án</span>
        </div>`;
    choices.forEach(c => {
        const label = String(c.label || '').trim();
        const display = formatChoiceDisplay(c);
        html += `<label class="mcq-multi-opt" id="mco${groupId}_${eh(label)}">
            <input type="checkbox" value="${eh(label)}" onchange="onMcqMultiChange('${groupId}')">
            <span>${eh(display)}</span>
        </label>`;
    });
    html += `</div>`;
    return html;
}

function onMcqMultiChange(groupId) {
    const wrap = document.getElementById('mcm' + groupId);
    if (!wrap) return;
    const max = Number(wrap.dataset.max) || 2;
    const qNums = String(wrap.dataset.qnums || '').split(',').map(n => Number(n)).filter(Boolean);
    const boxes = Array.from(wrap.querySelectorAll('input[type="checkbox"]'));
    let selected = boxes.filter(b => b.checked).map(b => b.value);

    if (selected.length > max) {
        const last = boxes.slice().reverse().find(b => b.checked);
        if (last) last.checked = false;
        selected = boxes.filter(b => b.checked).map(b => b.value);
    }

    boxes.forEach(b => b.closest('.mcq-multi-opt')?.classList.toggle('checked', b.checked));
    const full = selected.length >= max;
    const answer = full ? selected.slice().sort().join(',') : '';
    qNums.forEach(qn => pa(qn, answer));

    const badge = document.getElementById('mcmb' + groupId);
    if (badge) badge.classList.toggle('done', full);
}

// Token cho word-bank: chấp nhận matchOptions là chuỗi ("A") hoặc object {letter,text}.
function resolveWordbankOptions(g) {
    if (Array.isArray(g.matchOptions) && g.matchOptions.length) {
        return g.matchOptions.map(o => {
            if (o && typeof o === 'object') {
                return { value: String(o.letter || o.label || o.id || '').trim(), text: String(o.text || o.value || o.name || '').trim() };
            }
            return { value: String(o || '').trim(), text: '' };
        }).filter(o => o.value);
    }
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(l => ({ value: l, text: '' }));
}

// ── Summary với word-bank (kéo cụm từ A–H vào ô) ────────────────────────────
function renderSummaryWordbank(g, questions) {
    const opts = resolveWordbankOptions(g);
    let tpl = g.summaryTemplate || '';
    questions.forEach(q => {
        rememberQuestionId(q);
        const qn = q.questionNumber;
        const slot = `<input type="hidden" id="q${qn}" value="">` +
            `<button type="button" class="match-slot" id="ms${qn}" data-q="${qn}" style="display:inline-flex;min-width:90px;height:30px;vertical-align:middle;"
                onclick="focusMatchSlot(${qn})" ondblclick="clearMatchAnswer(${qn})"
                ondragover="onMatchDragOver(event)" ondrop="onMatchDrop(event,${qn})">
                <span class="match-slot-text" id="mst${qn}">${qn}</span></button>`;
        tpl = tpl.replace(`[${qn}]`, slot);
    });
    let html = `<div class="summary-block">`;
    if (g.summaryTitle) html += `<strong>${eh(g.summaryTitle)}</strong><br><br>`;
    html += tpl;
    html += `<div class="match-options-wrap" style="margin-top:12px;"><div class="match-options-title">List of options</div><div class="match-options">`;
    opts.forEach(opt => {
        const display = opt.text ? `${opt.value}. ${opt.text}` : opt.value;
        html += `<button type="button" class="match-chip" data-val="${eh(opt.value)}" draggable="true"
            ondragstart="onMatchDragStart(event,this.dataset.val)" onclick="onMatchOptionClick(this.dataset.val)">${eh(display)}</button>`;
    });
    html += `</div></div></div>`;
    return html;
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer() {
    timerInt = setInterval(() => {
        if (isRealMode()) {
            timeLeft--;
        } else {
            timeLeft++;
        }
        const h = Math.floor(timeLeft/3600), m = Math.floor((timeLeft%3600)/60), s = timeLeft%60;
        document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);
        if (isRealMode() && timeLeft <= 0) { clearInterval(timerInt); submitTest(); }
    }, 1000);
}
const pad = n => String(n).padStart(2,'0');

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
let currentNavPart = 0;

function buildNav() {
    const w = document.getElementById('qnav');
    w.innerHTML = '';
    const parts = getPracticeParts();

    parts.forEach((part, pi) => {
        const box = document.createElement('div');
        box.className = 'partbox'; box.id = 'partbox'+pi; box.style.cursor = 'pointer';
        box.onclick = (()=>{ const idx=pi; return ()=>switchPracticePart(idx); })();
        const lbl = document.createElement('span');
        lbl.className = 'partbox-lbl'; lbl.textContent = part.label;
        box.appendChild(lbl);
        for (let i = part.from; i <= part.to; i++) {
            if (i < cfg.from || i > cfg.to) continue;
            const b = document.createElement('button');
            b.className='qnb'; b.id='nb'+i; b.textContent=i;
            b.onclick=(()=>{const q=i;return ()=>goQ(q);})();
            box.appendChild(b);
        }
        w.appendChild(box);
    });
    currentNavPart = 0;
    if (parts.length > 0) switchPracticePart(0);
    updateNavArrows();
}

function switchPracticePart(idx) {
    if (document.body.classList.contains('real-mode')) return;
    const parts = getPracticeParts();
    const part = parts[idx]; if (!part) return;
    const secNum = part.secNum;

    const allSecNums = [...new Set((examData.sections || []).map((_, i) => getSecNo(i)))];

    allSecNums.forEach(s => {
        document.querySelectorAll(`#passagePanel [data-section="${s}"]`).forEach(el=>el.style.display='none');
        document.querySelectorAll(`#questionPanel [data-section="${s}"]`).forEach(el=>el.style.display='none');
    });
    document.querySelectorAll(`#passagePanel [data-section="${secNum}"]`).forEach(el=>el.style.display='');
    document.querySelectorAll(`#questionPanel [data-section="${secNum}"]`).forEach(el=>el.style.display='');

    const ps=document.getElementById('passageText'); if(ps) ps.scrollTop=0;
    const qs=document.getElementById('qScroll');     if(qs) qs.scrollTop=0;

    currentNavPart = idx;
    document.querySelectorAll('.partbox').forEach((b,i)=>b.classList.toggle('partbox-active',i===idx));
    updateNavArrows();
}

function navPrev() { if(currentNavPart>0) switchPracticePart(currentNavPart-1); }
function navNext() {
    const boxes = document.querySelectorAll('.partbox');
    if (currentNavPart < boxes.length-1) switchPracticePart(currentNavPart+1);
}
function updateNavArrows() {
    const boxes = document.querySelectorAll('.partbox');
    const prev  = document.getElementById('btnNavPrev');
    const next  = document.getElementById('btnNavNext');
    if (prev) prev.disabled = currentNavPart <= 0;
    if (next) next.disabled = currentNavPart >= boxes.length-1;
}
function goQ(q) {
    if (!document.body.classList.contains('real-mode')) {
        const parts = getPracticeParts();
        const idx = parts.findIndex(p=>q>=p.from&&q<=p.to);
        if (idx>=0 && idx!==currentNavPart) switchPracticePart(idx);
    }
    setTimeout(()=>{
        const el=document.getElementById('qi'+q)||document.getElementById('q'+q);
        if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
        document.querySelectorAll('.qnb').forEach(b=>b.classList.remove('cur'));
        const nb=document.getElementById('nb'+q);
        if(nb) nb.classList.add('cur');
    },50);
}

// ─── ANSWER ───────────────────────────────────────────────────────────────────
function pa(q, v) {
    ans[q] = v;
    const el = document.getElementById('qi'+q);
    if (el) { el.classList.toggle('done',!!v); const b=el.querySelector('.qbadge'); if(b) b.style.background=v?'var(--success)':'var(--primary)'; }
    const input = document.getElementById('q'+q);
    if (input) input.value = v || '';
    const slot = document.getElementById('ms'+q);
    const slotText = document.getElementById('mst'+q);
    if (slot && slotText) {
        const rendered = formatMatchValueForDisplay(v);
        slotText.textContent = rendered || String(q);
        slot.classList.toggle('filled', !!v);
    }
    const fb = document.getElementById('b'+q);
    if (fb) fb.classList.toggle('done',!!v);
    const nb = document.getElementById('nb'+q);
    if (nb) { nb.classList.toggle('done',!!v); }
    updateRealCounter();
}

let activeMatchQuestion = null;

function focusMatchSlot(q) {
    activeMatchQuestion = q;
    document.querySelectorAll('.match-slot').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('ms' + q);
    if (target) target.classList.add('active');
}

function clearMatchAnswer(q) {
    pa(q, '');
}

function onMatchDragStart(event, value) {
    event.dataTransfer.setData('text/plain', String(value || ''));
    event.dataTransfer.effectAllowed = 'copy';
}

function onMatchDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

function onMatchDrop(event, q) {
    event.preventDefault();
    const value = String(event.dataTransfer.getData('text/plain') || '').trim();
    if (!value) return;
    focusMatchSlot(q);
    pa(q, value);
}

function onMatchOptionClick(value) {
    const val = String(value || '').trim();
    if (!val) return;

    let targetQ = activeMatchQuestion;
    if (!targetQ) {
        const firstEmpty = document.querySelector('.match-row[data-q]:not(.done)');
        if (firstEmpty) targetQ = Number(firstEmpty.dataset.q);
    }
    if (!targetQ) {
        const firstRow = document.querySelector('.match-row[data-q]');
        if (firstRow) targetQ = Number(firstRow.dataset.q);
    }
    if (!targetQ) return;

    focusMatchSlot(targetQ);
    pa(targetQ, val);
}

// ─── REAL MODE ────────────────────────────────────────────────────────────────
const PART_CFG = {
    1:{from:1, to:14, sub:'Read the text and answer questions 1–14'},
    2:{from:15,to:27, sub:'Read the text and answer questions 15–27'},
    3:{from:28,to:40, sub:'Read the text and answer questions 28–40'},
};
let currentRealPart = 1, currentRealQ = 1;
const bookmarked = new Set();

function partOfQ(q) {
    const parts = normalizedParts;
    const found = parts.find(p => q >= p.from && q <= p.to);
    return found ? found.secNum : (parts[0]?.secNum || 1);
}

function initRealMode() {
    currentRealPart = examSection==='full' ? 1 : parseInt(examSection);
    currentRealQ    = cfg.from;
    const isSingle  = examSection !== 'full';

    normalizedParts.forEach(pObj => {
        const p = pObj.secNum;
        const show = examSection==='full' || examSection===String(p);
        const el   = document.getElementById('rbp'+p);
        if (el) {
            el.style.display = show ? '' : 'none';
            if (show && isSingle) {
                el.style.cursor = 'default'; el.onclick = null; el.style.pointerEvents = 'none';
            }
        }
    });

    normalizedParts.forEach(pObj => {
        const p = pObj.secNum;
        if (examSection!=='full' && examSection!==String(p)) return;
        const r = pObj;
        const container = document.getElementById('rbq'+p); if (!container) return;
        container.innerHTML = '';
        for (let i=r.from; i<=r.to; i++) {
            const b = document.createElement('button');
            b.className='rbot-qn'; b.id='rbn'+i; b.textContent=i;
            b.onclick=(e)=>{e.stopPropagation();focusQuestion(i);};
            container.appendChild(b);
        }
        const cnt=document.getElementById('rbc'+p); if(cnt) cnt.textContent='0 of '+(r.to-r.from+1);
    });

    // Bookmark icons
    document.querySelectorAll('.qi').forEach(qi => {
        const q = qi.dataset.q;
        if (!q||qi.querySelector('.qi-bm')) return;
        const btn=document.createElement('button');
        btn.className='qi-bm'; btn.dataset.q=q;
        btn.innerHTML='<i class="bi bi-bookmark"></i>';
        btn.onclick=(e)=>{e.stopPropagation();toggleBookmarkQ(parseInt(q));};
        const head=qi.querySelector('.qi-head'); if(head) head.appendChild(btn); else qi.appendChild(btn);
    });

    normalizedParts.forEach(pObj => {
        const p = pObj.secNum;
        document.querySelectorAll(`#passagePanel [data-section="${p}"]`).forEach(el=>el.style.display='none');
        document.querySelectorAll(`.qpanel [data-section="${p}"]`).forEach(el=>el.style.display='none');
    });
    switchRealPart(currentRealPart);
    startTimer();
}

function switchRealPart(part) {
    if (examSection!=='full' && part!==parseInt(examSection)) return;
    currentRealPart = part;
    normalizedParts.forEach(pObj => {
        const p = pObj.secNum;
        const show = p===part;
        document.querySelectorAll(`#passagePanel [data-section="${p}"]`).forEach(el=>el.style.display=show?'':'none');
        document.querySelectorAll(`.qpanel [data-section="${p}"]`).forEach(el=>el.style.display=show?'':'none');
        const rbp=document.getElementById('rbp'+p); if(rbp) rbp.classList.toggle('active',show);
    });
    document.getElementById('passageText').scrollTop=0;
    document.getElementById('qScroll').scrollTop=0;

    const r = normalizedParts.find(p => p.secNum === part) || PART_CFG[part];
    const lbl=document.getElementById('partInfoLabel'); if(lbl) lbl.textContent='Part '+part;
    const sub=document.getElementById('partInfoSub');   if(sub) sub.textContent=r.sub;

    let target=r.from;
    for(let i=r.from;i<=r.to;i++){if(!(ans[i]&&ans[i].trim())){target=i;break;}}
    currentRealQ=target;
    updateRealBotNav();
}

function focusQuestion(q) {
    const part=partOfQ(q);
    if (part!==currentRealPart) switchRealPart(part);
    currentRealQ=q;
    setTimeout(()=>{ const el=document.getElementById('qi'+q); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); updateRealBotNav(); },50);
}
function prevQuestion() { if(currentRealQ>cfg.from) focusQuestion(currentRealQ-1); }
function nextQuestion() { if(currentRealQ<cfg.to)   focusQuestion(currentRealQ+1); }

function toggleBookmarkQ(q) {
    if(bookmarked.has(q)) bookmarked.delete(q); else bookmarked.add(q);
    const active=bookmarked.has(q);
    const qi=document.getElementById('qi'+q);
    if(qi){ qi.classList.toggle('bookmarked',active); const bm=qi.querySelector('.qi-bm'); if(bm){bm.classList.toggle('active',active);bm.innerHTML=active?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>';} }
    const rbn=document.getElementById('rbn'+q); if(rbn) rbn.classList.toggle('bookmarked',active);
}

function updateRealBotNav() {
    document.querySelectorAll('.rbot-qn').forEach(b=>{
        const q=parseInt(b.textContent);
        b.classList.toggle('current',q===currentRealQ);
        b.classList.toggle('bookmarked',bookmarked.has(q));
        b.classList.toggle('answered',!!(ans[q]&&ans[q].trim())&&!bookmarked.has(q));
    });
    normalizedParts.forEach(pObj=>{
        const p = pObj.secNum;
        const r = pObj;
        const done=Object.entries(ans).filter(([k,v])=>+k>=r.from&&+k<=r.to&&v&&v.trim()).length;
        const cnt=document.getElementById('rbc'+p); if(cnt) cnt.textContent=done+' of '+(r.to-r.from+1);
    });
    const prev=document.getElementById('btnPrev'); if(prev) prev.disabled=currentRealQ<=cfg.from;
    const next=document.getElementById('btnNext'); if(next) next.disabled=currentRealQ>=cfg.to;
}
function updateRealCounter(){ if(document.body.classList.contains('real-mode')) updateRealBotNav(); }

// ─── TOOLS ────────────────────────────────────────────────────────────────────
function setTool(t) {
    activeTool = activeTool===t?null:t;
    document.querySelectorAll('.tool').forEach(b=>b.classList.remove('on'));
    if(activeTool){ const m={hl:'tHL',nt:'tNT',vc:'tVC'}; document.getElementById(m[activeTool])?.classList.add('on'); }
}
function onKey(e) {
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if(e.key==='h'||e.key==='H') setTool('hl');
    if(e.key==='n'||e.key==='N') setTool('nt');
    if(e.key==='t'||e.key==='T') setTool('vc');
}

// ─── TEXT SELECTION ───────────────────────────────────────────────────────────
function onSel(e) {
    const sel=window.getSelection(); if(!sel||sel.isCollapsed) return;
    const txt=sel.toString().trim(); if(!txt) return;
    if(activeTool==='hl'){
        const highlightPayload = getHighlightPayloadFromSelection(sel);
        doHL(sel,'hl-y');
        if (highlightPayload && attemptId) {
            void persistHighlight(highlightPayload);
        }
        sel.removeAllRanges();
    }
    else if(activeTool==='nt'){
        const qFromSelection = getQuestionNumberFromSelection(sel) || getCurrentQuestionNumber();
        doHL(sel,'hl-n');
        void addNote(txt, qFromSelection);
        sel.removeAllRanges();
    }
    else if(activeTool==='vc'){
        const r=sel.getRangeAt(0).getBoundingClientRect();
        showVP(r.left+r.width/2,r.bottom+8,txt);
        sel.removeAllRanges();
    }
}
function doHL(sel,cls){
    try{const r=sel.getRangeAt(0),sp=document.createElement('span');sp.className=cls;r.surroundContents(sp);}
    catch(e){try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}}
}

function getHighlightPayloadFromSelection(selection) {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const anchorNode = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    const passageChunk = anchorNode?.closest?.('[data-passage-id]');
    if (!passageChunk) return null;

    const passageId = Number(passageChunk.dataset.passageId);
    if (!Number.isFinite(passageId) || passageId <= 0) return null;

    let startOffset;
    let endOffset;
    try {
        startOffset = getTextOffsetWithinNode(passageChunk, range.startContainer, range.startOffset);
        endOffset = getTextOffsetWithinNode(passageChunk, range.endContainer, range.endOffset);
    } catch (_) {
        return null;
    }

    if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
    const safeStart = Math.max(0, Math.min(startOffset, endOffset));
    const safeEnd = Math.max(0, Math.max(startOffset, endOffset));
    if (safeEnd <= safeStart) return null;

    return {
        passageId,
        startOffset: safeStart,
        endOffset: safeEnd
    };
}

function getTextOffsetWithinNode(rootNode, targetNode, targetOffset) {
    const range = document.createRange();
    range.selectNodeContents(rootNode);
    range.setEnd(targetNode, targetOffset);
    return range.toString().length;
}

function findTextPositionByOffset(rootNode, offset) {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.textContent || !node.textContent.length) return NodeFilter.FILTER_REJECT;
            if (node.parentElement?.closest('.hl-y, .hl-n, .vocab-highlight')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    let remaining = Math.max(0, offset);
    let current = null;
    while ((current = walker.nextNode())) {
        const length = current.textContent.length;
        if (remaining <= length) {
            return { node: current, offset: remaining };
        }
        remaining -= length;
    }

    return null;
}

function applyHighlightByOffsets(rootNode, startOffset, endOffset, cssClass = 'hl-y') {
    if (!rootNode) return;
    const safeStart = Number(startOffset);
    const safeEnd = Number(endOffset);
    if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeEnd <= safeStart) return;

    const startPos = findTextPositionByOffset(rootNode, safeStart);
    const endPos = findTextPositionByOffset(rootNode, safeEnd);
    if (!startPos || !endPos) return;

    const range = document.createRange();
    range.setStart(startPos.node, Math.min(startPos.offset, startPos.node.textContent.length));
    range.setEnd(endPos.node, Math.min(endPos.offset, endPos.node.textContent.length));
    if (!range.toString().trim()) return;

    const span = document.createElement('span');
    span.className = cssClass;
    try {
        range.surroundContents(span);
    } catch (_) {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
    }
}

async function persistHighlight(payload) {
    if (!attemptId || !payload) return;
    try {
        await createHighlight(attemptId, payload.passageId, payload.startOffset, payload.endOffset, null);
    } catch (error) {
        console.warn('Không thể lưu highlight lên backend:', error?.message || error);
    }
}

async function restorePracticeAnnotations() {
    if (!attemptId) return;
    await Promise.allSettled([
        loadNotesFromBackend(),
        loadHighlightsFromBackend()
    ]);
}

async function loadHighlightsFromBackend() {
    if (!attemptId) return;
    try {
        const res = await getAttemptHighlights(attemptId);
        const items = res?.data || res || [];
        if (!Array.isArray(items)) return;

        items.forEach((item) => {
            const passageId = Number(item?.passageId);
            if (!Number.isFinite(passageId) || passageId <= 0) return;
            const target = document.querySelector(`.passage-chunk[data-passage-id="${passageId}"]`);
            if (!target) return;
            applyHighlightByOffsets(target, item.startOffset, item.endOffset, item.color || 'hl-y');
        });
    } catch (error) {
        console.warn('Không thể tải highlight từ backend:', error?.message || error);
    }
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
async function addNote(txt, questionNumber = null) {
    const selectedText = String(txt || '').trim();
    if (!selectedText) return;

    const resolvedQuestionNumber = Number(questionNumber) || getCurrentQuestionNumber();
    const questionId = getQuestionIdByNumber(resolvedQuestionNumber);
    const localNote = {
        id: Date.now(),
        txt: selectedText,
        note: '',
        questionNumber: resolvedQuestionNumber,
        questionId: questionId || null,
        isRemote: false
    };

    notes.push(localNote);
    renderNotes();
    if (!noteVisible) toggleNote();

    if (!attemptId || !questionId) return;

    try {
        const response = await createNote(attemptId, questionId, encodeNoteContent(selectedText, ''));
        const saved = response?.data || response;
        if (saved?.id) {
            localNote.id = saved.id;
            localNote.questionId = saved.questionId || questionId;
            localNote.questionNumber = getQuestionNumberById(localNote.questionId) || resolvedQuestionNumber;
            localNote.isRemote = true;
            renderNotes();
        }
    } catch (error) {
        console.warn('Không thể lưu note lên backend:', error?.message || error);
    }
}

async function loadNotesFromBackend() {
    if (!attemptId) return;
    try {
        const response = await getAttemptNotes(attemptId);
        const items = response?.data || response || [];
        if (!Array.isArray(items)) return;

        notes = items.map((item) => {
            const parsed = decodeNoteContent(item?.content);
            const qId = Number(item?.questionId);
            return {
                id: item?.id,
                txt: parsed.selectedText || '(Không có đoạn trích)',
                note: parsed.note || '',
                questionId: Number.isFinite(qId) && qId > 0 ? qId : null,
                questionNumber: Number.isFinite(qId) && qId > 0 ? getQuestionNumberById(qId) : null,
                isRemote: true
            };
        });

        renderNotes();
    } catch (error) {
        console.warn('Không thể tải danh sách note từ backend:', error?.message || error);
    }
}

function renderNotes(){
    const list=document.getElementById('nbList'),empty=document.getElementById('nbEmpty');
    if(!notes.length){if(empty)empty.style.display='block';list.innerHTML='';list.appendChild(empty);return;}
    if(empty)empty.style.display='none';
    list.innerHTML=notes.map(n=>`
      <div class="nb-item" id="ni${n.id}">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <div class="nb-sel" title="${eh(n.txt)}">${eh(n.txt.substring(0,55))}${n.txt.length>55?'…':''}</div>
          <button class="nb-del" onclick="delNote(${n.id})"><i class="bi bi-trash3"></i></button>
        </div>
        <textarea class="nb-ta" rows="2" placeholder="Nhập ghi chú…"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveNote(${n.id},this.value);}"
          onblur="saveNote(${n.id},this.value)">${eh(n.note)}</textarea>
      </div>`).join('');
}
async function saveNote(id, v) {
    const n = notes.find(x => String(x.id) === String(id));
    if (!n) return;

    n.note = String(v || '');
    if (!n.isRemote || !attemptId || !n.questionId) return;

    try {
        await updateNote(n.id, encodeNoteContent(n.txt, n.note));
    } catch (error) {
        console.warn('Không thể cập nhật note:', error?.message || error);
    }
}

async function delNote(id) {
    const index = notes.findIndex(x => String(x.id) === String(id));
    if (index === -1) return;

    const noteItem = notes[index];
    notes.splice(index, 1);
    renderNotes();

    if (!noteItem.isRemote) return;
    try {
        await deleteNote(noteItem.id);
    } catch (error) {
        console.warn('Không thể xóa note trên backend:', error?.message || error);
    }
}

async function clearAllNotes(){
    if(!notes.length)return;
    if(confirm('Xoá tất cả ghi chú?')){
        const remoteIds = notes.filter(n => n.isRemote).map(n => n.id);
        notes=[];
        document.querySelectorAll('.hl-n').forEach(el=>{const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);});
        renderNotes();

        await Promise.allSettled(remoteIds.map((id) => deleteNote(id)));
    }
}
function toggleNote(){
    noteVisible=!noteVisible;
    document.getElementById('notebar').classList.toggle('off',!noteVisible);
    syncSubnav();
}
function syncSubnav(){
    const lbl=noteVisible?'Ẩn note':'Hiện note';
    document.getElementById('btnSubNote').textContent=lbl;
}

// ─── VOCAB SYSTEM ─────────────────────────────────────────────────────────────
function getVocabData() { return JSON.parse(localStorage.getItem(VOCAB_STORAGE_KEY) || '[]'); }
function saveVocabData(data) { localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(data)); }
function getVocabGroups() {
    const groups = JSON.parse(localStorage.getItem(VOCAB_GROUPS_KEY) || '[]');
    if (groups.length === 0) {
        const defaults = ['IELTS Reading', 'Academic Words', 'Collocations'];
        localStorage.setItem(VOCAB_GROUPS_KEY, JSON.stringify(defaults));
        return defaults;
    }
    return groups;
}
function saveVocabGroups(groups) { localStorage.setItem(VOCAB_GROUPS_KEY, JSON.stringify(groups)); }

function recordVocabActivity() {
    const key = 'aimhigh_vocab_activity';
    const activity = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(activity));
}

function showVP(x,y,word) {
    selectedWord = word;
    const p = document.getElementById('vpop');
    if (!p) return;
    
    document.getElementById('vpW').textContent = word;
    
    // Reset definitions (Optional: you can implement an API call here to fetch meaning)
    ['vpR','vpM','vpE','vpT'].forEach(id=>{ const el=document.getElementById(id);if(el)el.textContent='None'; });
    
    // Populate select group for saving vocab
    const select = document.getElementById('vocabGroupSelect');
    if (select) {
        const groups = getVocabGroups();
        select.innerHTML = '<option value="">-- Chọn nhóm từ --</option>';
        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            select.appendChild(opt);
        });
        const newOpt = document.createElement('option');
        newOpt.value = '__new__';
        newOpt.textContent = '➕ Tạo nhóm mới…';
        select.appendChild(newOpt);
    }

    // Position popup
    let px=x-148,py=y+6;
    if(px<6)px=6;
    if(px+296>window.innerWidth)px=window.innerWidth-302;
    if(py+250>window.innerHeight)py=y-256;
    p.style.left=px+'px'; p.style.top=py+'px'; p.classList.add('on');
}

function closeVP(){
    const p = document.getElementById('vpop');
    if (p) p.classList.remove('on');
    selectedWord = '';
}

async function saveVW() {
    const groupSelect = document.getElementById('vocabGroupSelect');
    let group = groupSelect ? groupSelect.value : 'IELTS Reading';

    if (!selectedWord) return;

    // Cho phép tạo nhóm mới ngay khi lưu
    if (group === '__new__') {
        const newName = (prompt('Tên nhóm từ vựng mới:') || '').trim();
        if (!newName) return;
        group = newName;
        const groups = getVocabGroups();
        if (!groups.includes(newName)) {
            groups.push(newName);
            saveVocabGroups(groups);
        }
    }

    if (!group) {
        alert('Vui lòng chọn hoặc tạo nhóm từ!');
        return;
    }

    if (!localStorage.getItem('aimhigh_token')) {
        alert('Bạn cần đăng nhập để lưu từ vựng vào sổ tay.');
        return;
    }

    try {
        // 1) Thử tra trong kho AimHigh Pick để lấy vocabId
        let vocabData = null;
        try {
            const response = await apiLookupVocab(selectedWord);
            vocabData = response?.data || response;
        } catch (lookupErr) {
            vocabData = null; // Không có trong AimHigh Pick -> lưu dạng từ cá nhân
        }

        if (vocabData && vocabData.isSaved) {
            alert(`Từ "${selectedWord}" đã có sẵn trong sổ tay từ vựng!`);
            closeVP();
            return;
        }

        if (vocabData && vocabData.id) {
            // Từ có trong AimHigh Pick -> lưu theo vocabId
            await apiSaveUserVocab(vocabData.id, { groupName: group });
        } else {
            // Từ không có trong AimHigh Pick -> lưu thành từ cá nhân (custom)
            await apiSaveCustomUserVocab({ word: selectedWord, groupName: group });
        }

        recordVocabActivity();
        highlightWordInPassage(selectedWord);
        alert(`Đã lưu từ "${selectedWord}" vào nhóm "${group}"`);
        closeVP();
    } catch (e) {
        const msg = e?.message || 'Lỗi không xác định';
        alert(`Có lỗi xảy ra khi lưu từ vựng: ${msg}`);
        console.error("Save Vocab Error:", e);
    }
}

function copyVW(){
    navigator.clipboard?.writeText(document.getElementById('vpW').textContent);
    closeVP();
}

function highlightWordInPassage(word) {
    const passage = document.getElementById('passageText');
    if(!passage) return;
    const walker = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT);
    const regex = new RegExp('\\b(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');

    const nodesToReplace = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement.classList.contains('vocab-highlight')) continue;
        if (regex.test(node.textContent)) {
            nodesToReplace.push(node);
        }
    }

    nodesToReplace.forEach(node => {
        const span = document.createElement('span');
        span.innerHTML = node.textContent.replace(regex, `<span class="vocab-highlight" title="Đã lưu: ${word}" style="background-color: #fef08a; border-bottom: 2px dashed #eab308; cursor: help;">$1</span>`);
        node.parentElement.replaceChild(span, node);
    });
}

async function restoreHighlights() {
    let words = [];

    try {
        const response = await apiGetUserVocab();
        const remoteData = response?.data || response || [];
        if (Array.isArray(remoteData)) {
            words = remoteData.map((item) => String(item?.word || '').trim()).filter(Boolean);
        }
    } catch (error) {
        const localData = getVocabData();
        words = localData.map(v => String(v?.word || '').trim()).filter(Boolean);
    }

    [...new Set(words)].forEach(word => highlightWordInPassage(word));
}

document.addEventListener('mousedown',e=>{
    const p=document.getElementById('vpop');
    if(p&&p.classList.contains('on')&&!p.contains(e.target))closeVP();
});

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
function submitTest(){
    if (isReviewMode) {
        goToPracticeFromReview();
        return;
    }
    const c=Object.values(ans).filter(a=>a&&a.trim()).length;
    document.getElementById('mA').textContent=c;
    document.getElementById('mU').textContent=TOTAL-c;
    document.getElementById('mT').textContent=document.getElementById('timer').textContent;
    new bootstrap.Modal(document.getElementById('subModal')).show();
}

function getSubmitTimeSpentSeconds() {
    if (isRealMode()) {
        return Math.max(0, Number(cfg.time || 0) - Number(timeLeft || 0));
    }
    return Math.max(0, Number(timeLeft || 0));
}

async function confirmSub(){
    if (isReviewMode) return;
    clearInterval(timerInt);
    if (autoSaveInt) clearInterval(autoSaveInt);
    
    bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
    
    attemptId = await ensureAttemptIdReady();

    if (!attemptId) {
        try {
            const retryAttempt = await startAttempt(examId, examModeFromContext);
            const retryData = retryAttempt.data || retryAttempt;
            attemptId = retryData.id;
            if (attemptId) {
                saveAttemptContext(attemptId);
            }
        } catch (retryErr) {
            const recoveredId = await findInProgressAttemptFromServer();
            if (recoveredId) {
                attemptId = recoveredId;
                saveAttemptContext(attemptId);
            } else {
                alert('Lỗi: Không tìm thấy phiên thi. Vui lòng tải lại trang.\nChi tiết: ' + (retryErr?.message || 'Unknown'));
                return;
            }
        }
    }

    // Build answers array cho Backend
    const answersPayload = [];
    for (let q = cfg.from; q <= cfg.to; q++) {
        const userAns = (ans[q] || '').trim();
        answersPayload.push({
            questionNumber: q,
            answerText: userAns || null,
            isSkipped: !userAns
        });
    }

    try {
        const res = await submitAttemptAnswers(attemptId, answersPayload, getSubmitTimeSpentSeconds());
        const submitResult = res.data || res;
        const result = await resolveDetailedResult(attemptId, submitResult, 5);
        
        // Lưu kết quả và chuyển trang
        localStorage.setItem('lastResultAttemptId', String(attemptId));
        localStorage.setItem('aimhigh_lastResult', JSON.stringify(result || {}));
        clearAttemptContext();
        window.location.href = `result.html?attemptId=${attemptId}`;
    } catch (err) {
        console.error('Lỗi nộp bài:', err);
        alert('Lỗi khi nộp bài! ' + err.message);
    }
}

// ─── AUTO SAVE PROGRESS ──────────────────────────────────────────────────────
function startAutoSave() {
    if (isReviewMode) return;
    if (!attemptId) return;
    
    autoSaveInt = setInterval(async () => {
        const keys = Object.keys(ans);
        if (keys.length === 0) return;
        
        for (const qNum of keys) {
            const val = (ans[qNum] || '').trim();
            if (val) {
                try {
                    await saveAttemptProgress(attemptId, parseInt(qNum), val);
                } catch (e) {
                    console.warn('Auto-save lỗi câu', qNum, e.message);
                }
            }
        }
        console.log('Auto-save hoàn tất:', new Date().toLocaleTimeString());
    }, 60000); // Mỗi 60 giây
}

// ─── RESTORE PROGRESS (khi F5) ──────────────────────────────────────────────
async function restoreProgress() {
    if (isReviewMode) return;
    if (!attemptId) return;
    try {
        const res = await getAttemptProgress(attemptId);
        const progressList = res.data || res || [];
        
        if (progressList.length === 0) return;
        
        progressList.forEach(item => {
            const qNum = item.questionId || item.questionNumber;
            const aText = item.answerText;
            if (qNum && aText) {
                ans[qNum] = aText;
                // Điền lại giá trị lên input/radio
                const input = document.getElementById('q' + qNum);
                if (input) {
                    input.value = aText;
                }
                // Cập nhật badge + nav
                pa(qNum, aText);
            }
        });
        console.log('Khôi phục tiến độ:', progressList.length, 'câu');
    } catch (e) {
        console.warn('Không thể khôi phục tiến độ:', e.message);
    }
}

// ─── RESIZE HANDLE ────────────────────────────────────────────────────────────
function initResizeHandle() {
    const handle=document.getElementById('resizeHandle');
    const left  =document.getElementById('passagePanel');
    const right =document.getElementById('questionPanel');
    if(!handle||!left||!right) return;
    handle.addEventListener('pointerdown',e=>{
        e.preventDefault(); handle.setPointerCapture(e.pointerId);
        const startX=e.clientX, startW=left.getBoundingClientRect().width;
        handle.classList.add('dragging'); document.body.style.userSelect='none'; document.body.style.cursor='col-resize';
        function onMove(ev){
            const delta=ev.clientX-startX;
            const totalW=handle.parentElement.getBoundingClientRect().width;
            const toolsEl=document.querySelector('.tools');
            const toolW =(toolsEl && getComputedStyle(toolsEl).position!=='fixed') ? (toolsEl.offsetWidth||0) : 0;
            const available=totalW-toolW-8;
            const newW=Math.min(Math.max(startW+delta,available*0.25),available*0.75);
            left.style.flex='none'; left.style.width=newW+'px'; right.style.flex='1'; right.style.minWidth='0';
        }
        function onUp(){ handle.classList.remove('dragging'); document.body.style.userSelect=''; document.body.style.cursor='';
            handle.removeEventListener('pointermove',onMove); handle.removeEventListener('pointerup',onUp); }
        handle.addEventListener('pointermove',onMove); handle.addEventListener('pointerup',onUp);
    });
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const eh = s => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ehMultiline = s => eh(s).replace(/\n/g,'<br>');

