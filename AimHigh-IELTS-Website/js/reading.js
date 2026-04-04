// ===== READING.JS — Render động từ API & Tích hợp Vocab =====
// Fetch /api/exams/{id} rồi build passage + questions vào DOM.
// Tích hợp API Backend: startAttempt, autoSave, submit.

// ─── CONFIG từ localStorage ───────────────────────────────────────────────────
const examSection = localStorage.getItem('currentExamSection') || 'full';
const examId = parseInt(localStorage.getItem('currentExamId') || '1', 10);

// Section config (sẽ được điền sau khi fetch)
let cfg = { total: 40, time: 60*60, from: 1, to: 40, label: '', info: '' };
const SEC_TIME = { full: 60*60, '1': 20*60, '2': 20*60, '3': 20*60 };

let examData = null;   // raw JSON từ API
let TOTAL    = 0;

let ans = {}, timerInt, activeTool = null, noteVisible = false, notes = [];
let timeLeft = 0;
let attemptId = null;  // ID phiên thi từ Backend
let autoSaveInt = null; // Interval auto-save

// Vocab Constants
const VOCAB_STORAGE_KEY = 'aimhigh_vocab';
const VOCAB_GROUPS_KEY = 'aimhigh_vocab_groups';
let selectedWord = '';

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadExam();
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
    try {
        const examMode = localStorage.getItem('currentExamMode') || 'practice';
        const attemptRes = await startAttempt(examId, examMode);
        const attemptData = attemptRes.data || attemptRes;
        attemptId = attemptData.id;
        localStorage.setItem('currentAttemptId', attemptId);
        console.log('Phiên thi đã khởi tạo. AttemptId:', attemptId);
    } catch (err) {
        console.warn('Không thể tạo phiên thi (có thể đang có phiên chưa hoàn thành):', err.message);
        attemptId = localStorage.getItem('currentAttemptId');
    }

    // ── Build config theo section được chọn ──────────────────────────────────
    buildConfig();

    // ── Render passage & questions ────────────────────────────────────────────
    renderPassages();
    renderQuestions();

    // ── UI updates ────────────────────────────────────────────────────────────
    const examTitle = localStorage.getItem('currentExamTitle') || cfg.label;
    const titleEl   = document.querySelector('.exam-title');
    if (titleEl) titleEl.textContent = examTitle;
    const snInfo = document.querySelector('.sn-info');
    if (snInfo) snInfo.innerHTML = `Đề: <strong>${cfg.label}</strong> &nbsp;|&nbsp; ${cfg.info}`;

    const h = Math.floor(timeLeft/3600), m = Math.floor((timeLeft%3600)/60), s = timeLeft%60;
    document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);

    const mUEl    = document.getElementById('mU');    if (mUEl) mUEl.textContent = TOTAL;
    const mTotEl  = document.getElementById('mTotal');if (mTotEl) mTotEl.textContent = TOTAL;

    // ── Mode ─────────────────────────────────────────────────────────────────
    const examMode = localStorage.getItem('currentExamMode') || 'practice';
    if (examMode === 'real') {
        document.body.classList.add('real-mode');
        initRealMode();
    } else {
        buildNav();
        startTimer();
    }

    // ── Auto-save progress mỗi 60 giây ───────────────────────────────────
    startAutoSave();

    // ── Khôi phục tiến độ nếu user F5 ────────────────────────────────────
    await restoreProgress();

    // Khôi phục highlight/note từ server theo attempt
    await restoreServerHighlightsAndNotes();

    // Restore Vocab Highlights if they exist in localStorage
    restoreHighlights();
    
    document.getElementById('passageText').addEventListener('mouseup', onSel);
    document.addEventListener('keydown', onKey);
    syncSubnav();
    initResizeHandle();
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function buildConfig() {
    const exam = examData.exam;
    const secs = examData.sections || [];

    if (examSection === 'full') {
        cfg.total = exam.totalQuestions;
        cfg.time  = (exam.duration || 60) * 60;
        cfg.from  = 1;
        cfg.to    = exam.totalQuestions;
        cfg.label = exam.title;
        cfg.info  = `${exam.totalQuestions} câu | ${exam.duration} phút`;
    } else {
        const idx = parseInt(examSection, 10) - 1;
        const sec = secs[idx] || secs[0];
        cfg.from  = sec.questionFrom;
        cfg.to    = sec.questionTo;
        cfg.total = cfg.to - cfg.from + 1;
        cfg.time  = SEC_TIME[examSection] || 20*60;
        cfg.label = `${exam.title} – ${sec.label || ('Section '+examSection)}`;
        cfg.info  = `${cfg.total} câu | 20 phút`;
    }
    TOTAL    = cfg.total;
    timeLeft = cfg.time;
}



// ─── RENDER PASSAGES ─────────────────────────────────────────────────────────
function renderPassages() {
    const container = document.getElementById('passageText');
    container.innerHTML = '';

    (examData.sections || []).forEach(sec => {
        const secNum = sec.sectionNumber;
        if (examSection !== 'full' && String(secNum) !== examSection) return;

        const wrap = document.createElement('div');
        wrap.dataset.section = secNum;

        // Section header
        let html = `
          <div class="p-label">Reading Passage ${secNum}</div>
          <div class="p-section-head">Section ${secNum} — Questions ${sec.questionFrom}–${sec.questionTo}</div>
          <div class="p-meta">You should spend about 20 minutes on questions ${sec.questionFrom}–${sec.questionTo} which are based on the texts below.</div>`;

        // Passages
        (sec.passages || []).forEach((p, pi) => {
            if (pi > 0) html += `<div class="subtitle" style="margin-top:26px;">${eh(p.title)}</div>`;
            else        html += `<div class="p-title">${eh(p.title)}</div>`;
            if (p.subtitle) html += `<p style="font-size:.79rem;color:var(--text-2);font-style:italic;text-align:center;margin-bottom:16px;">${eh(p.subtitle)}</p>`;
            html += renderPassageContent(p.content);
        });

        if (secNum > 1) {
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

// ─── RENDER QUESTIONS ────────────────────────────────────────────────────────
function renderQuestions() {
    const container = document.getElementById('questionPanel');
    // Clear chỉ qScroll, giữ lại notebar
    const qScroll = document.getElementById('qScroll');
    qScroll.innerHTML = '';

    (examData.sections || []).forEach(sec => {
        const secNum = sec.sectionNumber;
        if (examSection !== 'full' && String(secNum) !== examSection) return;

        const wrap = document.createElement('div');
        wrap.dataset.section = secNum;

        (sec.groups || []).forEach(g => {
            wrap.innerHTML += renderGroup(g);
        });

        qScroll.appendChild(wrap);
    });
}

function renderGroup(g) {
    const display = g.displayType || '';
    let html = `<div style="height:8px;"></div>
      <div class="qsh">
        <div class="qsh-title">${eh(g.groupTitle || '')}</div>
        <div class="qsh-inst">${eh(g.instruction || '')}</div>
      </div>`;

    switch (display) {
        case 'TRUE_FALSE_NG':
        case 'MULTIPLE_CHOICE':
            (g.questions || []).forEach(q => { html += renderQItem(q); });
            break;

        case 'MATCHING':
        case 'MATCHING_HEADINGS': {
            // Instruction đã có heading list, render như select
            (g.questions || []).forEach(q => {
                html += `<div id="qi${q.questionNumber}" class="qi" data-q="${q.questionNumber}">
                  <div class="qi-head">
                    <span class="qbadge">${q.questionNumber}</span>
                    <span class="qtext">${eh(q.questionText || '')}</span>
                  </div>
                  <div class="qinp-wrap">
                    <select class="qinp" onchange="pa(${q.questionNumber},this.value)">
                      <option value="">-- ${display === 'MATCHING_HEADINGS' ? 'Heading' : 'Group'} --</option>
                      ${renderMatchOptions(g, display)}
                    </select>
                  </div>
                </div>`;
            });
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
                (g.questions || []).forEach(q => { html += renderFillLine(q); });
                html += `</div>`;
            }
            break;
        }

        case 'TABLE_COMPLETION': {
            html += renderTableCompletion(g);
            break;
        }

        case 'SUMMARY_COMPLETION': {
            html += renderSummaryCompletion(g);
            break;
        }

        default:
            // Fallback: hiển thị như fill block
            (g.questions || []).forEach(q => { html += renderFillLine(q); });
    }

    return html;
}

// ── QItem (MCQ / TF-NG) ───────────────────────────────────────────────────────
function renderQItem(q) {
    const qn = q.questionNumber;
    let html = `<div id="qi${qn}" class="qi" data-q="${qn}">
      <div class="qi-head">
        <span class="qbadge">${qn}</span>
        <span class="qtext">${eh(q.questionText || '')}</span>
      </div>
      <div class="ropts">`;
    (q.choices || []).forEach(c => {
        html += `<label class="ropt">
          <input type="radio" name="q${qn}" value="${eh(c.label)}" onchange="pa(${qn},'${eh(c.label)}')">
          <span class="rcircle"></span>
          <span class="rtext">${eh(c.label)}. ${eh(c.text)}</span>
        </label>`;
    });
    html += `</div></div>`;
    return html;
}

// ── Fill line ─────────────────────────────────────────────────────────────────
function renderFillLine(q) {
    const qn  = q.questionNumber;
    const tpl = q.lineTemplate || '';
    const w   = q.inputWidth   || 100;

    // Thay ___ trong template bằng badge + input
    const inputHtml = `<span id="b${qn}" class="fb">${qn}</span> <input class="finp" id="q${qn}" placeholder="……" style="width:${w}px;" oninput="pa(${qn},this.value)">`;
    const line = tpl.replace('___', inputHtml);
    return `<div class="fill-line">${line}</div>`;
}

// ── Matching options ──────────────────────────────────────────────────────────
function renderMatchOptions(g, display) {
    if (display === 'MATCHING_HEADINGS' && g.headingList) {
        return g.headingList.map(h =>
            `<option value="${eh(h.label)}">${eh(h.label)}</option>`
        ).join('');
    }
    if (g.matchOptions) {
        return g.matchOptions.map(o =>
            `<option value="${eh(o)}">${eh(o)}</option>`
        ).join('');
    }
    return ['A','B','C','D','E','F'].map(o => `<option value="${o}">${o}</option>`).join('');
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

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer() {
    timerInt = setInterval(() => {
        timeLeft--;
        const h = Math.floor(timeLeft/3600), m = Math.floor((timeLeft%3600)/60), s = timeLeft%60;
        document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);
        if (timeLeft <= 0) { clearInterval(timerInt); submitTest(); }
    }, 1000);
}
const pad = n => String(n).padStart(2,'0');

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const PRACTICE_PARTS = [
    { label:'Part 1', from:1,  to:14 },
    { label:'Part 2', from:15, to:27 },
    { label:'Part 3', from:28, to:40 },
];
let currentNavPart = 0;

function buildNav() {
    const w = document.getElementById('qnav');
    w.innerHTML = '';
    const parts = examSection === 'full'
        ? PRACTICE_PARTS
        : PRACTICE_PARTS.filter((p,i) => String(i+1) === examSection);

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
    switchPracticePart(0);
}

function switchPracticePart(idx) {
    if (document.body.classList.contains('real-mode')) return;
    const parts = examSection === 'full'
        ? PRACTICE_PARTS
        : PRACTICE_PARTS.filter((p,i) => String(i+1) === examSection);
    const part = parts[idx]; if (!part) return;
    const secNum = PRACTICE_PARTS.indexOf(part)+1;

    [1,2,3].forEach(s => {
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
        const parts = examSection==='full' ? PRACTICE_PARTS : PRACTICE_PARTS.filter((_,i)=>String(i+1)===examSection);
        const idx = parts.findIndex(p=>q>=p.from&&q<=p.to);
        if (idx>=0 && idx!==currentNavPart) switchPracticePart(idx);
    }
    setTimeout(()=>{
        const el=document.getElementById('qi'+q)||document.getElementById('q'+q);
        if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
        document.querySelectorAll('.qnb').forEach(b=>b.classList.remove('cur'));
        const nb=document.getElementById('nb'+q);
        if(nb&&!nb.classList.contains('done')) nb.classList.add('cur');
    },50);
}

// ─── ANSWER ───────────────────────────────────────────────────────────────────
function pa(q, v) {
    ans[q] = v;
    const el = document.getElementById('qi'+q);
    if (el) { el.classList.toggle('done',!!v); const b=el.querySelector('.qbadge'); if(b) b.style.background=v?'var(--success)':'var(--primary)'; }
    const fb = document.getElementById('b'+q);
    if (fb) fb.classList.toggle('done',!!v);
    const nb = document.getElementById('nb'+q);
    if (nb) { nb.classList.toggle('done',!!v); if(v) nb.classList.remove('cur'); }
    updateRealCounter();
}

// ─── REAL MODE ────────────────────────────────────────────────────────────────
const PART_CFG = {
    1:{from:1, to:14, sub:'Read the text and answer questions 1–14'},
    2:{from:15,to:27, sub:'Read the text and answer questions 15–27'},
    3:{from:28,to:40, sub:'Read the text and answer questions 28–40'},
};
let currentRealPart = 1, currentRealQ = 1;
const bookmarked = new Set();

function partOfQ(q) { if(q>=28)return 3; if(q>=15)return 2; return 1; }

function initRealMode() {
    currentRealPart = examSection==='full' ? 1 : parseInt(examSection);
    currentRealQ    = cfg.from;
    const isSingle  = examSection !== 'full';

    [1,2,3].forEach(p => {
        const show = examSection==='full' || examSection===String(p);
        const el   = document.getElementById('rbp'+p);
        if (el) {
            el.style.display = show ? '' : 'none';
            if (show && isSingle) {
                el.style.cursor = 'default'; el.onclick = null; el.style.pointerEvents = 'none';
            }
        }
    });

    [1,2,3].forEach(p => {
        if (examSection!=='full' && examSection!==String(p)) return;
        const r = PART_CFG[p];
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

    [1,2,3].forEach(p => {
        document.querySelectorAll(`#passagePanel [data-section="${p}"]`).forEach(el=>el.style.display='none');
        document.querySelectorAll(`.qpanel [data-section="${p}"]`).forEach(el=>el.style.display='none');
    });
    switchRealPart(currentRealPart);
    startTimer();
}

function switchRealPart(part) {
    if (examSection!=='full' && part!==parseInt(examSection)) return;
    currentRealPart = part;
    [1,2,3].forEach(p => {
        const show = p===part;
        document.querySelectorAll(`#passagePanel [data-section="${p}"]`).forEach(el=>el.style.display=show?'':'none');
        document.querySelectorAll(`.qpanel [data-section="${p}"]`).forEach(el=>el.style.display=show?'':'none');
        const rbp=document.getElementById('rbp'+p); if(rbp) rbp.classList.toggle('active',show);
    });
    document.getElementById('passageText').scrollTop=0;
    document.getElementById('qScroll').scrollTop=0;

    const r = PART_CFG[part];
    const lbl=document.getElementById('partInfoLabel'); if(lbl) lbl.textContent='Section '+part;
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
    [1,2,3].forEach(p=>{
        const r=PART_CFG[p];
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
        const meta = doHL(sel,'hl-y');
        if (meta) persistSelectionHighlight(meta, 'hl-y', null);
        sel.removeAllRanges();
    }
    else if(activeTool==='nt'){
        const meta = doHL(sel,'hl-n');
        const noteItem = addNote(txt, meta);
        if (meta) {
            persistSelectionHighlight(meta, 'hl-n', '').then(saved => {
                if (saved && noteItem) {
                    noteItem.highlightId = saved.id;
                    noteItem.remote = true;
                    renderNotes();
                }
            });
        }
        sel.removeAllRanges();
    }
    else if(activeTool==='vc'){
        const r=sel.getRangeAt(0).getBoundingClientRect();
        showVP(r.left+r.width/2,r.bottom+8,txt);
        sel.removeAllRanges();
    }
}
function doHL(sel,cls){
    const meta = getSelectionMeta(sel);
    try{const r=sel.getRangeAt(0),sp=document.createElement('span');sp.className=cls;r.surroundContents(sp);}
    catch(e){try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}}
    return meta;
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function addNote(txt, meta = null){
    const item = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        txt,
        note: '',
        highlightId: meta?.highlightId || null,
        remote: false
    };
    notes.push(item);
    renderNotes();
    if(!noteVisible) toggleNote();
    return item;
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
function saveNote(id,v){const n=notes.find(x=>x.id===id);if(n)n.note=v;}
async function delNote(id){
    const target = notes.find(x => x.id === id);
    notes=notes.filter(x=>x.id!==id);
    renderNotes();

    if (target?.highlightId) {
        try {
            await deletePracticeHighlight(target.highlightId);
        } catch (e) {
            console.warn('Xoá highlight từ server thất bại:', e.message);
        }
    }
}
async function clearAllNotes(){
    if(!notes.length)return;
    if(confirm('Xoá tất cả ghi chú?')){
        const remoteIds = notes
            .filter(n => !!n.highlightId)
            .map(n => n.highlightId);

        notes=[];
        document.querySelectorAll('.hl-n').forEach(el=>{const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);});
        renderNotes();

        for (const highlightId of remoteIds) {
            try {
                await deletePracticeHighlight(highlightId);
            } catch (e) {
                console.warn('Xoá highlight note thất bại:', highlightId, e.message);
            }
        }
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

function saveVW() {
    const groupSelect = document.getElementById('vocabGroupSelect');
    const group = groupSelect ? groupSelect.value : 'IELTS Reading';
    
    if (!selectedWord) return;
    if (!group && groupSelect) {
        alert('Vui lòng chọn hoặc tạo nhóm từ!');
        return;
    }

    const data = getVocabData();
    const exists = data.find(v => v.word.toLowerCase() === selectedWord.toLowerCase() && v.group === group);
    if (exists) {
        alert(`Từ "${selectedWord}" đã có trong nhóm "${group}"!`);
        closeVP();
        return;
    }

    data.push({
        word: selectedWord,
        group: group,
        addedAt: new Date().toISOString(),
        source: 'reading'
    });
    
    saveVocabData(data);
    recordVocabActivity();
    highlightWordInPassage(selectedWord);
    
    alert(`Đã lưu từ vựng: "${selectedWord}" vào nhóm "${group}"`);
    closeVP();
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

function restoreHighlights() {
    const data = getVocabData();
    const words = [...new Set(data.map(v => v.word))];
    words.forEach(word => highlightWordInPassage(word));
}

async function persistSelectionHighlight(meta, color, note) {
    if (!attemptId || !meta || !meta.passageId) return null;
    try {
        const res = await createPracticeHighlight(attemptId, {
            passageId: meta.passageId,
            startOffset: meta.startOffset,
            endOffset: meta.endOffset,
            color,
            note
        });
        return res?.data || res || null;
    } catch (e) {
        console.warn('Lưu highlight lên server thất bại:', e.message);
        return null;
    }
}

async function restoreServerHighlightsAndNotes() {
    if (!attemptId) return;
    try {
        const res = await getPracticeHighlights(attemptId);
        const highlights = res?.data || res || [];
        if (!Array.isArray(highlights) || highlights.length === 0) return;

        const restoredNotes = [];
        highlights.forEach(h => {
            const root = getPassageRootByPassageId(h.passageId);
            if (!root) return;

            const cls = h.color === 'hl-n' ? 'hl-n' : 'hl-y';
            applyHighlightByOffset(root, h.startOffset, h.endOffset, cls);

            if (cls === 'hl-n') {
                const txt = getTextByOffsets(root, h.startOffset, h.endOffset);
                restoredNotes.push({
                    id: h.id,
                    txt: txt || 'Selected text',
                    note: h.note || '',
                    highlightId: h.id,
                    remote: true
                });
            }
        });

        if (restoredNotes.length) {
            notes = [...restoredNotes, ...notes];
            renderNotes();
        }
    } catch (e) {
        console.warn('Không thể khôi phục highlight/note từ server:', e.message);
    }
}

function getSelectionMeta(sel) {
    try {
        const r = sel.getRangeAt(0);
        const sectionRoot = getClosestSectionRoot(r.commonAncestorContainer);
        if (!sectionRoot) return null;

        const sectionNum = parseInt(sectionRoot.dataset.section || '0', 10);
        const passageId = getPassageIdBySection(sectionNum);
        if (!passageId) return null;

        const startOffset = getTextOffset(sectionRoot, r.startContainer, r.startOffset);
        const endOffset = getTextOffset(sectionRoot, r.endContainer, r.endOffset);
        if (startOffset == null || endOffset == null || endOffset <= startOffset) return null;

        return { passageId, startOffset, endOffset };
    } catch (e) {
        return null;
    }
}

function getPassageIdBySection(sectionNum) {
    const sec = (examData?.sections || []).find(s => Number(s.sectionNumber) === Number(sectionNum));
    if (!sec || !sec.passages || sec.passages.length === 0) return null;
    return sec.passages[0].id || null;
}

function getSectionByPassageId(passageId) {
    for (const sec of (examData?.sections || [])) {
        const hasPassage = (sec.passages || []).some(p => Number(p.id) === Number(passageId));
        if (hasPassage) return sec;
    }
    return null;
}

function getPassageRootByPassageId(passageId) {
    const sec = getSectionByPassageId(passageId);
    if (!sec) return null;
    return document.querySelector(`#passageText [data-section="${sec.sectionNumber}"]`);
}

function getClosestSectionRoot(node) {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return el ? el.closest('#passageText [data-section]') : null;
}

function getTextOffset(root, node, nodeOffset) {
    const range = document.createRange();
    range.setStart(root, 0);
    range.setEnd(node, nodeOffset);
    return range.toString().length;
}

function getTextByOffsets(root, startOffset, endOffset) {
    const txt = root?.textContent || '';
    if (startOffset < 0 || endOffset <= startOffset || endOffset > txt.length) return '';
    return txt.slice(startOffset, endOffset).trim();
}

function applyHighlightByOffset(root, startOffset, endOffset, cls) {
    const startPos = findTextNodeAtOffset(root, startOffset);
    const endPos = findTextNodeAtOffset(root, endOffset);
    if (!startPos || !endPos) return;

    try {
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);

        const span = document.createElement('span');
        span.className = cls;
        range.surroundContents(span);
    } catch (e) {
        // Bỏ qua nếu range vướng node phức tạp/chồng lấp
    }
}

function findTextNodeAtOffset(root, targetOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let count = 0;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nextCount = count + node.textContent.length;
        if (targetOffset <= nextCount) {
            return { node, offset: Math.max(0, targetOffset - count) };
        }
        count = nextCount;
    }
    return null;
}

document.addEventListener('mousedown',e=>{
    const p=document.getElementById('vpop');
    if(p&&p.classList.contains('on')&&!p.contains(e.target))closeVP();
});

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
function submitTest(){
    const c=Object.values(ans).filter(a=>a&&a.trim()).length;
    document.getElementById('mA').textContent=c;
    document.getElementById('mU').textContent=TOTAL-c;
    document.getElementById('mT').textContent=document.getElementById('timer').textContent;
    new bootstrap.Modal(document.getElementById('subModal')).show();
}

async function confirmSub(){
    clearInterval(timerInt);
    if (autoSaveInt) clearInterval(autoSaveInt);
    
    bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
    
    if (!attemptId) {
        alert('Lỗi: Không tìm thấy phiên thi. Vui lòng tải lại trang.');
        return;
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
        const res = await submitAttemptAnswers(attemptId, answersPayload);
        const result = res.data || res;
        
        // Lưu kết quả và chuyển trang
        localStorage.setItem('lastResultAttemptId', attemptId);
        localStorage.removeItem('currentAttemptId');

        const bandScore = result.bandScore || '?';
        const totalCorrect = result.totalCorrect || '?';
        
        alert(`Nộp bài thành công!\nBand Score: ${bandScore}\nĐúng: ${totalCorrect}/${TOTAL} câu`);
        
        // Redirect tới trang kết quả (nếu có)
        // window.location.href = `result.html?attemptId=${attemptId}`;
    } catch (err) {
        console.error('Lỗi nộp bài:', err);
        alert('Lỗi khi nộp bài! ' + err.message);
    }
}

// ─── AUTO SAVE PROGRESS ──────────────────────────────────────────────────────
function startAutoSave() {
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
            const toolW =document.querySelector('.tools')?.offsetWidth||0;
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
