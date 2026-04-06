// ===== PRACTICE.JS =====
// Render danh sách đề thi từ API /api/exams
// Giữ nguyên toàn bộ logic filter/sidebar/modal

let currentSubject = 'listening';
let selectedMode   = 'practice';
let selectedExerciseTitle = '';
let selectedExamId  = null;     // ID đề được chọn (từ API)
let modeModal;

// Lưu hàm filter để gọi lại sau khi fetch xong
let applyFilterFunc;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Đọc skill từ URL
    const urlParams   = new URLSearchParams(window.location.search);
    const skillFromUrl = urlParams.get('skill');
    if (skillFromUrl) currentSubject = skillFromUrl;

    // 2. Bootstrap modal
    const modalEl = document.getElementById('modeSelectModal');
    if (modalEl) modeModal = new bootstrap.Modal(modalEl);

    // 3. Fetch danh sách đề từ API rồi mới init filter
    fetchExams();

    // 4. Kỹ thuật không F5 cho navbar
    setupNoReloadNavbar();

    // 5. Cuộn sidebar
    setTimeout(scrollToActiveSubject, 100);
});

// ─── FETCH & RENDER CARDS ─────────────────────────────────────────────────────

async function fetchExams() {
    const grid = document.getElementById('readingCardGrid');
    grid.innerHTML = '<p style="padding:20px;color:#888;">Đang tải đề thi…</p>';

    let exams;
    try {
        const res = await fetch('data/exams.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        exams = await res.json();
    } catch (err) {
        grid.innerHTML = '<p style="padding:20px;color:#ef4444;">Không thể tải danh sách đề thi.</p>';
        console.error(err);
        return;
    }

    grid.innerHTML = '';
    exams.forEach(exam => renderExamCard(exam, grid));

    // Sau khi render xong mới khởi tạo filter
    initPracticeFilters();
    setTimeout(scrollToActiveSubject, 50);
}

/**
 * Render 1 card đề thi vào grid.
 * Full đề  → 1 card data-type="full"
 * Từng section → N card data-type="single" data-part="{sectionNumber}"
 */
function renderExamCard(exam, grid) {
    const skill  = exam.skill.toLowerCase();   // 'reading' | 'listening' | ...
    const thumb  = exam.thumbnail || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900';
    const badgeTxt = exam.sourceName || exam.title;

    // ── Full đề ──────────────────────────────────────────────────────
    const fullCard = document.createElement('article');
    fullCard.className = 'exercise-card';
    fullCard.dataset.subject = skill;
    fullCard.dataset.type    = 'full';
    fullCard.dataset.part    = 'full';
    fullCard.dataset.examId  = exam.id;
    fullCard.onclick = () => openModeModal(exam.title, exam.id);
    fullCard.innerHTML = `
      <div class="thumb-wrap">
        <img src="${thumb}" alt="${exam.title}" onerror="this.src='https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900'">
        <span class="exercise-badge">${eh(badgeTxt)}</span>
        <span class="passage-chip" style="background:#059669;">Full đề</span>
      </div>
      <div class="exercise-card-body">
        <div class="exercise-title">${eh(exam.title)}</div>
        <ul class="exercise-meta">
          <li>${exam.totalQuestions} câu &nbsp;·&nbsp; ${exam.duration} phút</li>
        </ul>
      </div>`;
    grid.appendChild(fullCard);

    // ── Từng section ─────────────────────────────────────────────────
    if (exam.sections && exam.sections.length) {
        const CHIP_COLORS = ['#d4a017','#8b5cf6','#0ea5e9','#ef4444'];
        exam.sections.forEach((sec, idx) => {
            const card = document.createElement('article');
            card.className = 'exercise-card';
            card.dataset.subject = skill;
            card.dataset.type    = 'single';
            card.dataset.part    = String(sec.sectionNumber);
            card.dataset.examId  = exam.id;
            card.onclick = () => openModeModal(
                `${exam.sourceName} – ${sec.label}`,
                exam.id
            );
            card.innerHTML = `
              <div class="thumb-wrap">
                <img src="${thumb}" alt="${sec.label}" onerror="this.src='https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900'">
                <span class="exercise-badge">${eh(badgeTxt)}</span>
                <span class="passage-chip" style="background:${CHIP_COLORS[idx % CHIP_COLORS.length]};">${eh(sec.label)}</span>
              </div>
              <div class="exercise-card-body">
                <div class="exercise-title">${eh(exam.sourceName)} – ${eh(sec.label)}</div>
                <ul class="exercise-meta">
                  <li>${eh(sec.description || '')}</li>
                  <li>Q${sec.questionFrom}–Q${sec.questionTo}</li>
                </ul>
              </div>`;
            grid.appendChild(card);
        });
    }
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────

function initPracticeFilters() {
    const cards = document.querySelectorAll('.exercise-card');
    if (!cards.length) return;

    const subjects = [
        { key: 'reading',  typeName: 'readingType',  partName: 'readingPassage', partWrapId: 'readingPassageWrap' },
        { key: 'listening',typeName: 'listeningType', partName: 'listeningPart',  partWrapId: 'listeningPartWrap' },
        { key: 'writing',  typeName: 'writingType',   partName: 'writingPart',    partWrapId: 'writingPartWrap' },
        { key: 'speaking', typeName: 'speakingType',  partName: 'speakingPart',   partWrapId: 'speakingPartWrap' },
    ];

    applyFilterFunc = () => {
        // Active box bên sidebar
        document.querySelectorAll('[data-subject-box]').forEach(box => {
            box.classList.toggle('active', box.dataset.subjectBox === currentSubject);
        });

        
        // Bỏ check các nút của những skill bề mặt không được chọn
        document.querySelectorAll('.subject-box input[type="radio"]').forEach(radio => {
            if (!radio.closest(`[data-subject-box="${currentSubject}"]`)) {
                radio.checked = false;
            }
        });
        
        // Đảm bảo skill hiện tại luôn có 1 tuỳ chọn đc check
        const activeBox = document.querySelector(`[data-subject-box="${currentSubject}"]`);
        if (activeBox) {
            const types = activeBox.querySelectorAll(`input[value="single"], input[value="full"]`);
            if (types.length && !Array.from(types).some(r => r.checked)) types[0].checked = true;
            
            const parts = activeBox.querySelectorAll(`.subject-children input[type="radio"]`);
            if (parts.length && !Array.from(parts).some(r => r.checked)) parts[0].checked = true;
        }

        // Ẩn/hiện sub-options (bài lẻ vs full)

        subjects.forEach(s => {
            const wrap = document.getElementById(s.partWrapId);
            const type = document.querySelector(`input[name="${s.typeName}"]:checked`)?.value || 'single';
            if (wrap) wrap.style.display = type === 'single' ? '' : 'none';
        });

        // Đọc filter đang active
        const activeConfig   = subjects.find(s => s.key === currentSubject) || subjects[0];
        const selectedType   = document.querySelector(`input[name="${activeConfig.typeName}"]:checked`)?.value || 'single';
        const selectedPart   = document.querySelector(`input[name="${activeConfig.partName}"]:checked`)?.value || '1';

        // Lọc cards
        document.querySelectorAll('.exercise-card').forEach(card => {
            const match =
                card.dataset.subject === currentSubject &&
                (selectedType === 'full'
                    ? card.dataset.type === 'full'
                    : card.dataset.type === 'single' && card.dataset.part === selectedPart);
            card.style.display = match ? '' : 'none';
        });
    };

    // Listeners
    subjects.forEach(s => {
        document.querySelectorAll(`input[name="${s.typeName}"]`).forEach(r =>
            r.addEventListener('change', () => { currentSubject = s.key; applyFilterFunc(); }));
        document.querySelectorAll(`input[name="${s.partName}"]`).forEach(r =>
            r.addEventListener('change', () => { currentSubject = s.key; applyFilterFunc(); }));
    });

    document.querySelectorAll('[data-subject-box]').forEach(box => {
        box.addEventListener('click', e => {
            if (['INPUT','LABEL'].includes(e.target.tagName.toUpperCase())) return;
            currentSubject = box.dataset.subjectBox;
            window.history.pushState({}, '', `practice.html?skill=${currentSubject}`);
            applyFilterFunc();
            scrollToActiveSubject();
        });
    });

    applyFilterFunc();
}

// ─── SIDEBAR / SCROLLING ──────────────────────────────────────────────────────

function setupNoReloadNavbar() {
    document.querySelectorAll('.navbar .dropdown-item').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (href && href.includes('practice.html?skill=')) {
                e.preventDefault();
                const skill = href.split('?skill=')[1];
                window.history.pushState({}, '', href);
                currentSubject = skill;
                if (applyFilterFunc) applyFilterFunc();
                scrollToActiveSubject();
            }
        });
    });
}

function scrollToActiveSubject() {
    const activeBox = document.querySelector(`.subject-box[data-subject-box="${currentSubject}"]`);
    const sidebar   = document.querySelector('.reading-filter');
    if (activeBox && sidebar)
        sidebar.scrollTo({ top: activeBox.offsetTop - sidebar.offsetTop - 20, behavior: 'smooth' });
}

// ─── MODAL & CHUYỂN TRANG ─────────────────────────────────────────────────────

function openModeModal(title, examId) {
    selectedExerciseTitle = title;
    selectedExamId        = examId;
    const titleEl = document.getElementById('modeModalTitle');
    if (titleEl) titleEl.textContent = title;
    selectModeOption('practice');
    if (modeModal) modeModal.show();
}

function selectModeOption(mode) {
    selectedMode = mode;
    document.querySelectorAll('.mode-option').forEach(el =>
        el.classList.toggle('active', el.dataset.mode === mode));
}

function startActualTest() {
    localStorage.setItem('currentExamTitle', selectedExerciseTitle);
    localStorage.setItem('currentExamMode',  selectedMode);
    localStorage.setItem('currentExamId',    selectedExamId);   // ← lưu ID để trang thi fetch

    if (currentSubject === 'reading') {
        const selectedType    = document.querySelector('input[name="readingType"]:checked')?.value || 'single';
        const selectedPassage = document.querySelector('input[name="readingPassage"]:checked')?.value || '1';
        localStorage.setItem('currentExamSection', selectedType === 'full' ? 'full' : selectedPassage);
        window.location.href = 'reading.html';

    } else if (currentSubject === 'listening') {
        const selectedType    = document.querySelector('input[name="listeningType"]:checked')?.value || 'full';
        const selectedSection = document.querySelector('input[name="listeningPart"]:checked')?.value || '1';
        localStorage.setItem('currentExamSection', selectedType === 'full' ? 'full' : selectedSection);
        window.location.href = 'listening.html';

    } else if (currentSubject === 'writing') {
        window.location.href = 'writing.html';
    } else {
        window.location.href = 'speaking.html';
    }
}

// ─── SIDEBAR TOGGLE & TAB SWITCH ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const wrap    = document.getElementById('practiceWrap');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn && wrap)
        toggleBtn.addEventListener('click', () => wrap.classList.toggle('sidebar-hidden'));

    const tabChuaLam = document.getElementById('tabChuaLam');
    const tabDaLam   = document.getElementById('tabDaLam');
    const grid       = document.getElementById('readingCardGrid');
    const emptyState = document.getElementById('emptyState');

    if (tabChuaLam && tabDaLam) {
        tabChuaLam.addEventListener('click', () => {
            tabChuaLam.classList.add('active');
            tabDaLam.classList.remove('active');
            grid.style.display      = 'grid';
            emptyState.style.display = 'none';
        });
        tabDaLam.addEventListener('click', () => {
            tabDaLam.classList.add('active');
            tabChuaLam.classList.remove('active');
            grid.style.display      = 'none';
            emptyState.style.display = 'block';
        });
    }
});

// ─── UTILS ───────────────────────────────────────────────────────────────────
const eh = s => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');