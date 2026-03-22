// ===== LISTENING TEST JAVASCRIPT (Legacy — kept for reference) =====
/* NOTE: The active code for listening.html is below (AimHigh section).
   This legacy block is preserved for reference only.

// ===== LISTENING TEST JAVASCRIPT =====

// Timer
let timeLeft = 30 * 60; // 30 minutes in seconds
let timerInterval;

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;
    
    // Change color when time is low
    if (timeLeft <= 300) { // 5 minutes
        document.querySelector('.test-timer').style.background = 'rgba(239, 68, 68, 0.2)';
    }
}

// Audio Player
let isPlaying = false;
let currentTime = 0;
const duration = 225; // 3:45 in seconds

function togglePlay() {
    const playBtn = document.getElementById('playBtn');
    const playIcon = playBtn.querySelector('i');
    
    if (isPlaying) {
        isPlaying = false;
        playIcon.classList.remove('bi-pause-fill');
        playIcon.classList.add('bi-play-fill');
        playBtn.classList.remove('playing');
    } else {
        isPlaying = true;
        playIcon.classList.remove('bi-play-fill');
        playIcon.classList.add('bi-pause-fill');
        playBtn.classList.add('playing');
        playAudio();
    }
}

function playAudio() {
    if (!isPlaying) return;
    
    currentTime++;
    updateAudioProgress();
    
    if (currentTime >= duration) {
        isPlaying = false;
        document.getElementById('playBtn').querySelector('i').classList.remove('bi-pause-fill');
        document.getElementById('playBtn').querySelector('i').classList.add('bi-play-fill');
        return;
    }
    
    setTimeout(playAudio, 1000);
}

function updateAudioProgress() {
    const progress = (currentTime / duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    document.getElementById('currentTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function rewind() {
    currentTime = Math.max(0, currentTime - 10);
    updateAudioProgress();
}

function forward() {
    currentTime = Math.min(duration, currentTime + 10);
    updateAudioProgress();
}

// Answer Handling
const answers = {};

function setupAnswerListeners() {
    // Text inputs
    document.querySelectorAll('.answer-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const questionNum = e.target.id.replace('q', '');
            updateAnswer(questionNum, e.target.value);
        });
    });
    
    // Radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const questionNum = e.target.name.replace('q', '');
            updateAnswer(questionNum, e.target.value);
        });
    });
    
    // Answer cell clicks
    document.querySelectorAll('.answer-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const questionNum = cell.dataset.question;
            scrollToQuestion(questionNum);
        });
    });
}

function updateAnswer(questionNum, value) {
    answers[questionNum] = value;
    
    // Update answer sheet
    const answerCell = document.querySelector(`.answer-cell[data-question="${questionNum}"]`);
    const answerDisplay = document.getElementById(`answer${questionNum}`);
    
    if (value) {
        answerCell.classList.add('answered');
        answerDisplay.textContent = value.length > 10 ? value.substring(0, 10) + '...' : value;
    } else {
        answerCell.classList.remove('answered');
        answerDisplay.textContent = '-';
    }
    
    // Update question item
    const questionItem = document.querySelector(`.question-item[data-question="${questionNum}"]`);
    if (questionItem) {
        if (value) {
            questionItem.classList.add('answered');
        } else {
            questionItem.classList.remove('answered');
        }
    }
    
    // Update count
    updateAnsweredCount();
}

function updateAnsweredCount() {
    const count = Object.values(answers).filter(a => a && a.trim() !== '').length;
    document.getElementById('answeredCount').textContent = count;
}

function scrollToQuestion(questionNum) {
    const questionItem = document.querySelector(`.question-item[data-question="${questionNum}"]`);
    if (questionItem) {
        questionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        questionItem.style.animation = 'highlight 1s ease';
        setTimeout(() => {
            questionItem.style.animation = '';
        }, 1000);
    }
}

// Submit Test
function submitTest() {
    const modal = new bootstrap.Modal(document.getElementById('submitModal'));
    
    const answeredCount = Object.values(answers).filter(a => a && a.trim() !== '').length;
    document.getElementById('modalAnswered').textContent = answeredCount;
    document.getElementById('modalUnanswered').textContent = 10 - answeredCount;
    document.getElementById('modalTime').textContent = document.getElementById('timer').textContent;
    
    modal.show();
}

function confirmSubmit() {
    clearInterval(timerInterval);
    
    // In real app, send answers to server
    console.log('Submitting answers:', answers);
    
    // Redirect to results page
    // window.location.href = 'listening-result.html';
    
    // For demo, show alert
    alert('Bài thi đã được nộp! Đang chấm điểm...');
}

function reviewAnswers() {
    // Highlight unanswered questions
    for (let i = 1; i <= 10; i++) {
        const cell = document.querySelector(`.answer-cell[data-question="${i}"]`);
        if (!answers[i] || answers[i].trim() === '') {
            cell.style.animation = 'pulse 0.5s ease 3';
        }
    }
}

// Section Navigation
function setupSectionNav() {
    document.querySelectorAll('.section-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // In real app, load questions for selected section
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    startTimer();
    setupAnswerListeners();
    setupSectionNav();
});

// Add highlight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0%, 100% { box-shadow: none; }
        50% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.5); }
    }
`;
document.head.appendChild(style);

*/


// ===== LISTENING TEST — AimHigh =====

// ── Answer key (Cambridge IELTS 18 Listening Test 1) ──
const KEY = {
  1:'20', 2:'weekend', 3:'8.50', 4:'Henderson', 5:'King',
  6:'Duke', 7:'waistcoat', 8:'15th/fifteenth', 9:'jobs@footlights-restaurant.co.uk', 10:'letter',
  11:'B', 12:'B', 13:'B', 14:'B',
  15:'market', 16:'Castle', 17:'mill', 18:'lead', 19:'Park', 20:'jazz',
  21:'B', 22:'B', 23:'B', 24:'B',
  25:'questionnaire', 26:'representative', 27:'price', 28:'nothing', 29:'online', 30:'clear',
  31:'Marakanda', 32:'329', 33:'Tamerlane', 34:'madrasahs', 35:'Ulugh',
  36:'B', 37:'B', 38:'B', 39:'B', 40:'B'
};
const TOTAL_ALL = 40;
const SEC_CFG = {
  1:{from:1, to:10, label:'Section 1', time:8*60},
  2:{from:11,to:20, label:'Section 2', time:8*60},
  3:{from:21,to:30, label:'Section 3', time:8*60},
  4:{from:31,to:40, label:'Section 4', time:8*60}
};

// ── Read config from localStorage ──
const examSection = localStorage.getItem('currentExamSection') || 'full';
const isSingle    = examSection !== 'full';
const singleSec   = isSingle ? parseInt(examSection) : null;

// Filter KEY, TOTAL, timeLeft to match section
const KEY_FILTERED = Object.fromEntries(
  Object.entries(KEY).filter(([k])=> isSingle
    ? +k >= SEC_CFG[singleSec].from && +k <= SEC_CFG[singleSec].to
    : true
  )
);
const TOTAL    = isSingle ? (SEC_CFG[singleSec].to - SEC_CFG[singleSec].from + 1) : TOTAL_ALL;
let timeLeft   = isSingle ? SEC_CFG[singleSec].time : 30*60;

let ans = {}, timerInt;
let activeTool = null, noteVisible = false, notes = [];

// ── TIMER ──
function startTimer(){
  timerInt = setInterval(()=>{
    timeLeft--;
    const h=Math.floor(timeLeft/3600), m=Math.floor((timeLeft%3600)/60), s=timeLeft%60;
    document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);
    if(timeLeft<=300) document.getElementById('timerPill').classList.add('timer-warn');
    if(timeLeft<=0){clearInterval(timerInt);submitTest();}
  },1000);
}
const pad = n=>String(n).padStart(2,'0');

// ── ANSWER ──
function pa(q,v){
  ans[q] = v;
  const el = document.getElementById('qi'+q);
  if(el){ el.classList.toggle('done',!!v); const b=el.querySelector('.qbadge'); if(b)b.style.background=v?'var(--success)':'var(--primary)'; }
  const fb = document.getElementById('b'+q);
  if(fb) fb.classList.toggle('done',!!v);
  const nb = document.getElementById('nb'+q);
  if(nb){ nb.classList.toggle('done',!!v); if(v)nb.classList.remove('cur'); }
}

// ── BOTTOM NAV ──
let currentSec = isSingle ? singleSec : 1;

function buildNav(){
  const w = document.getElementById('qnav');
  w.innerHTML = '';

  // Which sections to show
  const secList = isSingle ? [singleSec] : [1,2,3,4];

  secList.forEach((sec,idx)=>{
    const r = SEC_CFG[sec];
    const box = document.createElement('div');
    box.className = 'secbox' + (idx===0?' secbox-active':'');
    box.id = 'secbox'+sec;
    if(!isSingle) box.onclick = ()=>switchSection(sec);

    const lbl = document.createElement('span');
    lbl.className = 'secbox-lbl';
    lbl.textContent = isSingle ? r.label : 'S'+sec;
    box.appendChild(lbl);

    for(let i=r.from;i<=r.to;i++){
      const b = document.createElement('button');
      b.className='qnb'; b.id='nb'+i; b.textContent=i;
      b.onclick=(e)=>{e.stopPropagation(); goQ(i);};
      box.appendChild(b);
    }
    w.appendChild(box);
  });

  // Arrows: disable both if single section
  const prev = document.getElementById('btnSecPrev');
  const next = document.getElementById('btnSecNext');
  if(isSingle){ if(prev)prev.disabled=true; if(next)next.disabled=true; }
  else { updateSecArrows(); }

  switchSection(currentSec);
}

function switchSection(sec){
  // Bài lẻ: không cho switch sang section khác
  if(isSingle && sec !== singleSec) return;
  currentSec = sec;
  [1,2,3,4].forEach(s=>{
    const el = document.getElementById('sec'+s);
    if(el) el.classList.toggle('active', s===sec);
  });
  const qs = document.getElementById('qScroll');
  if(qs) qs.scrollTop = 0;
  [1,2,3,4].forEach(s=>{
    const box = document.getElementById('secbox'+s);
    if(box) box.classList.toggle('secbox-active', s===sec);
  });
  scrollToSecbox(sec);
  updateSecArrows();
}

function prevSection(){
  if(currentSec > 1) switchSection(currentSec - 1);
}
function nextSection(){
  if(currentSec < 4) switchSection(currentSec + 1);
}
function updateSecArrows(){
  const prev = document.getElementById('btnSecPrev');
  const next = document.getElementById('btnSecNext');
  if(isSingle){
    if(prev) prev.disabled = true;
    if(next) next.disabled = true;
  } else {
    if(prev) prev.disabled = currentSec<=1;
    if(next) next.disabled = currentSec>=4;
  }
}

function scrollToSecbox(sec){
  const box = document.getElementById('secbox'+sec);
  const nav = document.getElementById('qnav');
  if(!box||!nav) return;
  nav.scrollTo({left: box.offsetLeft - nav.offsetLeft - 4, behavior:'smooth'});
}

function goQ(q){
  const sec = secOfQ(q);
  if(sec !== currentSec) switchSection(sec);
  setTimeout(()=>{
    const el = document.getElementById('qi'+q) || document.getElementById('q'+q);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  }, 50);
  document.querySelectorAll('.qnb').forEach(b=>b.classList.remove('cur'));
  const nb = document.getElementById('nb'+q);
  if(nb&&!nb.classList.contains('done')) nb.classList.add('cur');
}
function secOfQ(q){ if(q<=10)return 1; if(q<=20)return 2; if(q<=30)return 3; return 4; }

// ── AUDIO PLAYER (simulated) ──
// Bài lẻ: audio chỉ phát đúng đoạn của section đó (~8 phút = 480s)
// Full: 30 phút = 1800s (4 section × 450s)
const SEC_AUDIO = {1:{start:0,end:480},2:{start:480,end:960},3:{start:960,end:1440},4:{start:1440,end:1800}};
const AUDIO_START = isSingle ? SEC_AUDIO[singleSec].start : 0;
const AUDIO_END   = isSingle ? SEC_AUDIO[singleSec].end   : 1800;
let audioTime = AUDIO_START, audioPlaying = false, audioInterval = null;
const SPEEDS = [0.75,1,1.25,1.5,2]; let speedIdx = 1;

// Update total time display
document.addEventListener('DOMContentLoaded',()=>{
  const tot = document.getElementById('totTime');
  if(tot){
    const dur = AUDIO_END - AUDIO_START;
    tot.textContent = Math.floor(dur/60)+':'+pad(dur%60);
  }
});

function togglePlay(){
  audioPlaying = !audioPlaying;
  const icon = document.getElementById('playIcon');
  icon.className = audioPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
  if(audioPlaying){
    audioInterval = setInterval(()=>{
      audioTime += SPEEDS[speedIdx];
      if(audioTime>=AUDIO_END){
        audioTime=AUDIO_END; clearInterval(audioInterval);
        audioPlaying=false; document.getElementById('playIcon').className='bi bi-play-fill';
      }
      updateAudioUI();
      if(!isSingle) syncSectionLabel();
    },1000);
  } else {
    clearInterval(audioInterval);
  }
}
function skipAudio(delta){
  audioTime = Math.max(AUDIO_START, Math.min(AUDIO_END, audioTime+delta));
  updateAudioUI();
}
function seekAudio(e){
  const bar = document.getElementById('progBar');
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  audioTime = Math.round(AUDIO_START + pct*(AUDIO_END-AUDIO_START));
  updateAudioUI();
  if(!isSingle) syncSectionLabel();
}
function updateAudioUI(){
  const elapsed = audioTime - AUDIO_START;
  const duration = AUDIO_END - AUDIO_START;
  const pct = (elapsed/duration)*100;
  document.getElementById('progFill').style.width = pct+'%';
  document.getElementById('progDot').style.left = pct+'%';
  const m=Math.floor(elapsed/60), s=Math.floor(elapsed)%60;
  document.getElementById('curTime').textContent = m+':'+pad(s);
}
function syncSectionLabel(){
  const sec = Math.min(4, Math.floor(audioTime/450)+1);
  [1,2,3,4].forEach(s=>{
    const box = document.getElementById('secbox'+s);
    if(!box) return;
    box.classList.toggle('secbox-playing', s===sec);
  });
}
function cycleSpeed(){
  speedIdx = (speedIdx+1)%SPEEDS.length;
  document.getElementById('speedBtn').textContent = SPEEDS[speedIdx]+'×';
}

// ── TOOLS ──
function setTool(t){
  activeTool = activeTool===t ? null : t;
  document.querySelectorAll('.tool').forEach(b=>b.classList.remove('on'));
  if(activeTool){ const m={hl:'tHL',nt:'tNT'}; document.getElementById(m[activeTool])?.classList.add('on'); }
}
function onKey(e){
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if(e.key==='h'||e.key==='H') setTool('hl');
  if(e.key==='n'||e.key==='N') setTool('nt');
}

// ── TEXT SELECTION (questions panel) ──
function onSel(){
  const sel = window.getSelection();
  if(!sel||sel.isCollapsed) return;
  const txt = sel.toString().trim();
  if(!txt) return;
  if(activeTool==='hl'){ doHL(sel,'hl-y'); sel.removeAllRanges(); }
  else if(activeTool==='nt'){ doHL(sel,'hl-n'); addNote(txt); sel.removeAllRanges(); }
}
function doHL(sel,cls){
  try{
    const r=sel.getRangeAt(0), sp=document.createElement('span');
    sp.className=cls; r.surroundContents(sp);
  }catch(e){
    try{ const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');
      sp.className=cls; sp.appendChild(f); r.insertNode(sp); }catch(e2){}
  }
}

// ── NOTES ──
function addNote(txt){
  notes.push({id:Date.now(),txt,note:''});
  renderNotes();
  if(!noteVisible) toggleNote();
}
function renderNotes(){
  const list=document.getElementById('nbList'), empty=document.getElementById('nbEmpty');
  if(!notes.length){if(empty)empty.style.display='block';list.innerHTML='';list.appendChild(empty);return;}
  if(empty) empty.style.display='none';
  list.innerHTML=notes.map(n=>`
    <div class="nb-item" id="ni${n.id}">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div class="nb-sel" title="${eh(n.txt)}">${eh(n.txt.substring(0,55))}${n.txt.length>55?'…':''}</div>
        <button class="nb-del" onclick="delNote(${n.id})"><i class="bi bi-trash3"></i></button>
      </div>
      <textarea class="nb-ta" rows="2" placeholder="Nhập ghi chú, Enter để lưu..."
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveNote(${n.id},this.value);}"
        onblur="saveNote(${n.id},this.value)">${eh(n.note)}</textarea>
    </div>`).join('');
}
function saveNote(id,v){const n=notes.find(x=>x.id===id);if(n)n.note=v;}
function delNote(id){notes=notes.filter(x=>x.id!==id);renderNotes();}
function clearAllNotes(){
  if(!notes.length) return;
  if(confirm('Xoá tất cả ghi chú?')){
    notes=[];
    document.querySelectorAll('.hl-n').forEach(el=>{const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);});
    renderNotes();
  }
}
function toggleNote(){
  noteVisible=!noteVisible;
  document.getElementById('notebar').classList.toggle('off',!noteVisible);
  document.getElementById('btnSubNote').textContent=noteVisible?'Ẩn note':'Hiện note';
}

// ── SUBMIT ──
function submitTest(){
  const c=Object.values(ans).filter(a=>a&&a.trim()).length;
  document.getElementById('mA').textContent=c;
  document.getElementById('mU').textContent=TOTAL-c;
  document.getElementById('mT').textContent=document.getElementById('timer').textContent;
  new bootstrap.Modal(document.getElementById('subModal')).show();
}
function confirmSub(){
  clearInterval(timerInt); clearInterval(audioInterval);
  let ok=0;
  for(const[q,a] of Object.entries(KEY_FILTERED)){
    const userAns=(ans[q]||'').trim().toLowerCase();
    const correctAns=a.toLowerCase();
    if(correctAns.includes('/')){
      if(correctAns.split('/').some(x=>x.trim()===userAns)) ok++;
    } else {
      if(userAns===correctAns) ok++;
    }
  }
  bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
  setTimeout(()=>alert(`Nộp bài thành công!\nĐúng: ${ok}/${TOTAL} câu`),300);
}

const eh=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── REAL MODE ──
const REAL_SEC_CFG={
  1:{from:1, to:10, sub:'Questions 1–10 · Note Completion'},
  2:{from:11,to:20, sub:'Questions 11–20 · Multiple Choice & Sentence Completion'},
  3:{from:21,to:30, sub:'Questions 21–30 · Multiple Choice & Summary Completion'},
  4:{from:31,to:40, sub:'Questions 31–40 · Note Completion & Multiple Choice'},
};
let currentRealSec=1, currentRealQ=1;
const bookmarked=new Set();

function initRealMode(){
  document.body.classList.add('real-mode');

  // Setup confirm overlay text
  const title = localStorage.getItem('currentExamTitle')||'Cambridge IELTS 18 – Listening Full Test 1';
  document.getElementById('confirmTitle').textContent = title;
  const secLabel = isSingle
    ? `${SEC_CFG[singleSec].label} · ${TOTAL} câu · 8 phút`
    : '40 câu · 30 phút · 4 Sections';
  document.getElementById('confirmDesc').textContent = secLabel;
  // Update confirm warn text for single
  if(isSingle){
    const warnEl = document.querySelector('.confirm-box .warn');
    if(warnEl) warnEl.innerHTML='<i class="bi bi-exclamation-triangle-fill"></i> Sau khi bắt đầu, audio sẽ phát và không thể tua lại.';
  }
  document.getElementById('confirmOverlay').classList.remove('hidden');

  // Build rbot-qnums — only for relevant sections
  [1,2,3,4].forEach(s=>{
    const rbsEl=document.getElementById('rbs'+s);
    if(isSingle && s!==singleSec){
      if(rbsEl) rbsEl.style.display='none';
      return;
    }
    // Single mode: lock tab — no click, no hover, always expanded
    if(isSingle && rbsEl){
      rbsEl.style.cursor='default';
      rbsEl.style.maxWidth='none';
      rbsEl.style.flexShrink='1';
      rbsEl.onclick=null;
      rbsEl.style.pointerEvents='none'; // disable hover bg
    }

    const r=REAL_SEC_CFG[s];
    const container=document.getElementById('rbsq'+s);
    if(!container) return;
    container.innerHTML='';
    for(let i=r.from;i<=r.to;i++){
      const b=document.createElement('button');
      b.className='rbot-qn'; b.id='rbn'+i; b.textContent=i;
      b.onclick=(e)=>{e.stopPropagation();focusRealQ(i);};
      container.appendChild(b);
    }
    // re-enable pointer events on individual q-buttons
    if(isSingle && rbsEl) rbsEl.style.pointerEvents='';
    const cnt=document.getElementById('rbsc'+s);
    if(cnt) cnt.textContent='0 of '+(r.to-r.from+1);
  });

  // Bookmark buttons in qi-head
  document.querySelectorAll('.qi').forEach(qi=>{
    const q=qi.dataset.q;
    if(!q||qi.querySelector('.qi-bm')) return;
    const btn=document.createElement('button');
    btn.className='qi-bm'; btn.dataset.q=q;
    btn.innerHTML='<i class="bi bi-bookmark"></i>';
    btn.title='Flag this question';
    btn.onclick=(e)=>{e.stopPropagation();toggleBookmark(parseInt(q));};
    const head=qi.querySelector('.qi-head');
    if(head) head.appendChild(btn); else qi.appendChild(btn);
  });

  currentRealSec = isSingle ? singleSec : 1;
  currentRealQ   = isSingle ? SEC_CFG[singleSec].from : 1;
}

function startRealTest(){
  document.getElementById('confirmOverlay').classList.add('hidden');
  switchRealSec(currentRealSec);
  updateRealArrows();
  startTimer();
}

function switchRealSec(sec){
  if(isSingle && sec!==singleSec) return;
  currentRealSec = sec;

  [1,2,3,4].forEach(s=>{
    const el=document.getElementById('sec'+s);
    if(el) el.classList.toggle('active', s===sec);
  });
  document.getElementById('qScroll').scrollTop=0;

  const r=REAL_SEC_CFG[sec];
  const lbl = document.getElementById('partInfoLabel');
  const sub = document.getElementById('partInfoSub');
  if(lbl) lbl.textContent = isSingle ? SEC_CFG[singleSec].label : 'Section '+sec;
  if(sub) sub.textContent = r.sub;

  [1,2,3,4].forEach(s=>{
    const el=document.getElementById('rbs'+s);
    if(el) el.classList.toggle('active',s===sec);
  });

  updateRealBot();
}

function realPrevQ(){
  const qFrom = isSingle ? SEC_CFG[singleSec].from : 1;
  if(currentRealQ > qFrom) focusRealQ(currentRealQ - 1);
}
function realNextQ(){
  const qTo = isSingle ? SEC_CFG[singleSec].to : 40;
  if(currentRealQ < qTo) focusRealQ(currentRealQ + 1);
}
function updateRealArrows(){
  const qFrom = isSingle ? SEC_CFG[singleSec].from : 1;
  const qTo   = isSingle ? SEC_CFG[singleSec].to   : 40;
  const prev=document.getElementById('rbPrev');
  const next=document.getElementById('rbNext');
  if(prev) prev.disabled = currentRealQ <= qFrom;
  if(next) next.disabled = currentRealQ >= qTo;
}

function focusRealQ(q){
  const sec=[1,2,3,4].find(s=>q>=REAL_SEC_CFG[s].from&&q<=REAL_SEC_CFG[s].to)||1;
  if(sec!==currentRealSec) switchRealSec(sec);
  currentRealQ=q;
  setTimeout(()=>{
    const el=document.getElementById('qi'+q)||document.getElementById('q'+q);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  },50);
  updateRealBot();
  updateRealArrows();
}

function toggleBookmark(q){
  if(bookmarked.has(q)) bookmarked.delete(q); else bookmarked.add(q);
  const active=bookmarked.has(q);
  const qi=document.getElementById('qi'+q);
  if(qi){
    qi.classList.toggle('bookmarked',active);
    const bm=qi.querySelector('.qi-bm');
    if(bm){ bm.classList.toggle('active',active); bm.innerHTML=active?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>'; }
  }
  const rbn=document.getElementById('rbn'+q);
  if(rbn) rbn.classList.toggle('bookmarked',active);
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
    const cnt=document.getElementById('rbsc'+s);
    if(cnt) cnt.textContent=done+' of '+(r.to-r.from+1);
  });
}

// Override pa to also call updateRealBot in real mode
const _pa_orig = pa;
function pa(q,v){
  _pa_orig(q,v);
  if(document.body.classList.contains('real-mode')) updateRealBot();
}

// ── INIT ──
document.addEventListener('DOMContentLoaded',()=>{
  // Audio total time
  const dur = AUDIO_END - AUDIO_START;
  const totEl = document.getElementById('totTime');
  if(totEl) totEl.textContent = Math.floor(dur/60)+':'+pad(dur%60);

  // Exam title
  const title = localStorage.getItem('currentExamTitle') ||
    (isSingle ? `Cambridge IELTS 18 – Listening ${SEC_CFG[singleSec].label}` : 'Cambridge IELTS 18 – Listening Full Test 1');
  document.getElementById('examTitle').textContent = title;
  const minStr = isSingle ? '8 phút' : '30 phút';
  document.querySelector('.sn-info').innerHTML =
    `Đề: <strong>${title}</strong> &nbsp;|&nbsp; ${TOTAL} câu &nbsp;|&nbsp; ${minStr}`;

  // Timer display
  const h=Math.floor(timeLeft/3600), m2=Math.floor((timeLeft%3600)/60), s=timeLeft%60;
  document.getElementById('timer').textContent = pad(h)+':'+pad(m2)+':'+pad(s);

  const mTotalEl=document.getElementById('mTotal'); if(mTotalEl) mTotalEl.textContent=TOTAL;
  const mUEl=document.getElementById('mU');         if(mUEl) mUEl.textContent=TOTAL;

  const examMode = localStorage.getItem('currentExamMode')||'practice';
  if(examMode==='real'){
    initRealMode();
    // Timer & audio start after user clicks Play in confirm overlay
  } else {
    buildNav();
    startTimer();
  }

  document.getElementById('qScroll').addEventListener('mouseup',onSel);
  document.addEventListener('keydown',onKey);
});