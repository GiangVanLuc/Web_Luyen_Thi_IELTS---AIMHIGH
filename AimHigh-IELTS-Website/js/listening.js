// ===== LISTENING.JS — Render động từ API =====
// Fetch /api/exam/listening/{id} rồi build questions vào DOM.
// Giữ nguyên 100% logic: timer, audio player, tools, notes, real/practice mode.

// ─── CONFIG từ localStorage ───────────────────────────────────────────────────
const examSection = localStorage.getItem('currentExamSection') || 'full';
const examId      = parseInt(localStorage.getItem('currentExamId') || '1', 10);

const SEC_CFG = {
    1:{from:1, to:10, label:'Section 1', time:8*60},
    2:{from:11,to:20, label:'Section 2', time:8*60},
    3:{from:21,to:30, label:'Section 3', time:8*60},
    4:{from:31,to:40, label:'Section 4', time:8*60},
};
const isSingle  = examSection !== 'full';
const singleSec = isSingle ? parseInt(examSection) : null;

let examData = null;
let KEY      = {};
let TOTAL    = isSingle ? 10 : 40;
let timeLeft = isSingle ? SEC_CFG[singleSec].time : 30*60;

let ans = {}, timerInt, activeTool = null, noteVisible = false, notes = [];

// Audio
const SEC_AUDIO = {1:{start:0,end:480},2:{start:480,end:960},3:{start:960,end:1440},4:{start:1440,end:1800}};
const AUDIO_START = isSingle ? SEC_AUDIO[singleSec].start : 0;
const AUDIO_END   = isSingle ? SEC_AUDIO[singleSec].end   : 1800;
let audioTime=AUDIO_START, audioPlaying=false, audioInterval=null;
const SPEEDS=[0.75,1,1.25,1.5,2]; let speedIdx=1;

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    updateAudioTotalTime();
    await loadExam();
});

async function loadExam() {
    try {
        const res = await fetch(`data/exam-listening-${examId}.json`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        examData = await res.json();
    } catch (err) {
        document.getElementById('qScroll').innerHTML =
            '<p style="padding:30px;color:#ef4444;">Không thể tải đề thi. Vui lòng thử lại.</p>';
        console.error(err);
        return;
    }

    buildKey();
    TOTAL    = isSingle ? (SEC_CFG[singleSec].to - SEC_CFG[singleSec].from + 1) : 40;
    timeLeft = isSingle ? SEC_CFG[singleSec].time : 30*60;

    renderQuestions();

    // Update audio source nếu có
    updateAudioSrc();

    // UI
    const title = localStorage.getItem('currentExamTitle') ||
        (isSingle ? `${examData.exam?.title} – ${SEC_CFG[singleSec].label}` : (examData.exam?.title || 'Listening Test'));
    document.getElementById('examTitle').textContent = title;

    const minStr = isSingle ? '8 phút' : '30 phút';
    const snInfo = document.querySelector('.sn-info');
    if (snInfo) snInfo.innerHTML = `Đề: <strong>${title}</strong> &nbsp;|&nbsp; ${TOTAL} câu &nbsp;|&nbsp; ${minStr}`;

    const h=Math.floor(timeLeft/3600), m=Math.floor((timeLeft%3600)/60), s=timeLeft%60;
    document.getElementById('timer').textContent = pad(h)+':'+pad(m)+':'+pad(s);

    const mTotalEl=document.getElementById('mTotal'); if(mTotalEl) mTotalEl.textContent=TOTAL;
    const mUEl=document.getElementById('mU');         if(mUEl) mUEl.textContent=TOTAL;

    const examMode = localStorage.getItem('currentExamMode') || 'practice';
    if (examMode === 'real') {
        initRealMode();
    } else {
        buildNav();
        startTimer();
    }

    document.getElementById('qScroll').addEventListener('mouseup', onSel);
    document.addEventListener('keydown', onKey);
}

// ─── ANSWER KEY ───────────────────────────────────────────────────────────────
function buildKey() {
    KEY = {};
    const fromQ = isSingle ? SEC_CFG[singleSec].from : 1;
    const toQ   = isSingle ? SEC_CFG[singleSec].to   : 40;
    (examData.sections || []).forEach(sec => {
        (sec.groups || []).forEach(g => {
            (g.questions || []).forEach(q => {
                if (q.questionNumber >= fromQ && q.questionNumber <= toQ)
                    KEY[q.questionNumber] = q.correctAnswer;
            });
        });
    });
}

// ─── RENDER QUESTIONS ────────────────────────────────────────────────────────
function renderQuestions() {
    const qScroll = document.getElementById('qScroll');
    qScroll.innerHTML = '';

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
    const display = g.displayType || '';
    let html = `<div class="qsh">
      <div class="qsh-title">${eh(g.groupTitle||'')}</div>
      <div class="qsh-inst">${eh(g.instruction||'')}</div>
    </div>`;

    switch(display) {
        case 'MULTIPLE_CHOICE':
            (g.questions||[]).forEach(q=>{ html+=renderQItem(q); });
            break;

        case 'FILL_BLOCK':
            html += `<div class="fill-block">`;
            if(g.blockTitle) html += `<div class="fill-title">${eh(g.blockTitle)}</div>`;
            (g.questions||[]).forEach(q=>{ html+=renderFillLine(q); });
            html += `</div>`;
            break;

        default:
            (g.questions||[]).forEach(q=>{ html+=renderFillLine(q); });
    }
    return html;
}

function renderQItem(q) {
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
    const qn=q.questionNumber, w=q.inputWidth||100;
    const tpl=q.lineTemplate||'___';
    const inputHtml=`<span id="b${qn}" class="fb">${qn}</span> <input class="finp" id="q${qn}" placeholder="……" style="width:${w}px;" oninput="pa(${qn},this.value)">`;
    return `<div class="fill-line">${tpl.replace('___',inputHtml)}</div>`;
}

// ─── AUDIO PLAYER ────────────────────────────────────────────────────────────
function updateAudioTotalTime() {
    const dur=AUDIO_END-AUDIO_START;
    const totEl=document.getElementById('totTime');
    if(totEl) totEl.textContent=Math.floor(dur/60)+':'+pad(dur%60);
}
function updateAudioSrc() {
    // Nếu exam JSON có audioUrl cho từng section, cập nhật <audio> nếu có
    // Hiện tại UI dùng simulated audio nên không cần làm gì thêm
}
function togglePlay(){
    audioPlaying=!audioPlaying;
    const icon=document.getElementById('playIcon');
    icon.className=audioPlaying?'bi bi-pause-fill':'bi bi-play-fill';
    if(audioPlaying){
        audioInterval=setInterval(()=>{
            audioTime+=SPEEDS[speedIdx];
            if(audioTime>=AUDIO_END){audioTime=AUDIO_END;clearInterval(audioInterval);audioPlaying=false;document.getElementById('playIcon').className='bi bi-play-fill';}
            updateAudioUI();
            if(!isSingle) syncSectionLabel();
        },1000);
    } else { clearInterval(audioInterval); }
}
function skipAudio(delta){audioTime=Math.max(AUDIO_START,Math.min(AUDIO_END,audioTime+delta));updateAudioUI();}
function seekAudio(e){
    const bar=document.getElementById('progBar');
    const rect=bar.getBoundingClientRect();
    const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    audioTime=Math.round(AUDIO_START+pct*(AUDIO_END-AUDIO_START));
    updateAudioUI(); if(!isSingle) syncSectionLabel();
}
function updateAudioUI(){
    const elapsed=audioTime-AUDIO_START, duration=AUDIO_END-AUDIO_START;
    const pct=(elapsed/duration)*100;
    document.getElementById('progFill').style.width=pct+'%';
    document.getElementById('progDot').style.left=pct+'%';
    const m=Math.floor(elapsed/60),s=Math.floor(elapsed)%60;
    document.getElementById('curTime').textContent=m+':'+pad(s);
}
function syncSectionLabel(){
    const sec=Math.min(4,Math.floor(audioTime/450)+1);
    [1,2,3,4].forEach(s=>{const box=document.getElementById('secbox'+s);if(box)box.classList.toggle('secbox-playing',s===sec);});
}
function cycleSpeed(){speedIdx=(speedIdx+1)%SPEEDS.length;document.getElementById('speedBtn').textContent=SPEEDS[speedIdx]+'×';}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer(){
    timerInt=setInterval(()=>{
        timeLeft--;
        const h=Math.floor(timeLeft/3600),m=Math.floor((timeLeft%3600)/60),s=timeLeft%60;
        document.getElementById('timer').textContent=pad(h)+':'+pad(m)+':'+pad(s);
        if(timeLeft<=300) document.getElementById('timerPill').classList.add('timer-warn');
        if(timeLeft<=0){clearInterval(timerInt);submitTest();}
    },1000);
}
const pad=n=>String(n).padStart(2,'0');

// ─── ANSWER ───────────────────────────────────────────────────────────────────
function pa(q,v){
    ans[q]=v;
    const el=document.getElementById('qi'+q);
    if(el){el.classList.toggle('done',!!v);const b=el.querySelector('.qbadge');if(b)b.style.background=v?'var(--success)':'var(--primary)';}
    const fb=document.getElementById('b'+q); if(fb)fb.classList.toggle('done',!!v);
    const nb=document.getElementById('nb'+q); if(nb){nb.classList.toggle('done',!!v);if(v)nb.classList.remove('cur');}
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
    const nb=document.getElementById('nb'+q);if(nb&&!nb.classList.contains('done'))nb.classList.add('cur');
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
    else if(activeTool==='nt'){doHL(sel,'hl-n');addNote(txt);sel.removeAllRanges();}
}
function doHL(sel,cls){
    try{const r=sel.getRangeAt(0),sp=document.createElement('span');sp.className=cls;r.surroundContents(sp);}
    catch(e){try{const r=sel.getRangeAt(0),f=r.extractContents(),sp=document.createElement('span');sp.className=cls;sp.appendChild(f);r.insertNode(sp);}catch(e2){}}
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function addNote(txt){notes.push({id:Date.now(),txt,note:''});renderNotes();if(!noteVisible)toggleNote();}
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
function confirmSub(){
    clearInterval(timerInt);clearInterval(audioInterval);
    let ok=0;
    for(const[q,a] of Object.entries(KEY)){
        const userAns=(ans[q]||'').trim().toLowerCase();
        const correct=String(a).toLowerCase();
        if(correct.includes('/')){if(correct.split('/').some(x=>x.trim()===userAns))ok++;}
        else{if(userAns===correct)ok++;}
    }
    bootstrap.Modal.getInstance(document.getElementById('subModal')).hide();
    setTimeout(()=>alert(`Nộp bài thành công!\nĐúng: ${ok}/${TOTAL} câu`),300);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const eh=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');