// ===== PRACTICE.JS - Xử lý bộ lọc và chọn đề thi =====

let currentSubject = 'listening'; 
let selectedMode = 'practice';
let selectedExerciseTitle = '';
let modeModal;

// Biến lưu trữ hàm filter để có thể gọi từ bên ngoài
let applyFilterFunc; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. ĐỌC KỸ NĂNG TỪ URL KHI VỪA TỪ TRANG CHỦ SANG
    const urlParams = new URLSearchParams(window.location.search);
    const skillFromUrl = urlParams.get('skill');
    if (skillFromUrl) {
        currentSubject = skillFromUrl;
    }

    // Khởi tạo Modal của Bootstrap
    const modalEl = document.getElementById('modeSelectModal');
    if(modalEl) {
        modeModal = new bootstrap.Modal(modalEl);
    }
    
    // Khởi chạy hệ thống lọc
    initPracticeFilters();

    // 2. KÍCH HOẠT KỸ THUẬT "KHÔNG F5" CHO NAVBAR
    setupNoReloadNavbar();

    // 3. TỰ ĐỘNG CUỘN SIDEBAR XUỐNG KỸ NĂNG ĐƯỢC CHỌN
    setTimeout(scrollToActiveSubject, 100);
});

function initPracticeFilters() {
    const cards = document.querySelectorAll('.exercise-card');
    if (!cards.length) return;

    const subjects = [
        { key: 'reading', typeName: 'readingType', partName: 'readingPassage', partWrapId: 'readingPassageWrap' },
        { key: 'listening', typeName: 'listeningType', partName: 'listeningPart', partWrapId: 'listeningPartWrap' },
        { key: 'writing', typeName: 'writingType', partName: 'writingPart', partWrapId: 'writingPartWrap' },
        { key: 'speaking', typeName: 'speakingType', partName: 'speakingPart', partWrapId: 'speakingPartWrap' }
    ];

    applyFilterFunc = () => {
        // Đổi class active (viền xanh) cho box ở thanh bên trái
        document.querySelectorAll('[data-subject-box]').forEach((box) => {
            box.classList.toggle('active', box.dataset.subjectBox === currentSubject);
        });

        // Ẩn/hiện các lựa chọn (bài lẻ, passage...) bên trong box
        subjects.forEach((subject) => {
            const wrap = document.getElementById(subject.partWrapId);
            const type = document.querySelector(`input[name="${subject.typeName}"]:checked`)?.value || 'single';
            if (wrap) wrap.style.display = type === 'single' ? '' : 'none';
        });

        // Đọc giá trị đang chọn của kỹ năng hiện tại
        const activeConfig = subjects.find((s) => s.key === currentSubject) || subjects[0];
        const selectedType = document.querySelector(`input[name="${activeConfig.typeName}"]:checked`)?.value || 'single';
        const selectedPart = document.querySelector(`input[name="${activeConfig.partName}"]:checked`)?.value || '1';

        // Lọc danh sách đề thi bên phải
        cards.forEach((card) => {
            const subject = card.dataset.subject;
            const type = card.dataset.type;
            const part = card.dataset.part;
            let visible = false;

            if (subject === currentSubject) {
                if (selectedType === 'full') {
                    visible = type === 'full';
                } else {
                    visible = type === 'single' && part === selectedPart;
                }
            }
            card.style.display = visible ? '' : 'none';
        });
    };

    // Lắng nghe thay đổi từ Radio buttons
    subjects.forEach((subject) => {
        document.querySelectorAll(`input[name="${subject.typeName}"]`).forEach((radio) => {
            radio.addEventListener('change', () => { currentSubject = subject.key; applyFilterFunc(); });
        });
        document.querySelectorAll(`input[name="${subject.partName}"]`).forEach((radio) => {
            radio.addEventListener('change', () => { currentSubject = subject.key; applyFilterFunc(); });
        });
    });

    // Lắng nghe khi click thẳng vào cái Box kỹ năng
    document.querySelectorAll('[data-subject-box]').forEach((box) => {
        box.addEventListener('click', (e) => {
            // Không kích hoạt nếu bấm nhầm vào nút radio hoặc chữ
            if(e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'label') return;

            currentSubject = box.dataset.subjectBox;
            
            // Đổi URL ảo trên thanh địa chỉ mà không tải lại trang
            window.history.pushState({}, '', `practice.html?skill=${currentSubject}`);
            
            applyFilterFunc();
            scrollToActiveSubject();
        });
    });

    applyFilterFunc();
}

// ================= CÁC KỸ THUẬT NÂNG CAO =================

// Kỹ thuật 1: Bấm Navbar trên trang Practice sẽ KHÔNG BỊ F5
function setupNoReloadNavbar() {
    document.querySelectorAll('.navbar .dropdown-item').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Nếu link chứa '?skill=' thì ta sẽ can thiệp
            if (href && href.includes('practice.html?skill=')) {
                e.preventDefault(); // CHẶN HÀNH VI LOAD LẠI TRANG MẶC ĐỊNH
                
                const skill = href.split('?skill=')[1];

                // Cập nhật đường dẫn URL ảo
                window.history.pushState({}, '', href);

                // Chuyển kỹ năng, lọc lại đề và cuộn sidebar
                currentSubject = skill;
                if (applyFilterFunc) applyFilterFunc();
                scrollToActiveSubject();
            }
        });
    });
}

// Kỹ thuật 2: Tính toán và cuộn Sidebar mượt mà
function scrollToActiveSubject() {
    const activeBox = document.querySelector(`.subject-box[data-subject-box="${currentSubject}"]`);
    const sidebar = document.querySelector('.reading-filter');

    if (activeBox && sidebar) {
        // Tính toán khoảng cách từ box đang chọn đến mép trên của sidebar
        const topPos = activeBox.offsetTop - sidebar.offsetTop;
        
        // Cuộn sidebar xuống vị trí đó một cách mượt mà (smooth)
        sidebar.scrollTo({ top: topPos - 20, behavior: 'smooth' });
    }
}

// ================= MODAL & CHUYỂN TRANG THI =================

function openModeModal(title) {
    selectedExerciseTitle = title;
    const titleEl = document.getElementById('modeModalTitle');
    if (titleEl) titleEl.textContent = title;
    
    selectModeOption('practice'); 
    if(modeModal) modeModal.show();
}

function selectModeOption(mode) {
    selectedMode = mode;
    document.querySelectorAll('.mode-option').forEach((el) => {
        el.classList.toggle('active', el.dataset.mode === mode);
    });
}

function startActualTest() {
    localStorage.setItem('currentExamTitle', selectedExerciseTitle);
    localStorage.setItem('currentExamMode', selectedMode);

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

// ── Sidebar toggle & Tab switch (moved from practice.html inline) ──
document.addEventListener('DOMContentLoaded', () => {
            const wrap = document.getElementById('practiceWrap');
            const hideBtn = document.getElementById('hideSidebarBtn');
            const showBtn = document.getElementById('showSidebarBtn');
            // 1. Script ẩn hiện sidebar
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            if (toggleBtn && wrap) {
                toggleBtn.addEventListener('click', () => {
                    wrap.classList.toggle('sidebar-hidden');
                });
            }

            // 2. Script chuyển đổi Tab Chưa Làm / Đã Làm
            const tabChuaLam = document.getElementById('tabChuaLam');
            const tabDaLam = document.getElementById('tabDaLam');
            const grid = document.getElementById('readingCardGrid');
            const emptyState = document.getElementById('emptyState');

            if (tabChuaLam && tabDaLam) {
                tabChuaLam.addEventListener('click', () => {
                    tabChuaLam.classList.add('active');
                    tabDaLam.classList.remove('active');
                    grid.style.display = 'grid';
                    emptyState.style.display = 'none';
                });

                tabDaLam.addEventListener('click', () => {
                    tabDaLam.classList.add('active');
                    tabChuaLam.classList.remove('active');
                    grid.style.display = 'none';
                    emptyState.style.display = 'block';
                });
            }
        });