// ===== READING.JS — Render động từ API =====
// Fetch /api/exam/reading/{id} rồi build passage + questions vào DOM.
// Giữ nguyên 100% logic: timer, tools, notes, vocab popup, real/practice mode, resize.

// ─── CONFIG từ localStorage ───────────────────────────────────────────────────
const examSection = localStorage.getItem('currentExamSection') || 'full';
const examId = parseInt(localStorage.getItem('currentExamId') || '101', 10);

// Section config (sẽ được điền sau khi fetch)
let cfg = { total: 40, time: 60*60, from: 1, to: 40, label: '', info: '' };
const SEC_TIME = { full: 60*60, '1': 20*60, '2': 20*60, '3': 20*60 };

let examData = null;   // raw JSON từ API
let KEY      = {};     // { questionNumber: correctAnswer }
let TOTAL    = 0;

let ans = {}, timerInt, activeTool = null, noteVisible = false, notes = [];
let timeLeft = 0;

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadExam();
});

async function loadExam() {
    try {
        const res = await fetch(`data/exam-reading-${examId}.json`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        examData = await res.json();
    } catch (err) {
        document.getElementById('passageText').innerHTML =
            '<p style="padding:30px;color:#ef4444;">Không thể tải đề thi. Vui lòng thử lại.</p>';
        console.error(err);
        return;
    }

    // ── Build config theo section được chọn ──────────────────────────────────
    buildConfig();

    // ── Build answer KEY từ JSON ──────────────────────────────────────────────
    buildKey();

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

    document.getElementById('passageText').addEventListener('mouseup', onSel);
    document.addEventListener('keydown', onKey);
    syncSubnav();
    initResizeHandle();
};

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

// ─── ANSWER KEY ───────────────────────────────────────────────────────────────
function buildKey() {
    KEY = {};
    (examData.sections || []).forEach(sec => {
        (sec.groups || []).forEach(g => {
            // Normal questions array
            const qs = g.questions || [];
            qs.forEach(q => {
                if (q.questionNumber >= cfg.from && q.questionNumber <= cfg.to)
                    KEY[q.questionNumber] = q.correctAnswer;
            });
            // Sub-blocks (e.g. lifting equipment note completion with subBlocks)
            (g.subBlocks || []).forEach(sb => {
                (sb.questions || []).forEach(q => {
                    if (q.questionNumber >= cfg.from && q.questionNumber <= cfg.to)
                        KEY[q.questionNumber] = q.correctAnswer;
                });
            });
            // Table rows
            (g.tableRows || []).forEach(row => {
                (row.cells || []).forEach(cell => {
                    if (cell.questionNumber && cell.questionNumber >= cfg.from && cell.questionNumber <= cfg.to)
                        KEY[cell.questionNumber] = cell.correctAnswer;
                });
            });
            // Summary questions
            (g.questions || []).forEach(q => {
                if (q.questionNumber >= cfg.from && q.questionNumber <= cfg.to)
                    KEY[q.questionNumber] = q.correctAnswer;
            });
        });
    });
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
 *  - Đoạn bắt đầu bằng "A. ", "B. "... → dùng .plbl
 *  - Đoạn thường → <p class="ni">
 *  - Bullet bắt đầu bằng "• " → <p class="ni">
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
    if(activeTool==='hl'){doHL(sel,'hl-y');sel.removeAllRanges();}
    else if(activeTool==='nt'){doHL(sel,'hl-n');addNote(txt);sel.removeAllRanges();}
    else if(activeTool==='vc'){const r=sel.getRangeAt(0).getBoundingClientRect();showVP(r.left+r.width/2,r.bottom+8,txt);sel.removeAllRanges();}
}
function doHL(sel,cls){
    try{const r=sel.getRangeAt(0),sp=document.createElement('span');sp.className=cls;r.surroundContents(sp);}
    catch(e){try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}}
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function addNote(txt){
    notes.push({id:Date.now(),txt,note:''});
    renderNotes();
    if(!noteVisible) toggleNote();
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
function delNote(id){notes=notes.filter(x=>x.id!==id);renderNotes();}
function clearAllNotes(){
    if(!notes.length)return;
    if(confirm('Xoá tất cả ghi chú?')){
        notes=[];
        document.querySelectorAll('.hl-n').forEach(el=>{const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);});
        renderNotes();
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

// ─── VOCAB POPUP ─────────────────────────────────────────────────────────────
function showVP(x,y,word){
    const p=document.getElementById('vpop');
    document.getElementById('vpW').textContent=word;
    ['vpR','vpM','vpE','vpT'].forEach(id=>{ const el=document.getElementById(id);if(el)el.textContent='None'; });
    let px=x-148,py=y+6;
    if(px<6)px=6;
    if(px+296>window.innerWidth)px=window.innerWidth-302;
    if(py+250>window.innerHeight)py=y-256;
    p.style.left=px+'px'; p.style.top=py+'px'; p.classList.add('on');
}
function closeVP(){document.getElementById('vpop').classList.remove('on');}
function saveVW(){alert(`Đã lưu từ vựng: "${document.getElementById('vpW').textContent}"`);closeVP();}
function copyVW(){navigator.clipboard?.writeText(document.getElementById('vpW').textContent);closeVP();}
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
function confirmSub(){
    clearInterval(timerInt);
    let ok=0;
    for(const[q,a] of Object.entries(KEY)){
        if((ans[q]||'').trim().toLowerCase()===String(a).toLowerCase()) ok++;
    }
    bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
    setTimeout(()=>alert(`Nộp bài thành công!\nĐúng: ${ok}/${TOTAL} câu`),300);
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