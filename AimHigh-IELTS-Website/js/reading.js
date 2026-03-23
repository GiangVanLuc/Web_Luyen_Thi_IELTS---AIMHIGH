// ===== READING TEST JAVASCRIPT (Legacy — kept for reference) =====
/* NOTE: The active code for reading.html is below (AimHigh section).
   This legacy block is preserved for reference only.

// ===== READING TEST JAVASCRIPT (Đã tối ưu) =====

// 1. Khởi tạo các biến toàn cục
let timeLeft = 60 * 60; // 60 phút
let timerInterval;
const TOTAL_QUESTIONS = 13;
const answers = {};

// 2. Khởi chạy khi load trang làm bài
document.addEventListener('DOMContentLoaded', () => {
    // Đọc dữ liệu từ trang Practice truyền sang
    const examTitle = localStorage.getItem('currentExamTitle') || 'Bài kiểm tra Reading';
    const examMode = localStorage.getItem('currentExamMode') || 'practice';

    // Cập nhật tiêu đề hiển thị trên thanh công cụ
    const topExamTitle = document.getElementById('topExamTitle');
    if (topExamTitle) {
        topExamTitle.innerHTML = `<i class="bi bi-book"></i> ${examTitle}`;
    }
    const pageTitle = document.querySelector('.test-title');
    if (pageTitle) {
        pageTitle.textContent = examTitle;
    }

    // Áp dụng giao diện Thi thật hay Luyện tập
    document.body.classList.toggle('exam-mode-real', examMode === 'real');
    document.body.classList.toggle('exam-mode-practice', examMode !== 'real');

    // Bật các chức năng làm bài
    setupAnswerListeners();
    setupTextSelection();
    renderVocabSidebar();
    restoreHighlights();
    
    // Bắt đầu đếm ngược thời gian
    startTimer();
});

// ===== TIMER HANDLING =====
function startTimer() {
    clearInterval(timerInterval);
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
    const timerEl = document.getElementById('timer');
    if(timerEl) {
        timerEl.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    }
    
    // Đổi màu đỏ khi còn dưới 5 phút
    if (timeLeft <= 300) {
        const timerBox = document.getElementById('testTimerBox');
        if (timerBox) timerBox.style.background = 'rgba(239, 68, 68, 0.2)';
    }
}

// ===== ANSWER HANDLING =====
function updateAnswer(questionNum, value) {
    answers[questionNum] = value;
    const answerCell = document.querySelector('.answer-cell[data-question="' + questionNum + '"]');
    const answerDisplay = document.getElementById('answer' + questionNum);

    if (value) {
        answerCell.classList.add('answered');
        answerDisplay.textContent = value.length > 8 ? value.substring(0, 8) + '…' : value;
    } else {
        answerCell.classList.remove('answered');
        answerDisplay.textContent = '-';
    }

    const questionItem = document.querySelector('.question-item[data-question="' + questionNum + '"]');
    if (questionItem) {
        questionItem.classList.toggle('answered', !!value);
    }
    updateAnsweredCount();
}

function updateAnsweredCount() {
    const count = Object.values(answers).filter(a => a && a.trim() !== '').length;
    document.getElementById('answeredCount').textContent = count;
}

function scrollToQuestion(num) {
    const el = document.querySelector('.question-item[data-question="' + num + '"]');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.animation = 'highlight 1s ease';
        setTimeout(() => { el.style.animation = ''; }, 1000);
    }
}

function setupAnswerListeners() {
    // Text inputs
    document.querySelectorAll('.answer-input[type="text"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const questionNum = e.target.id.replace('q', '');
            updateAnswer(questionNum, e.target.value);
        });
    });

    // Answer cell clicks
    document.querySelectorAll('.answer-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            scrollToQuestion(cell.dataset.question);
        });
    });

    // Section buttons
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ===== SUBMIT TEST =====
function submitTest() {
    const modal = new bootstrap.Modal(document.getElementById('submitModal'));
    const c = Object.values(answers).filter(a => a && a.trim() !== '').length;
    document.getElementById('modalAnswered').textContent = c;
    document.getElementById('modalUnanswered').textContent = TOTAL_QUESTIONS - c;
    
    const timerEl = document.getElementById('timer');
    if(timerEl) {
        document.getElementById('modalTime').textContent = timerEl.textContent;
    }
    modal.show();
}

function confirmSubmit() {
    clearInterval(timerInterval);
    alert('Bài thi đã được nộp! Đang chấm điểm...');
    // window.location.href = 'result.html';
}

function reviewAnswers() {
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
        const cell = document.querySelector('.answer-cell[data-question="' + i + '"]');
        if (!answers[i] || answers[i].trim() === '') {
            cell.style.animation = 'pulse 0.5s ease 3';
            setTimeout(() => { cell.style.animation = ''; }, 1500);
        }
    }
}

// ===== VOCABULARY HIGHLIGHT SYSTEM =====
const VOCAB_STORAGE_KEY = 'aimhigh_vocab';
const VOCAB_GROUPS_KEY = 'aimhigh_vocab_groups';

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

let selectedWord = '';

function showVocabPopup(x, y, word) {
    selectedWord = word;
    const popup = document.getElementById('vocabPopup');
    if(!popup) return;
    document.getElementById('vocabSelectedWord').textContent = word;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let px = x, py = y + 10;
    if (px + 300 > vw) px = vw - 320;
    if (py + 300 > vh) py = y - 310;
    if (px < 10) px = 10;
    if (py < 10) py = 10;

    popup.style.left = px + 'px';
    popup.style.top = py + 'px';
    popup.classList.add('show');

    populateGroupSelect();
}

function closeVocabPopup() {
    const popup = document.getElementById('vocabPopup');
    if(popup) popup.classList.remove('show');
    selectedWord = '';
}

function populateGroupSelect() {
    const select = document.getElementById('vocabGroupSelect');
    if(!select) return;
    const groups = getVocabGroups();
    select.innerHTML = '<option value="">-- Chọn nhóm từ --</option>';
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
    });
}

function createNewGroup() {
    const input = document.getElementById('newGroupName');
    const name = input.value.trim();
    if (!name) return;
    const groups = getVocabGroups();
    if (groups.includes(name)) {
        alert('Nhóm này đã tồn tại!');
        return;
    }
    groups.push(name);
    saveVocabGroups(groups);
    input.value = '';
    populateGroupSelect();
    document.getElementById('vocabGroupSelect').value = name;
}

function saveVocab() {
    const group = document.getElementById('vocabGroupSelect').value;
    if (!selectedWord) return;
    if (!group) {
        alert('Vui lòng chọn hoặc tạo nhóm từ!');
        return;
    }

    const data = getVocabData();
    const exists = data.find(v => v.word.toLowerCase() === selectedWord.toLowerCase() && v.group === group);
    if (exists) {
        alert('Từ này đã có trong nhóm "' + group + '"!');
        closeVocabPopup();
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
    renderVocabSidebar();
    closeVocabPopup();
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
        span.innerHTML = node.textContent.replace(regex, '<span class="vocab-highlight" title="Đã lưu: ' + word + '">$1</span>');
        node.parentElement.replaceChild(span, node);
    });
}

function renderVocabSidebar() {
    const data = getVocabData();
    const groups = getVocabGroups();

    const countEl = document.getElementById('vocabTotalCount');
    if(countEl) countEl.textContent = data.length + ' từ';

    const tabsContainer = document.getElementById('vocabGroupTabs');
    if(!tabsContainer) return;
    const activeGroup = tabsContainer.querySelector('.active')?.dataset.group || 'all';
    tabsContainer.innerHTML = '<button class="vocab-group-tab ' + (activeGroup === 'all' ? 'active' : '') +
        '" data-group="all" onclick="filterVocabSidebar(\'all\')">Tất cả</button>';
    groups.forEach(g => {
        const count = data.filter(v => v.group === g).length;
        if (count > 0) {
            tabsContainer.innerHTML += '<button class="vocab-group-tab ' +
                (activeGroup === g ? 'active' : '') +
                '" data-group="' + g + '" onclick="filterVocabSidebar(\'' + g.replace(/'/g, "\\'") + '\')">' +
                g + ' (' + count + ')</button>';
        }
    });

    filterVocabSidebar(activeGroup);
}

function filterVocabSidebar(group) {
    const data = getVocabData();
    const list = document.getElementById('vocabWordList');
    if(!list) return;
    const tabs = document.querySelectorAll('.vocab-group-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.group === group));

    const filtered = group === 'all' ? data : data.filter(v => v.group === group);

    if (filtered.length === 0) {
        list.innerHTML = '<li style="text-align:center;color:var(--text-light);padding:16px;font-size:0.875rem;">' +
            'Bôi đen từ trong passage để thêm vào danh sách</li>';
        return;
    }

    list.innerHTML = filtered.map((v, i) =>
        '<li class="vocab-word-item">' +
        '<span class="word">' + v.word + '</span>' +
        '<span style="color:var(--text-light);font-size:0.75rem;">' + v.group + '</span>' +
        '<button class="remove-word" onclick="removeVocab(' + i + ',\'' + group + '\')" title="Xóa">' +
        '<i class="bi bi-x-lg"></i></button>' +
        '</li>'
    ).join('');
}

function removeVocab(index, currentGroup) {
    const data = getVocabData();
    const filtered = currentGroup === 'all' ? data : data.filter(v => v.group === currentGroup);
    const toRemove = filtered[index];
    if (!toRemove) return;

    const realIndex = data.findIndex(v => v.word === toRemove.word && v.group === toRemove.group);
    if (realIndex !== -1) {
        data.splice(realIndex, 1);
        saveVocabData(data);
        renderVocabSidebar();
    }
}

function setupTextSelection() {
    const passage = document.getElementById('passageText');
    if(!passage) return;

    passage.addEventListener('mouseup', (e) => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text && text.length > 0 && text.length < 100) {
            showVocabPopup(e.clientX, e.clientY, text);
        }
    });

    document.addEventListener('mousedown', (e) => {
        const popup = document.getElementById('vocabPopup');
        if (popup && popup.classList.contains('show') && !popup.contains(e.target)) {
            setTimeout(() => {
                if (!popup.contains(document.activeElement)) {
                    closeVocabPopup();
                }
            }, 200);
        }
    });
}

function restoreHighlights() {
    const data = getVocabData();
    const words = [...new Set(data.map(v => v.word))];
    words.forEach(word => highlightWordInPassage(word));
}

// Thêm keyframes CSS cho animation Highlight & Pulse
const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes highlight{0%,100%{box-shadow:none}50%{box-shadow:0 0 20px rgba(37,99,235,0.5)}}' +
    '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}';
document.head.appendChild(styleEl);

*/


// ===== READING TEST — AimHigh =====

// ── Section config ──
const SEC={
  'full':{total:40,time:60*60,from:1, to:40,label:'Cambridge IELTS 18 GT – Reading Test 1',   info:'40 câu | 60 phút'},
  '1':   {total:14,time:20*60,from:1, to:14,label:'Cambridge IELTS 18 GT – Section 1 (Q1–14)',  info:'14 câu | 20 phút'},
  '2':   {total:13,time:20*60,from:15,to:27,label:'Cambridge IELTS 18 GT – Section 2 (Q15–27)', info:'13 câu | 20 phút'},
  '3':   {total:13,time:20*60,from:28,to:40,label:'Cambridge IELTS 18 GT – Section 3 (Q28–40)', info:'13 câu | 20 phút'},
};
const examSection = localStorage.getItem('currentExamSection')||'full';
const cfg = SEC[examSection]||SEC['full'];
const KEY_ALL={1:'TRUE',2:'FALSE',3:'NOT GIVEN',4:'TRUE',5:'FALSE',6:'NOT GIVEN',7:'TRUE',
  8:'A',9:'F',10:'B',11:'C',12:'F',13:'E',14:'B',
  15:'CE mark',16:'tests',17:'qualified engineer',18:'control measures',19:'lifting crew',
  20:'barriers',21:'banksman',22:'injuries',
  23:'win',24:'expectations',25:'solution',26:'policy',27:'recommendation',
  28:'vii',29:'i',30:'vi',31:'iii',32:'viii',33:'ii',
  34:'sticks',35:'infertile',36:'Poland',37:'loyalty',38:'D',39:'D',40:'B'};
const KEY=Object.fromEntries(Object.entries(KEY_ALL).filter(([k])=>+k>=cfg.from&&+k<=cfg.to));
let TOTAL=cfg.total, ans={};
let timeLeft=cfg.time, timerInt, activeTool=null, noteVisible=false, notes=[];

document.addEventListener('DOMContentLoaded',()=>{
  // Cập nhật tiêu đề & subnav theo section
  const examTitle=localStorage.getItem('currentExamTitle')||cfg.label;
  const titleEl=document.querySelector('.exam-title');
  if(titleEl) titleEl.textContent=examTitle;
  const snInfo=document.querySelector('.sn-info');
  if(snInfo) snInfo.innerHTML='Đề: <strong>'+cfg.label+'</strong> &nbsp;|&nbsp; '+cfg.info;
  // Ẩn section không cần thiết nếu là bài lẻ
  if(examSection!=='full'){
    document.querySelectorAll('[data-section]').forEach(el=>{
      el.style.display=el.dataset.section===examSection?'':'none';
    });
  }
  // ── Real mode setup ──
  const examMode = localStorage.getItem('currentExamMode')||'practice';
  if(examMode === 'real'){
    document.body.classList.add('real-mode');
    initRealMode();
  }

  buildNav();
  startTimer();
  document.getElementById('passageText').addEventListener('mouseup',onSel);
  document.addEventListener('keydown',onKey);
  syncSubnav();
});

// TIMER
function startTimer(){
  timerInt=setInterval(()=>{
    timeLeft--;
    const h=Math.floor(timeLeft/3600),m=Math.floor((timeLeft%3600)/60),s=timeLeft%60;
    document.getElementById('timer').textContent=pad(h)+':'+pad(m)+':'+pad(s);
    if(timeLeft<=0){clearInterval(timerInt);submitTest();}
  },1000);
}
const pad=n=>String(n).padStart(2,'0');

// BOTTOM NAV
const PRACTICE_PARTS=[
  {label:'Part 1',from:1, to:14},
  {label:'Part 2',from:15,to:27},
  {label:'Part 3',from:28,to:40},
];
let currentNavPart=0; // index into PRACTICE_PARTS

function buildNav(){
  const w=document.getElementById('qnav');
  w.innerHTML='';

  // Full đề: 3 part boxes; bài lẻ: 1 box thôi
  const parts = examSection==='full'
    ? PRACTICE_PARTS
    : PRACTICE_PARTS.filter(p=>String(PRACTICE_PARTS.indexOf(p)+1)===examSection);

  parts.forEach((part,pi)=>{
    const box=document.createElement('div');
    box.className='partbox';
    box.id='partbox'+pi;
    box.style.cursor='pointer';
    box.onclick=(()=>{const idx=pi;return ()=>switchPracticePart(idx);})();

    const lbl=document.createElement('span');
    lbl.className='partbox-lbl';
    lbl.textContent=part.label;
    box.appendChild(lbl);

    for(let i=part.from;i<=part.to;i++){
      if(i<cfg.from||i>cfg.to) continue;
      const b=document.createElement('button');
      b.className='qnb';b.id='nb'+i;b.textContent=i;
      b.onclick=(()=>{const q=i;return ()=>goQ(q);})();
      box.appendChild(b);
    }
    w.appendChild(box);
  });

  // Highlight part đầu tiên và hiện đúng section
  currentNavPart=0;
  if(!document.body.classList.contains('real-mode')){
    switchPracticePart(0);
  } else {
    document.querySelectorAll('.partbox').forEach((b,i)=>b.classList.toggle('partbox-active',i===0));
    updateNavArrows();
  }
}

function switchPracticePart(idx){
  // Chỉ áp dụng practice mode
  if(document.body.classList.contains('real-mode')) return;

  const parts = examSection==='full'
    ? PRACTICE_PARTS
    : PRACTICE_PARTS.filter(p=>String(PRACTICE_PARTS.indexOf(p)+1)===examSection);

  const part = parts[idx];
  if(!part) return;

  // Ẩn tất cả data-section trong passage và questions
  [1,2,3].forEach(s=>{
    document.querySelectorAll(`#passagePanel [data-section="${s}"]`).forEach(el=>el.style.display='none');
    document.querySelectorAll(`#questionPanel [data-section="${s}"]`).forEach(el=>el.style.display='none');
  });

  // Hiện đúng section tương ứng với part
  const secNum = PRACTICE_PARTS.indexOf(part)+1;
  document.querySelectorAll(`#passagePanel [data-section="${secNum}"]`).forEach(el=>el.style.display='');
  document.querySelectorAll(`#questionPanel [data-section="${secNum}"]`).forEach(el=>el.style.display='');

  // Scroll về đầu
  const ps=document.getElementById('passageText'); if(ps) ps.scrollTop=0;
  const qs=document.getElementById('qScroll');    if(qs) qs.scrollTop=0;

  currentNavPart=idx;
  document.querySelectorAll('.partbox').forEach((b,i)=>b.classList.toggle('partbox-active',i===idx));
  updateNavArrows();
}

function navPrev(){
  if(currentNavPart>0) switchPracticePart(currentNavPart-1);
}
function navNext(){
  const boxes=document.querySelectorAll('.partbox');
  if(currentNavPart<boxes.length-1) switchPracticePart(currentNavPart+1);
}
function scrollToPartbox(idx){
  const box=document.getElementById('partbox'+idx);
  const nav=document.getElementById('qnav');
  if(!box||!nav) return;
  nav.scrollTo({left:box.offsetLeft-nav.offsetLeft-4,behavior:'smooth'});
}
function updateNavArrows(){
  const boxes=document.querySelectorAll('.partbox');
  const prev=document.getElementById('btnNavPrev');
  const next=document.getElementById('btnNavNext');
  if(prev) prev.disabled=currentNavPart<=0;
  if(next) next.disabled=currentNavPart>=boxes.length-1;
}
function goQ(q){
  // Tìm part chứa câu q và switch sang đó trước
  if(!document.body.classList.contains('real-mode')){
    const parts = examSection==='full'
      ? PRACTICE_PARTS
      : PRACTICE_PARTS.filter(p=>String(PRACTICE_PARTS.indexOf(p)+1)===examSection);
    const idx=parts.findIndex(p=>q>=p.from&&q<=p.to);
    if(idx>=0 && idx!==currentNavPart) switchPracticePart(idx);
  }
  setTimeout(()=>{
    const el=document.getElementById('qi'+q)||document.getElementById('q'+q);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
    document.querySelectorAll('.qnb').forEach(b=>b.classList.remove('cur'));
    const nb=document.getElementById('nb'+q);
    if(nb&&!nb.classList.contains('done')) nb.classList.add('cur');
  },50);
}

// ── REAL MODE ──
const PART_CFG={
  1:{from:1, to:14,sub:'Read the text and answer questions 1–14'},
  2:{from:15,to:27,sub:'Read the text and answer questions 15–27'},
  3:{from:28,to:40,sub:'Read the text and answer questions 28–40'},
};
let currentRealPart=1;
let currentRealQ=cfg.from;
const bookmarked=new Set();

function partOfQ(q){
  if(q>=28) return 3;
  if(q>=15) return 2;
  return 1;
}

function initRealMode(){
  // Bài lẻ: chỉ có 1 part cố định; Full đề: bắt đầu từ part 1
  currentRealPart = examSection==='full' ? 1 : parseInt(examSection);
  currentRealQ    = cfg.from;
  const isSingle  = examSection !== 'full';

  // ── Bottom nav: ẩn part không liên quan ──
  [1,2,3].forEach(p=>{
    const show = examSection==='full' || examSection===String(p);
    const el   = document.getElementById('rbp'+p);
    if(el){
      el.style.display = show ? '' : 'none';
      // Bài lẻ: ẩn border & cursor trên part duy nhất (không click được)
      if(show && isSingle){
        el.style.cursor        = 'default';
        el.style.borderRight   = 'none';
        el.onclick             = null;
        el.style.pointerEvents = 'none';
      }
    }
  });

  // ── Build số câu trong bottom nav ──
  [1,2,3].forEach(p=>{
    if(examSection!=='full' && examSection!==String(p)) return;
    const r         = PART_CFG[p];
    const container = document.getElementById('rbq'+p);
    if(!container) return;
    container.innerHTML='';
    for(let i=r.from;i<=r.to;i++){
      const b=document.createElement('button');
      b.className='rbot-qn'; b.id='rbn'+i; b.textContent=i;
      b.onclick=(e)=>{e.stopPropagation();focusQuestion(i);};
      container.appendChild(b);
    }
    const cnt=document.getElementById('rbc'+p);
    if(cnt) cnt.textContent='0 of '+(r.to-r.from+1);
  });

  // ── Bookmark icon trong qi-head ──
  document.querySelectorAll('.qi').forEach(qi=>{
    const q=qi.dataset.q;
    if(!q||qi.querySelector('.qi-bm')) return;
    const btn=document.createElement('button');
    btn.className='qi-bm'; btn.dataset.q=q;
    btn.innerHTML='<i class="bi bi-bookmark"></i>';
    btn.title='Flag this question';
    btn.onclick=(e)=>{e.stopPropagation();toggleBookmarkQ(parseInt(q));};
    const head=qi.querySelector('.qi-head');
    if(head) head.appendChild(btn); else qi.appendChild(btn);
  });

  // ── Bookmark cho fill-line (Part 2) ──
  document.querySelectorAll('.fill-line .fb').forEach(fb=>{
    const q=parseInt(fb.textContent);
    if(!q||isNaN(q)) return;
    const line=fb.closest('.fill-line');
    if(!line||line.querySelector('.qi-bm')) return;
    line.style.position='relative'; line.style.paddingRight='28px';
    const btn=document.createElement('button');
    btn.className='qi-bm'; btn.dataset.q=q;
    btn.innerHTML='<i class="bi bi-bookmark"></i>';
    btn.title='Flag question '+q;
    btn.style.cssText='position:absolute;right:2px;top:50%;transform:translateY(-50%);display:none;';
    btn.onclick=(e)=>{e.stopPropagation();toggleBookmarkQ(q);};
    line.appendChild(btn);
    line.addEventListener('mouseenter',()=>{if(document.body.classList.contains('real-mode'))btn.style.display='block';});
    line.addEventListener('mouseleave',()=>{if(!btn.classList.contains('active'))btn.style.display='none';});
  });

  // ── Bookmark cho table cells (Part 2) ──
  document.querySelectorAll('.qtbl td .fb').forEach(fb=>{
    const q=parseInt(fb.textContent);
    if(!q||isNaN(q)) return;
    const td=fb.closest('td');
    if(!td||td.querySelector('.qi-bm')) return;
    td.style.position='relative';
    const btn=document.createElement('button');
    btn.className='qi-bm'; btn.dataset.q=q;
    btn.innerHTML='<i class="bi bi-bookmark"></i>';
    btn.title='Flag question '+q;
    btn.style.cssText='position:absolute;right:2px;top:4px;display:none;';
    btn.onclick=(e)=>{e.stopPropagation();toggleBookmarkQ(q);};
    td.appendChild(btn);
    td.addEventListener('mouseenter',()=>{if(document.body.classList.contains('real-mode'))btn.style.display='block';});
    td.addEventListener('mouseleave',()=>{if(!btn.classList.contains('active'))btn.style.display='none';});
  });

  // ── Ẩn tất cả rồi show đúng part ──
  [1,2,3].forEach(p=>{
    document.querySelectorAll('#passagePanel [data-section="'+p+'"]').forEach(el=>el.style.display='none');
    document.querySelectorAll('.qpanel [data-section="'+p+'"]').forEach(el=>el.style.display='none');
  });
  switchRealPart(currentRealPart);
}

function switchRealPart(part){
  // Bài lẻ: không cho chuyển sang part khác
  if(examSection!=='full' && part!==parseInt(examSection)) return;

  currentRealPart=part;

  // Hiện/ẩn passage + questions
  [1,2,3].forEach(p=>{
    const show=p===part;
    document.querySelectorAll('#passagePanel [data-section="'+p+'"]').forEach(el=>el.style.display=show?'':'none');
    document.querySelectorAll('.qpanel [data-section="'+p+'"]').forEach(el=>el.style.display=show?'':'none');
    const rbp=document.getElementById('rbp'+p);
    if(rbp) rbp.classList.toggle('active',show);
  });

  // Scroll về đầu
  const pEl=document.querySelector('#passagePanel [data-section="'+part+'"]');
  const qEl=document.querySelector('.qpanel [data-section="'+part+'"]');
  if(pEl){document.getElementById('passageText').scrollTop=0;}
  if(qEl){document.getElementById('qScroll').scrollTop=0;}

  // Cập nhật Part Info Bar
  const r=PART_CFG[part];
  const lbl=document.getElementById('partInfoLabel');
  const sub=document.getElementById('partInfoSub');
  if(lbl) lbl.textContent='Section '+part;
  if(sub) sub.textContent=r.sub;

  // Focus câu đầu tiên chưa trả lời
  let target=r.from;
  for(let i=r.from;i<=r.to;i++){if(!(ans[i]&&ans[i].trim())){target=i;break;}}
  currentRealQ=target;
  updateRealBotNav();
}

function focusQuestion(q){
  const part=partOfQ(q);
  if(part!==currentRealPart) switchRealPart(part);
  currentRealQ=q;
  setTimeout(()=>{
    const el=document.getElementById('qi'+q);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
    updateRealBotNav();
  },50);
}

function prevQuestion(){
  if(currentRealQ>cfg.from) focusQuestion(currentRealQ-1);
}
function nextQuestion(){
  if(currentRealQ<cfg.to) focusQuestion(currentRealQ+1);
}

function toggleBookmarkQ(q){
  if(bookmarked.has(q)) bookmarked.delete(q);
  else bookmarked.add(q);
  const active=bookmarked.has(q);

  // .qi câu thông thường
  const qi=document.getElementById('qi'+q);
  if(qi){
    qi.classList.toggle('bookmarked',active);
    const bm=qi.querySelector('.qi-bm');
    if(bm){
      bm.classList.toggle('active',active);
      bm.innerHTML=active?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>';
    }
  }
  // fill-line & table cell bookmark buttons
  document.querySelectorAll(`.qi-bm[data-q="${q}"]`).forEach(bm=>{
    bm.classList.toggle('active',active);
    bm.style.display=active?'block':'';
    bm.innerHTML=active?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>';
  });
  // Bottom nav q button
  const rbn=document.getElementById('rbn'+q);
  if(rbn) rbn.classList.toggle('bookmarked',active);
}

function updateRealBotNav(){
  // Update q buttons
  document.querySelectorAll('.rbot-qn').forEach(b=>{
    const q=parseInt(b.textContent);
    b.classList.toggle('current',q===currentRealQ);
    b.classList.toggle('bookmarked',bookmarked.has(q));
    b.classList.toggle('answered',!!(ans[q]&&ans[q].trim())&&!bookmarked.has(q));
  });
  // Update "X of Y" counts
  [1,2,3].forEach(p=>{
    const r=PART_CFG[p];
    const done=Object.entries(ans).filter(([k,v])=>+k>=r.from&&+k<=r.to&&v&&v.trim()).length;
    const total=r.to-r.from+1;
    const cnt=document.getElementById('rbc'+p);
    if(cnt) cnt.textContent=done+' of '+total;
  });
  // Prev/next disabled
  const prev=document.getElementById('btnPrev');
  const next=document.getElementById('btnNext');
  if(prev) prev.disabled=currentRealQ<=cfg.from;
  if(next) next.disabled=currentRealQ>=cfg.to;
}

function updateRealCounter(){updateRealBotNav();}

function pa(q,v){
  ans[q]=v;
  const el=document.getElementById('qi'+q);
  if(el){el.classList.toggle('done',!!v);const b=el.querySelector('.qbadge');if(b)b.style.background=v?'var(--success)':'var(--primary)';}
  const fb=document.getElementById('b'+q);
  if(fb)fb.classList.toggle('done',!!v);
  const nb=document.getElementById('nb'+q);
  if(nb){nb.classList.toggle('done',!!v);if(v)nb.classList.remove('cur');}
  updateRealCounter();
}

// TOOLS
function setTool(t){
  activeTool=activeTool===t?null:t;
  document.querySelectorAll('.tool').forEach(b=>b.classList.remove('on'));
  if(activeTool){const m={hl:'tHL',nt:'tNT',vc:'tVC'};document.getElementById(m[activeTool]).classList.add('on');}
}
function onKey(e){
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if(e.key==='h'||e.key==='H') setTool('hl');
  if(e.key==='n'||e.key==='N') setTool('nt');
  if(e.key==='t'||e.key==='T') setTool('vc');
}

// TEXT SELECTION
function onSel(e){
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed) return;
  const txt=sel.toString().trim();
  if(!txt) return;
  if(activeTool==='hl'){doHL(sel,'hl-y');sel.removeAllRanges();}
  else if(activeTool==='nt'){doHL(sel,'hl-n');addNote(txt);sel.removeAllRanges();}
  else if(activeTool==='vc'){
    const r=sel.getRangeAt(0).getBoundingClientRect();
    showVP(r.left+r.width/2,r.bottom+8,txt);
    sel.removeAllRanges();
  }
}
function doHL(sel,cls){
  try{
    const r=sel.getRangeAt(0),sp=document.createElement('span');
    sp.className=cls;r.surroundContents(sp);
  }catch(e){
    try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');
      sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}
  }
}

// NOTES
function addNote(txt){
  notes.push({id:Date.now(),txt,note:''});
  renderNotes();
  if(!noteVisible) toggleNote();
}
function renderNotes(){
  const list=document.getElementById('nbList'),empty=document.getElementById('nbEmpty');
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
    document.querySelectorAll('.hl-n').forEach(el=>{
      const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);
    });
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

// VOCAB POPUP
function showVP(x,y,word){
  const p=document.getElementById('vpop');
  document.getElementById('vpW').textContent=word;
  document.getElementById('vpR').textContent='None';
  document.getElementById('vpM').textContent='None';
  document.getElementById('vpE').textContent='None';
  document.getElementById('vpT').textContent='None';
  let px=x-148,py=y+6;
  if(px<6)px=6;
  if(px+296>window.innerWidth)px=window.innerWidth-302;
  if(py+250>window.innerHeight)py=y-256;
  p.style.left=px+'px';p.style.top=py+'px';
  p.classList.add('on');
}
function closeVP(){document.getElementById('vpop').classList.remove('on');}
function saveVW(){alert(`Đã lưu từ vựng: "${document.getElementById('vpW').textContent}"`);closeVP();}
function copyVW(){navigator.clipboard?.writeText(document.getElementById('vpW').textContent);closeVP();}
document.addEventListener('mousedown',e=>{
  const p=document.getElementById('vpop');
  if(p.classList.contains('on')&&!p.contains(e.target))closeVP();
});

// SUBMIT
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
  for(const[q,a] of Object.entries(KEY)){if((ans[q]||'').trim().toLowerCase()===a.toLowerCase())ok++;}
  bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
  setTimeout(()=>alert(`Nộp bài thành công!\nĐúng: ${ok}/${TOTAL} câu`),300);
}

// ── RESIZE HANDLE ──
document.addEventListener('DOMContentLoaded',()=>{
  const handle=document.getElementById('resizeHandle');
  const left=document.getElementById('passagePanel');
  const right=document.getElementById('questionPanel');
  if(!handle||!left||!right) return;
  handle.addEventListener('pointerdown',e=>{
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const startX=e.clientX;
    const startW=left.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.userSelect='none';
    document.body.style.cursor='col-resize';
    function onMove(ev){
      const delta=ev.clientX-startX;
      const container=handle.parentElement;
      const totalW=container.getBoundingClientRect().width;
      const toolW=document.querySelector('.tools')?.offsetWidth||0;
      const available=totalW-toolW-8;
      const newW=Math.min(Math.max(startW+delta,available*0.25),available*0.75);
      left.style.flex='none';
      left.style.width=newW+'px';
      right.style.flex='1';
      right.style.minWidth='0';
    }
    function onUp(){
      handle.classList.remove('dragging');
      document.body.style.userSelect='';
      document.body.style.cursor='';
      handle.removeEventListener('pointermove',onMove);
      handle.removeEventListener('pointerup',onUp);
    }
    handle.addEventListener('pointermove',onMove);
    handle.addEventListener('pointerup',onUp);
  });
});

const eh=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');