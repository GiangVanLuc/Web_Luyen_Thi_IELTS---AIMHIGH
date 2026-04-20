// ===== PRACTICE.JS =====
// Render danh sách đề thi từ API /api/exams
// Fix: sidebar radio chỉ highlight đúng phần đang chọn

let currentSubject = null;
let selectedMode   = 'practice';
let selectedExerciseTitle = '';
let selectedExamId  = null;
let selectedExamSkill = null;
let selectedCardType = null;
let selectedCardPart = null;
let modeModal;
let applyFilterFunc;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const skillFromUrl = urlParams.get('skill');
    if (['listening', 'reading', 'writing', 'speaking'].includes(skillFromUrl)) {
        currentSubject = skillFromUrl;
    }

    initPracticeFilters();

    const modalEl = document.getElementById('modeSelectModal');
    if (modalEl) modeModal = new bootstrap.Modal(modalEl);

    fetchExams();
    setupNoReloadNavbar();
    setTimeout(scrollToActiveSubject, 100);
});

// ─── FETCH & RENDER CARDS ─────────────────────────────────────────────────────

async function fetchExams() {
    const grid = document.getElementById('readingCardGrid');
    grid.innerHTML = '<p style="padding:20px;color:#888;">Đang tải đề thi…</p>';

    let exams;
    try {
        const body = await getExamList();
        exams = body.data || body;  // Hỗ trợ cả DataResponse wrapper
    } catch (err) {
        const hint = String(err.message || '').includes('401')
            ? 'Bạn chưa đăng nhập hoặc token đã hết hạn.'
            : 'Hãy kiểm tra Backend đang chạy.';
        grid.innerHTML = `<p style="padding:20px;color:#ef4444;">Không thể tải danh sách đề thi. ${hint}</p>`;
        console.error('Lỗi tải đề thi:', err);
        if (applyFilterFunc) applyFilterFunc();
        return;
    }

    // Đảm bảo exams là mảng
    if (!Array.isArray(exams)) {
        grid.innerHTML = '<p style="padding:20px;color:#ef4444;">Chưa có đề thi nào. Hãy upload đề qua Admin API.</p>';
        return;
    }

    grid.innerHTML = '';
    exams.forEach(exam => renderExamCard(exam, grid));

    if (applyFilterFunc) applyFilterFunc();
    setTimeout(scrollToActiveSubject, 50);
}

/**
 * Render 1 card đề thi vào grid.
 * Full đề  → 1 card data-type="full"
 * Từng section → N card data-type="single" data-part="{sectionNumber}"
 */
function renderExamCard(exam, grid) {
    const skill  = (exam.skill || 'reading').toLowerCase();
    const thumb  = resolveExamThumbnail(exam, skill);
    const badgeTxt = exam.sourceName || exam.title;
    const totalQ = exam.totalQuestions || 40;
    const dur    = exam.duration || 60;

    // ── Full đề ──────────────────────────────────────────────────────
    const fullCard = document.createElement('article');
    fullCard.className = 'exercise-card';
    fullCard.dataset.subject = skill;
    fullCard.dataset.type    = 'full';
    fullCard.dataset.part    = 'full';
    fullCard.dataset.examId  = exam.id;
    fullCard.onclick = () => openModeModal(exam.title, exam.id, {
        skill,
        type: 'full',
        part: 'full'
    });
    fullCard.innerHTML = `
      <div class="thumb-wrap">
        <img src="${thumb}" alt="${exam.title}" onerror="this.src='https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900'">
        <span class="exercise-badge">${eh(badgeTxt)}</span>
        <span class="passage-chip" style="background:#059669;">Full đề</span>
      </div>
      <div class="exercise-card-body">
        <div class="exercise-title">${eh(exam.title)}</div>
        <ul class="exercise-meta">
          <li>${totalQ} câu &nbsp;·&nbsp; ${dur} phút</li>
        </ul>
      </div>`;
    grid.appendChild(fullCard);

    // ── Từng section ─────────────────────────────────────────────────
    if (exam.sections && exam.sections.length) {
        const CHIP_COLORS = ['#d4a017','#8b5cf6','#0ea5e9','#ef4444'];
        exam.sections.forEach((sec, idx) => {
            const secLabel = sec.label || (skill === 'reading' ? `Passage ${sec.sectionNumber}` : `Section ${sec.sectionNumber}`);
            const sectionThumb = resolveSectionThumbnail(sec, exam, skill);
            const card = document.createElement('article');
            card.className = 'exercise-card';
            card.dataset.subject = skill;
            card.dataset.type    = 'single';
            card.dataset.part    = String(sec.sectionNumber);
            card.dataset.examId  = exam.id;
            card.onclick = () => openModeModal(
                `${exam.title} – ${secLabel}`,
                exam.id,
                {
                    skill,
                    type: 'single',
                    part: String(sec.sectionNumber || '')
                }
            );
            card.innerHTML = `
              <div class="thumb-wrap">
                                <img src="${sectionThumb}" alt="${secLabel}" onerror="this.src='${fallbackThumbBySkill(skill)}'">
                <span class="exercise-badge">${eh(badgeTxt)}</span>
                <span class="passage-chip" style="background:${CHIP_COLORS[idx % CHIP_COLORS.length]};">${eh(secLabel)}</span>
              </div>
              <div class="exercise-card-body">
                <div class="exercise-title">${eh(exam.title)} – ${eh(secLabel)}</div>
                <ul class="exercise-meta">
                  <li>${eh(sec.description || '')}</li>
                  <li>Q${sec.questionFrom || '?'}–Q${sec.questionTo || '?'}</li>
                </ul>
              </div>`;
            grid.appendChild(card);
        });
    }
}

function fallbackThumbBySkill(skill) {
    if (skill === 'listening') return 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=900';
    if (skill === 'writing') return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900';
    if (skill === 'speaking') return 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=900';
    return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900';
}

function resolveExamThumbnail(exam, skill) {
    return (
        exam.thumbnailUrl
        || exam.thumbnail
        || exam.coverImage
        || exam.imageUrl
        || exam.image
        || fallbackThumbBySkill(skill)
    );
}

function resolveSectionThumbnail(section, exam, skill) {
    return (
        section?.thumbnailUrl
        || section?.thumbnail
        || section?.coverImage
        || section?.imageUrl
        || section?.image
        || resolveExamThumbnail(exam, skill)
    );
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────

function initPracticeFilters() {
    const subjects = [
        { key: 'reading',   typeName: 'readingType',   partName: 'readingPassage', partWrapId: 'readingPassageWrap' },
        { key: 'listening', typeName: 'listeningType', partName: 'listeningPart',  partWrapId: 'listeningPartWrap' },
        { key: 'writing',   typeName: 'writingType',   partName: 'writingPart',    partWrapId: 'writingPartWrap' },
        { key: 'speaking',  typeName: 'speakingType',  partName: 'speakingPart',   partWrapId: 'speakingPartWrap' },
    ];

    applyFilterFunc = () => {
        // Active box bên sidebar — chỉ mở box đang active
        document.querySelectorAll('[data-subject-box]').forEach(box => {
            const isActive = !!currentSubject && box.dataset.subjectBox === currentSubject;
            box.classList.toggle('active', isActive);
            // Ẩn body của box không active
            const body = box.querySelector('.subject-body');
            if (body) body.style.display = isActive ? '' : 'none';
        });

        const cards = document.querySelectorAll('.exercise-card');
        if (!cards.length) {
            return;
        }

        if (!currentSubject) {
            cards.forEach(card => {
                card.style.display = '';
            });
            return;
        }

        // Ẩn/hiện sub-options (bài lẻ vs full) cho subject đang active
        subjects.forEach(s => {
            const wrap = document.getElementById(s.partWrapId);
            if (!wrap) return;
            if (s.key !== currentSubject) {
                wrap.style.display = 'none';
                return;
            }
            const type = document.querySelector(`input[name="${s.typeName}"]:checked`)?.value || 'single';
            wrap.style.display = type === 'single' ? '' : 'none';
        });

        // Đọc filter đang active
        const activeConfig   = subjects.find(s => s.key === currentSubject) || subjects[0];
        const selectedType   = document.querySelector(`input[name="${activeConfig.typeName}"]:checked`)?.value || 'single';
        const selectedPart   = document.querySelector(`input[name="${activeConfig.partName}"]:checked`)?.value || '1';

        // Lọc cards
        cards.forEach(card => {
            const match =
                card.dataset.subject === currentSubject &&
                (selectedType === 'full'
                    ? card.dataset.type === 'full'
                    : card.dataset.type === 'single' && card.dataset.part === selectedPart);
            card.style.display = match ? '' : 'none';
        });
    };

    // Listeners — khi chọn radio trong 1 subject, tự set currentSubject
    subjects.forEach(s => {
        // Type radio (Bài lẻ / Full đề)
        document.querySelectorAll(`input[name="${s.typeName}"]`).forEach(r =>
            r.addEventListener('change', () => {
                currentSubject = s.key;
                applyFilterFunc();
            }));
        // Part/Section/Passage radio
        document.querySelectorAll(`input[name="${s.partName}"]`).forEach(r =>
            r.addEventListener('change', () => {
                currentSubject = s.key;
                // Khi chọn section cụ thể → tự check "Bài lẻ"
                const singleRadio = document.getElementById(
                    s.key === 'reading' ? 'readingSingle' :
                    s.key === 'listening' ? 'listeningSingle' :
                    s.key === 'writing' ? 'writingSingle' : 'speakingSingle'
                );
                if (singleRadio) singleRadio.checked = true;
                applyFilterFunc();
            }));
    });

    // Click vào subject-box header
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
    if (!currentSubject) {
        return;
    }
    const activeBox = document.querySelector(`.subject-box[data-subject-box="${currentSubject}"]`);
    const sidebar   = document.querySelector('.reading-filter');
    if (activeBox && sidebar)
        sidebar.scrollTo({ top: activeBox.offsetTop - sidebar.offsetTop - 20, behavior: 'smooth' });
}

// ─── MODAL & CHUYỂN TRANG ─────────────────────────────────────────────────────

function openModeModal(title, examId, options = {}) {
    selectedExerciseTitle = title;
    selectedExamId        = examId;
    selectedExamSkill     = options.skill || null;
    selectedCardType      = options.type || null;
    selectedCardPart      = options.part || null;
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
    localStorage.setItem('currentExamId',    selectedExamId);

    const subject = selectedExamSkill || currentSubject || 'reading';
    localStorage.setItem('currentExamSkill', subject);

    if (subject === 'reading') {
        const selectedType = selectedCardType
            || document.querySelector('input[name="readingType"]:checked')?.value
            || 'single';
        const selectedPassage = selectedCardPart
            || document.querySelector('input[name="readingPassage"]:checked')?.value
            || '1';
        const section = selectedType === 'full' ? 'full' : selectedPassage;
        localStorage.setItem('currentExamSection', section);

        const params = new URLSearchParams({
            examId: String(selectedExamId),
            section,
            mode: selectedMode,
            title: selectedExerciseTitle
        });
        window.location.href = `reading.html?${params.toString()}`;

    } else if (subject === 'listening') {
        const selectedType = selectedCardType
            || document.querySelector('input[name="listeningType"]:checked')?.value
            || 'full';
        const selectedSection = selectedCardPart
            || document.querySelector('input[name="listeningPart"]:checked')?.value
            || '1';
        const section = selectedType === 'full' ? 'full' : selectedSection;
        localStorage.setItem('currentExamSection', section);

        const params = new URLSearchParams({
            examId: String(selectedExamId),
            section,
            mode: selectedMode,
            title: selectedExerciseTitle
        });
        window.location.href = `listening.html?${params.toString()}`;

    } else if (subject === 'writing') {
        window.location.href = 'writing.html';
    } else {
        window.location.href = 'speaking.html';
    }
}

// ─── SIDEBAR TOGGLE & TAB SWITCH ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const wrap      = document.getElementById('practiceWrap');
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
