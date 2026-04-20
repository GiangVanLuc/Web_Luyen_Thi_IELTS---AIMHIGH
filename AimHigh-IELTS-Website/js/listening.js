// ===== LISTENING.JS — Render động từ API =====
// Fetch /api/exams/{id} rồi build questions vào DOM.
// Tích hợp API Backend: startAttempt, autoSave, submit.

// ─── CONFIG từ URL/localStorage ───────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const examSection = urlParams.get('section') || localStorage.getItem('currentExamSection') || 'full';
const examId = parseInt(urlParams.get('examId') || localStorage.getItem('currentExamId') || '1', 10);
const examModeFromContext = urlParams.get('mode') || localStorage.getItem('currentExamMode') || 'practice';
const examTitleFromContext = urlParams.get('title') || localStorage.getItem('currentExamTitle') || '';

const SEC_CFG = {
    1:{from:1, to:10, label:'Section 1', time:8*60},
    2:{from:11,to:20, label:'Section 2', time:8*60},
    3:{from:21,to:30, label:'Section 3', time:8*60},
    4:{from:31,to:40, label:'Section 4', time:8*60},
};
const isSingle  = examSection !== 'full';
const singleSec = isSingle ? parseInt(examSection) : null;

let examData = null;
let TOTAL    = isSingle ? 10 : 40;
let timeLeft = isSingle ? SEC_CFG[singleSec].time : 30*60;

let ans = {}, timerInt, activeTool = null, noteVisible = false, notes = [];
let attemptId = null;  // ID phiên thi từ Backend
let autoSaveInt = null; // Interval auto-save
const ATTEMPT_META_KEY = 'currentAttemptMeta';
let questionIdMap = new Map();
let questionNumberMap = new Map();

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

    return Number(isSingle ? SEC_CFG[singleSec].from : 1);
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
        skill: 'LISTENING',
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
    if (!Number.isFinite(rawId) || rawId <= 0 || !rawMeta) return null;

    try {
        const meta = JSON.parse(rawMeta);
        const current = buildAttemptMeta();
        const isMatch =
            String(meta?.skill || '') === current.skill
            && Number(meta?.examId) === current.examId
            && String(meta?.mode || '') === current.mode
            && String(meta?.section || '') === current.section;
        if (isMatch) return rawId;
    } catch (_) {
        // Ignore parse errors and clear stale context below.
    }

    clearAttemptContext();
    return null;
}

function isRealMode() {
    return String(examModeFromContext || '').toLowerCase() === 'real';
}

// Audio
let audioElement = new Audio();
const SPEEDS=[0.75,1,1.25,1.5,2]; let speedIdx=1;
let audioTime = 0, audioPlaying = false;
let AUDIO_END = 1800;

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (examModeFromContext === 'real') {
        document.body.classList.add('real-mode');
    } else {
        document.body.classList.add('practice-mode');
    }
    updateAudioTotalTime();
    await loadExam();
});

async function loadExam() {
    try {
        // --- Gọi API Backend lấy đề thi ---
        const apiRes = await getExamData(examId);
        examData = apiRes.data || apiRes;
    } catch (err) {
        document.getElementById('qScroll').innerHTML =
            '<p style="padding:30px;color:#ef4444;">Không thể tải đề thi. Vui lòng thử lại.</p>';
        console.error('Lỗi tải đề thi:', err);
        return;
    }

    // --- Khởi tạo phiên thi (Attempt) ---
    try {
        const examMode = examModeFromContext;
        const attemptRes = await startAttempt(examId, examMode);
        const attemptData = attemptRes.data || attemptRes;
        attemptId = attemptData.id;
        saveAttemptContext(attemptId);
        console.log('Phiên thi Listening đã khởi tạo. AttemptId:', attemptId);
    } catch (err) {
        console.warn('Không thể tạo phiên thi:', err.message);
        attemptId = getReusableAttemptId();
    }

    TOTAL    = isSingle ? (SEC_CFG[singleSec].to - SEC_CFG[singleSec].from + 1) : 40;
    timeLeft = isRealMode() ? (isSingle ? SEC_CFG[singleSec].time : 30*60) : 0;

    renderQuestions();

    // Update audio source nếu có
    updateAudioSrc();

    // UI
    const title = examTitleFromContext ||
        (isSingle ? `${examData.exam?.title} – ${SEC_CFG[singleSec].label}` : (examData.exam?.title || 'Listening Test'));
    document.getElementById('examTitle').textContent = title;

    const minStr = isSingle ? '8 phút' : '30 phút';
    const snInfo = document.querySelector('.sn-info');
    if (snInfo) snInfo.innerHTML = `Đề: <strong>${title}</strong> &nbsp;|&nbsp; ${TOTAL} câu &nbsp;|&nbsp; ${minStr}`;

    const h=Math.floor(timeLeft/3600), m=Math.floor((timeLeft%3600)/60), s=timeLeft%60;
    document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);

    const mTotalEl=document.getElementById('mTotal'); if(mTotalEl) mTotalEl.textContent=TOTAL;
    const mUEl=document.getElementById('mU');         if(mUEl) mUEl.textContent=TOTAL;

    const examMode = examModeFromContext;
    if (examMode === 'real') {
        initRealMode();
    } else {
        buildNav();
        startTimer();
    }

    // Auto-save progress
    startAutoSave();

    // Khôi phục tiến độ nếu user F5
    await restoreProgress();

    // Khôi phục ghi chú đã lưu của attempt
    await loadNotesFromBackend();

    document.getElementById('qScroll').addEventListener('mouseup', onSel);
    document.addEventListener('keydown', onKey);
}

// ─── RENDER QUESTIONS ────────────────────────────────────────────────────────
function renderQuestions() {
    const qScroll = document.getElementById('qScroll');
    qScroll.innerHTML = '';
    questionIdMap = new Map();
    questionNumberMap = new Map();

    (examData.sections || []).forEach(sec => {
        const sn = sec.sectionNumber;
        if (isSingle && sn !== singleSec) return;

        const block = document.createElement('div');
        block.className = 'sec-block' + (sn === (isSingle?singleSec:1) ? ' active' : '');
        block.id = 'sec'+sn;

        (sec.groups || []).forEach(g => {
            block.innerHTML += renderGroup(g, sec);
        });

        qScroll.appendChild(block);
    });
}

function renderGroup(g, sec) {
        const display = normalizeDisplayType(g.displayType || g.type || '');
    let html = `<div class="qsh">
            <div class="qsh-title">${eh(g.groupTitle || g.title || '')}</div>
      <div class="qsh-inst">${eh(g.instruction||'')}</div>
    </div>`;

    const sourceQuestions = (g.questions || []).length
        ? (g.questions || [])
        : buildFallbackQuestions(g, sec, display);

    switch(display) {
        case 'TRUE_FALSE_NG':
        case 'MULTIPLE_CHOICE':
            sourceQuestions.forEach(q=>{ html+=renderQItem(q); });
            break;

        case 'FILL_BLOCK':
            html += `<div class="fill-block">`;
            if(g.blockTitle) html += `<div class="fill-title">${eh(g.blockTitle)}</div>`;
            sourceQuestions.forEach(q=>{ html+=renderFillLine(q); });
            html += `</div>`;
            break;

        default:
            sourceQuestions.forEach(q=>{ html+=renderFillLine(q); });
    }
    return html;
}

function normalizeDisplayType(type) {
    const t = String(type || '').toUpperCase();
    if (t === 'TRUE_FALSE_NOT_GIVEN') return 'TRUE_FALSE_NG';
    if (t === 'FILL_IN_BLANK' || t === 'FILL_BLANK' || t === 'SENTENCE_COMPLETION') return 'FILL_BLOCK';
    return t;
}

function inferGroupRange(g, sec) {
    let from = parseInt(g?.questionFrom || 0, 10);
    let to = parseInt(g?.questionTo || 0, 10);
    if (from > 0 && to >= from) return { from, to };

    const title = String(g?.groupTitle || g?.title || '');
    const m = title.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (m) return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };

    from = parseInt(sec?.questionFrom || 1, 10);
    to = parseInt(sec?.questionTo || from, 10);
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
            list.push({ questionNumber: qn, questionText: `Question ${qn}`, lineTemplate: `[${qn}] ___` });
        }
    }
    return list;
}

function renderQItem(q) {
    rememberQuestionId(q);
    const qn=q.questionNumber;
    let html=`<div id="qi${qn}" class="qi" data-q="${qn}">
      <div class="qi-head"><span class="qbadge">${qn}</span><span class="qtext">${eh(q.questionText||'')}</span></div>
      <div class="ropts">`;
    (q.choices||[]).forEach(c=>{
        html+=`<label class="ropt">
          <input type="radio" name="q${qn}" value="${eh(c.label)}" onchange="pa(${qn},'${eh(c.label)}')">
          <span class="rcircle"></span>
          <span class="rtext">${eh(c.label)}. ${eh(c.text)}</span>
        </label>`;
    });
    html+=`</div></div>`;
    return html;
}

function renderFillLine(q) {
    rememberQuestionId(q);
    const qn=q.questionNumber, w=q.inputWidth||100;
    const tpl=q.lineTemplate||q.questionText||`Question ${qn}: ___`;
    const inputHtml=`<span id="b${qn}" class="fb">${qn}</span> <input class="finp" id="q${qn}" placeholder="……" style="width:${w}px;" oninput="pa(${qn},this.value)">`;
    return `<div class="fill-line">${tpl.replace('___',inputHtml)}</div>`;
}

// ─── AUDIO PLAYER ────────────────────────────────────────────────────────────
function updateAudioTotalTime() {
    if(audioElement.duration && !isNaN(audioElement.duration)) {
        AUDIO_END = Math.floor(audioElement.duration);
        const totEl=document.getElementById('totTime');
        if(totEl) totEl.textContent=Math.floor(AUDIO_END/60)+':'+pad(AUDIO_END%60);
    }
}
function updateAudioSrc() {
    const url = (examData.exam && examData.exam.audioUrl) ? examData.exam.audioUrl : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    audioElement.src = url;
    audioElement.addEventListener('timeupdate', () => {
        audioTime = Math.floor(audioElement.currentTime);
        updateAudioUI();
        if(!isSingle) syncSectionLabel();
    });
    audioElement.addEventListener('loadedmetadata', updateAudioTotalTime);
    audioElement.addEventListener('ended', () => {
        audioPlaying = false;
        document.getElementById('playIcon').className = 'bi bi-play-fill';
    });
}
function togglePlay(){
    audioPlaying=!audioPlaying;
    const icon=document.getElementById('playIcon');
    icon.className=audioPlaying?'bi bi-pause-fill':'bi bi-play-fill';
    if(audioPlaying) audioElement.play();
    else audioElement.pause();
}
function skipAudio(delta){
    audioElement.currentTime = Math.max(0, Math.min(audioElement.duration || AUDIO_END, audioElement.currentTime + delta));
}
function seekAudio(e){
    const bar=document.getElementById('progBar');
    const rect=bar.getBoundingClientRect();
    const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    if(audioElement.duration) audioElement.currentTime = pct * audioElement.duration;
}
function updateAudioUI(){
    const duration = audioElement.duration || AUDIO_END;
    const pct = duration ? (audioTime / duration) * 100 : 0;
    document.getElementById('progFill').style.width=pct+'%';
    document.getElementById('progDot').style.left=pct+'%';
    const m=Math.floor(audioTime/60),s=Math.floor(audioTime)%60;
    document.getElementById('curTime').textContent=m+':'+pad(s);
}
function syncSectionLabel(){
    const sec=Math.min(4,Math.floor(audioTime/450)+1);
    [1,2,3,4].forEach(s=>{const box=document.getElementById('secbox'+s);if(box)box.classList.toggle('secbox-playing',s===sec);});
}
function cycleSpeed(){
    speedIdx=(speedIdx+1)%SPEEDS.length;
    document.getElementById('speedBtn').textContent=SPEEDS[speedIdx]+'×';
    audioElement.playbackRate = SPEEDS[speedIdx];
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer(){
    timerInt=setInterval(()=>{
        if (isRealMode()) {
            timeLeft--;
        } else {
            timeLeft++;
        }
        const h=Math.floor(timeLeft/3600),m=Math.floor((timeLeft%3600)/60),s=timeLeft%60;
        document.getElementById('timer').textContent=pad(h)+':'+pad(m)+':'+pad(s);
        if(isRealMode() && timeLeft<=300) document.getElementById('timerPill').classList.add('timer-warn');
        if(isRealMode() && timeLeft<=0){clearInterval(timerInt);submitTest();}
    },1000);
}
const pad=n=>String(n).padStart(2,'0');

// ─── ANSWER ───────────────────────────────────────────────────────────────────
function pa(q,v){
    ans[q]=v;
    const el=document.getElementById('qi'+q);
    if(el){el.classList.toggle('done',!!v);const b=el.querySelector('.qbadge');if(b)b.style.background=v?'var(--success)':'var(--primary)';}
    const fb=document.getElementById('b'+q); if(fb)fb.classList.toggle('done',!!v);
    const nb=document.getElementById('nb'+q); if(nb){nb.classList.toggle('done',!!v);}
    if(document.body.classList.contains('real-mode')) updateRealBot();
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
let currentSec=isSingle?singleSec:1;

function buildNav(){
    const w=document.getElementById('qnav'); w.innerHTML='';
    const secList=isSingle?[singleSec]:[1,2,3,4];

    secList.forEach((sec,idx)=>{
        const r=SEC_CFG[sec];
        const box=document.createElement('div');
        box.className='secbox'+(idx===0?' secbox-active':'');
        box.id='secbox'+sec;
        if(!isSingle) box.onclick=()=>switchSection(sec);

        const lbl=document.createElement('span');
        lbl.className='secbox-lbl'; lbl.textContent=isSingle?r.label:'S'+sec;
        box.appendChild(lbl);

        for(let i=r.from;i<=r.to;i++){
            const b=document.createElement('button');
            b.className='qnb';b.id='nb'+i;b.textContent=i;
            b.onclick=(e)=>{e.stopPropagation();goQ(i);};
            box.appendChild(b);
        }
        w.appendChild(box);
    });

    const prev=document.getElementById('btnSecPrev');
    const next=document.getElementById('btnSecNext');
    if(isSingle){if(prev)prev.disabled=true;if(next)next.disabled=true;}
    else{updateSecArrows();}
    switchSection(currentSec);
}

function switchSection(sec){
    if(isSingle&&sec!==singleSec)return;
    currentSec=sec;
    [1,2,3,4].forEach(s=>{const el=document.getElementById('sec'+s);if(el)el.classList.toggle('active',s===sec);});
    const qs=document.getElementById('qScroll');if(qs)qs.scrollTop=0;
    [1,2,3,4].forEach(s=>{const box=document.getElementById('secbox'+s);if(box)box.classList.toggle('secbox-active',s===sec);});
    scrollToSecbox(sec); updateSecArrows();
}
function prevSection(){if(currentSec>1)switchSection(currentSec-1);}
function nextSection(){if(currentSec<4)switchSection(currentSec+1);}
function updateSecArrows(){
    const prev=document.getElementById('btnSecPrev'),next=document.getElementById('btnSecNext');
    if(isSingle){if(prev)prev.disabled=true;if(next)next.disabled=true;return;}
    if(prev)prev.disabled=currentSec<=1; if(next)next.disabled=currentSec>=4;
}
function scrollToSecbox(sec){
    const box=document.getElementById('secbox'+sec),nav=document.getElementById('qnav');
    if(!box||!nav)return;
    nav.scrollTo({left:box.offsetLeft-nav.offsetLeft-4,behavior:'smooth'});
}
function goQ(q){
    const sec=secOfQ(q);if(sec!==currentSec)switchSection(sec);
    setTimeout(()=>{
        const el=document.getElementById('qi'+q)||document.getElementById('q'+q);
        if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
    },50);
    document.querySelectorAll('.qnb').forEach(b=>b.classList.remove('cur'));
    const nb=document.getElementById('nb'+q);if(nb)nb.classList.add('cur');
}
function secOfQ(q){if(q<=10)return 1;if(q<=20)return 2;if(q<=30)return 3;return 4;}

// ─── REAL MODE ────────────────────────────────────────────────────────────────
const REAL_SEC_CFG={
    1:{from:1, to:10,sub:'Questions 1–10 · Note Completion'},
    2:{from:11,to:20,sub:'Questions 11–20 · Multiple Choice & Sentence Completion'},
    3:{from:21,to:30,sub:'Questions 21–30 · Multiple Choice & Summary Completion'},
    4:{from:31,to:40,sub:'Questions 31–40 · Note Completion & Multiple Choice'},
};
let currentRealSec=1,currentRealQ=1;
const bookmarked=new Set();

function initRealMode(){
    document.body.classList.add('real-mode');
    const title=localStorage.getItem('currentExamTitle')||(examData?.exam?.title||'Listening Test');
    document.getElementById('confirmTitle').textContent=title;
    const secLabel=isSingle?`${SEC_CFG[singleSec].label} · ${TOTAL} câu · 8 phút`:'40 câu · 30 phút · 4 Sections';
    document.getElementById('confirmDesc').textContent=secLabel;
    document.getElementById('confirmOverlay').classList.remove('hidden');

    [1,2,3,4].forEach(s=>{
        const rbsEl=document.getElementById('rbs'+s);
        if(isSingle&&s!==singleSec){if(rbsEl)rbsEl.style.display='none';return;}
        if(isSingle&&rbsEl){rbsEl.style.cursor='default';rbsEl.style.pointerEvents='none';}
        const container=document.getElementById('rbsq'+s);if(!container)return;
        container.innerHTML='';
        const r=REAL_SEC_CFG[s];
        for(let i=r.from;i<=r.to;i++){
            const b=document.createElement('button');
            b.className='rbot-qn';b.id='rbn'+i;b.textContent=i;
            b.onclick=(e)=>{e.stopPropagation();focusRealQ(i);};
            container.appendChild(b);
        }
        if(isSingle&&rbsEl)rbsEl.style.pointerEvents='';
        const cnt=document.getElementById('rbsc'+s);if(cnt)cnt.textContent='0 of '+(r.to-r.from+1);
    });

    // Bookmark icons
    document.querySelectorAll('.qi').forEach(qi=>{
        const q=qi.dataset.q;if(!q||qi.querySelector('.qi-bm'))return;
        const btn=document.createElement('button');
        btn.className='qi-bm';btn.dataset.q=q;btn.innerHTML='<i class="bi bi-bookmark"></i>';
        btn.onclick=(e)=>{e.stopPropagation();toggleBookmark(parseInt(q));};
        const head=qi.querySelector('.qi-head');if(head)head.appendChild(btn);else qi.appendChild(btn);
    });

    currentRealSec=isSingle?singleSec:1;
    currentRealQ=isSingle?SEC_CFG[singleSec].from:1;
}

function startRealTest(){
    document.getElementById('confirmOverlay').classList.add('hidden');
    switchRealSec(currentRealSec);
    updateRealArrows();
    startTimer();
}
function switchRealSec(sec){
    if(isSingle&&sec!==singleSec)return;
    currentRealSec=sec;
    [1,2,3,4].forEach(s=>{const el=document.getElementById('sec'+s);if(el)el.classList.toggle('active',s===sec);});
    document.getElementById('qScroll').scrollTop=0;
    const r=REAL_SEC_CFG[sec];
    const lbl=document.getElementById('partInfoLabel'),sub=document.getElementById('partInfoSub');
    if(lbl)lbl.textContent=isSingle?SEC_CFG[singleSec].label:'Section '+sec;
    if(sub)sub.textContent=r.sub;
    [1,2,3,4].forEach(s=>{const el=document.getElementById('rbs'+s);if(el)el.classList.toggle('active',s===sec);});
    updateRealBot();
}
function realPrevQ(){const qFrom=isSingle?SEC_CFG[singleSec].from:1;if(currentRealQ>qFrom)focusRealQ(currentRealQ-1);}
function realNextQ(){const qTo=isSingle?SEC_CFG[singleSec].to:40;if(currentRealQ<qTo)focusRealQ(currentRealQ+1);}
function updateRealArrows(){
    const qFrom=isSingle?SEC_CFG[singleSec].from:1,qTo=isSingle?SEC_CFG[singleSec].to:40;
    const prev=document.getElementById('rbPrev'),next=document.getElementById('rbNext');
    if(isSingle){if(prev)prev.disabled=true;if(next)next.disabled=true;return;}
    if(prev)prev.disabled=currentRealQ<=qFrom;if(next)next.disabled=currentRealQ>=qTo;
}
function focusRealQ(q){
    const sec=[1,2,3,4].find(s=>q>=REAL_SEC_CFG[s].from&&q<=REAL_SEC_CFG[s].to)||1;
    if(sec!==currentRealSec)switchRealSec(sec);
    currentRealQ=q;
    setTimeout(()=>{const el=document.getElementById('qi'+q);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});updateRealBot();updateRealArrows();},50);
}
function toggleBookmark(q){
    if(bookmarked.has(q))bookmarked.delete(q);else bookmarked.add(q);
    const active=bookmarked.has(q);
    const qi=document.getElementById('qi'+q);
    if(qi){qi.classList.toggle('bookmarked',active);const bm=qi.querySelector('.qi-bm');if(bm){bm.classList.toggle('active',active);bm.innerHTML=active?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>';}}
    const rbn=document.getElementById('rbn'+q);if(rbn)rbn.classList.toggle('bookmarked',active);
    updateRealBot();
}
function updateRealBot(){
    document.querySelectorAll('.rbot-qn').forEach(b=>{
        const q=parseInt(b.textContent);
        b.classList.toggle('current',q===currentRealQ);
        b.classList.toggle('bookmarked',bookmarked.has(q));
        b.classList.toggle('answered',!!(ans[q]&&ans[q].trim())&&!bookmarked.has(q));
    });
    [1,2,3,4].forEach(s=>{
        const r=REAL_SEC_CFG[s];
        const done=Object.entries(ans).filter(([k,v])=>+k>=r.from&&+k<=r.to&&v&&v.trim()).length;
        const cnt=document.getElementById('rbsc'+s);if(cnt)cnt.textContent=done+' of '+(r.to-r.from+1);
    });
}

// ─── TOOLS ────────────────────────────────────────────────────────────────────
function setTool(t){
    activeTool=activeTool===t?null:t;
    document.querySelectorAll('.tool').forEach(b=>b.classList.remove('on'));
    if(activeTool){const m={hl:'tHL',nt:'tNT'};document.getElementById(m[activeTool])?.classList.add('on');}
}
function onKey(e){
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    if(e.key==='h'||e.key==='H')setTool('hl');
    if(e.key==='n'||e.key==='N')setTool('nt');
}
function onSel(){
    const sel=window.getSelection();if(!sel||sel.isCollapsed)return;
    const txt=sel.toString().trim();if(!txt)return;
    if(activeTool==='hl'){doHL(sel,'hl-y');sel.removeAllRanges();}
    else if(activeTool==='nt'){
        const qFromSelection = getQuestionNumberFromSelection(sel) || getCurrentQuestionNumber();
        doHL(sel,'hl-n');
        void addNote(txt, qFromSelection);
        sel.removeAllRanges();
    }
}
function doHL(sel,cls){
    try{const r=sel.getRangeAt(0),sp=document.createElement('span');sp.className=cls;r.surroundContents(sp);}
    catch(e){try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}}
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
    if(!noteVisible)toggleNote();

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
      <div class="nb-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <div class="nb-sel">${eh(n.txt.substring(0,55))}${n.txt.length>55?'…':''}</div>
          <button class="nb-del" onclick="delNote(${n.id})"><i class="bi bi-trash3"></i></button>
        </div>
        <textarea class="nb-ta" rows="2" placeholder="Nhập ghi chú…"
          onblur="saveNote(${n.id},this.value)">${eh(n.note)}</textarea>
      </div>`).join('');
}
async function saveNote(id,v){
    const n=notes.find(x=>String(x.id)===String(id));
    if(!n)return;
    n.note=String(v||'');
    if(!n.isRemote || !attemptId || !n.questionId)return;
    try {
        await updateNote(n.id, encodeNoteContent(n.txt, n.note));
    } catch (error) {
        console.warn('Không thể cập nhật note:', error?.message || error);
    }
}
async function delNote(id){
    const index=notes.findIndex(x=>String(x.id)===String(id));
    if(index===-1)return;
    const noteItem=notes[index];
    notes.splice(index,1);
    renderNotes();
    if(!noteItem.isRemote)return;
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
        await Promise.allSettled(remoteIds.map((id)=>deleteNote(id)));
    }
}
function toggleNote(){
    noteVisible=!noteVisible;
    document.getElementById('notebar').classList.toggle('off',!noteVisible);
    document.getElementById('btnSubNote').textContent=noteVisible?'Ẩn note':'Hiện note';
}

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
    clearInterval(audioInterval);
    if (autoSaveInt) clearInterval(autoSaveInt);

    bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();

    if (!attemptId) {
        try {
            const retryAttempt = await startAttempt(examId, examModeFromContext);
            const retryData = retryAttempt.data || retryAttempt;
            attemptId = retryData.id;
            if (attemptId) {
                saveAttemptContext(attemptId);
            }
        } catch (retryErr) {
            alert('Lỗi: Không tìm thấy phiên thi. Vui lòng tải lại trang.\nChi tiết: ' + (retryErr?.message || 'Unknown'));
            return;
        }
    }

    const fromQ = isSingle ? SEC_CFG[singleSec].from : 1;
    const toQ = isSingle ? SEC_CFG[singleSec].to : 40;
    const answersPayload = [];

    for (let q = fromQ; q <= toQ; q++) {
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
    if (!attemptId) return;

    autoSaveInt = setInterval(async () => {
        const keys = Object.keys(ans);
        if (keys.length === 0) return;

        for (const qNum of keys) {
            const val = (ans[qNum] || '').trim();
            if (!val) continue;
            try {
                await saveAttemptProgress(attemptId, parseInt(qNum, 10), val);
            } catch (e) {
                console.warn('Auto-save lỗi câu', qNum, e.message);
            }
        }
    }, 60000);
}

// ─── RESTORE PROGRESS (khi F5) ──────────────────────────────────────────────
async function restoreProgress() {
    if (!attemptId) return;
    try {
        const res = await getAttemptProgress(attemptId);
        const progressList = res.data || res || [];

        if (!Array.isArray(progressList) || progressList.length === 0) return;

        progressList.forEach(item => {
            const qNum = item.questionId || item.questionNumber;
            const aText = item.answerText;
            if (!qNum || !aText) return;

            ans[qNum] = aText;
            const input = document.getElementById('q' + qNum);
            if (input) input.value = aText;
            pa(qNum, aText);

            const escaped = (window.CSS && typeof window.CSS.escape === 'function')
                ? window.CSS.escape(aText)
                : String(aText).replace(/(["\\])/g, '\\$1');
            const radio = document.querySelector(`input[name="q${qNum}"][value="${escaped}"]`);
            if (radio) radio.checked = true;
        });
    } catch (e) {
        console.warn('Không thể khôi phục tiến độ:', e.message);
    }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const eh=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
