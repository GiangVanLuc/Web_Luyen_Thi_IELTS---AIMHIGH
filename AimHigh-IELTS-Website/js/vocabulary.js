// ===== STORAGE KEYS =====
const VOCAB_KEY = 'aimhigh_vocab';
const GROUPS_KEY = 'aimhigh_vocab_groups';
const ACTIVITY_KEY = 'aimhigh_vocab_activity';

function getData() { return JSON.parse(localStorage.getItem(VOCAB_KEY) || '[]'); }
function saveData(d) { localStorage.setItem(VOCAB_KEY, JSON.stringify(d)); }
function getGroups() {
    const g = JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
    if (!g.length) {
        const defaults = ['IELTS Reading', 'Academic Words', 'Collocations', 'Sổ từ vựng'];
        localStorage.setItem(GROUPS_KEY, JSON.stringify(defaults));
        return defaults;
    }
    return g;
}
function saveGroups(g) { localStorage.setItem(GROUPS_KEY, JSON.stringify(g)); }
function getActivity() { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}'); }

// ===== AUTO INIT VOCAB DATA =====
function initData() {
    let initialized = localStorage.getItem('aimhigh_vocab_init');
    if (!initialized) {
        seedPresetVocabularies();
        localStorage.setItem('aimhigh_vocab_init', 'true');
    }
    let customSeeded = localStorage.getItem('aimhigh_custom_seeded');
    if (!customSeeded) {
        seedCustomVocabularies();
        localStorage.setItem('aimhigh_custom_seeded', 'true');
    }
}

function seedCustomVocabularies() {
    const data = getData();
    const groups = getGroups();
    
    if (!groups.includes('Sổ từ vựng')) groups.push('Sổ từ vựng');
    
    const customData = [
        { word: 'acquire', pronunciation: '/əˈkwaɪər/', type: 'verb', meaning: 'đạt được, thu được', formula: 'acquire a skill/knowledge', example: 'He spent years acquiring his skills as a surgeon.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'crucial', pronunciation: '/ˈkruːʃl/', type: 'adj', meaning: 'quan trọng, thiết yếu', formula: 'crucial to/for sth', example: 'Parents play a crucial role in preparing their child for school.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Nhớ sơ sơ' },
        { word: 'determine', pronunciation: '/dɪˈtɜːmɪn/', type: 'verb', meaning: 'xác định, quyết định', formula: 'determine sth', example: 'Your health is determined in part by what you eat.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Đã thuộc' },
        { word: 'encounter', pronunciation: '/ɪnˈkaʊntər/', type: 'verb', meaning: 'bắt gặp, chạm trán', formula: 'encounter problems/difficulties', example: 'We encountered a number of difficulties in the first week.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'fluctuate', pronunciation: '/ˈflʌktʃueɪt/', type: 'verb', meaning: 'dao động, thay đổi', formula: 'fluctuate between A and B', example: 'During the crisis, oil prices fluctuated wildly.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' }
    ];

    customData.map(getDefaultWordObject).forEach(w => {
        const exists = data.find(item => item.word === w.word && item.group === w.group);
        if (!exists) data.push(w);
    });
    
    saveGroups(groups);
    saveData(data);
}

function getDefaultWordObject(w) {
    return {
        word: w.word || '',
        pronunciation: w.pronunciation || '/ˈwɜːrd/',
        type: w.type || 'noun',
        meaning: w.meaning || 'nghĩa của từ',
        details: w.details || 'Chi tiết cách sử dụng...',
        formula: w.formula || 'word + giới từ',
        example: w.example || 'This is an example sentence using the word.',
        group: w.group,
        source: w.source,
        status: w.status || 'Chưa thuộc',
        addedAt: new Date().toISOString()
    };
}

function seedPresetVocabularies() {
    const groups = getGroups();
    const data = getData();
    
    let newGroups = [
        'Basic - Travel', 'Basic - Education', 'Basic - Health', 'Basic - Work', 'Basic - Environment',
        'Adv - Tech', 'Adv - Society', 'Adv - Art', 'Adv - Economy', 'Adv - Law'
    ];
    
    newGroups.forEach(g => {
        if (!groups.includes(g)) groups.push(g);
    });

    const basicData = [
        { word: 'luggage', pronunciation: '/ˈlʌɡɪdʒ/', type: 'noun', meaning: 'hành lý', details: 'Hành lý của một người mang theo khi đi lại.', formula: 'a piece of luggage', example: 'We bought some new luggage for our trip.', group: 'Basic - Travel', source: 'IELTS Basic' },
        { word: 'destination', pronunciation: '/ˌdɛstɪˈneɪʃn/', type: 'noun', meaning: 'điểm đến', details: 'Nơi mà ai đó đang đi đến hoặc được gửi đến.', formula: 'arrive at/reach a destination', example: 'Spain is a very popular holiday destination.', group: 'Basic - Travel', source: 'IELTS Basic' },
        { word: 'sightseeing', pronunciation: '/ˈsaɪtsiːɪŋ/', type: 'noun', meaning: 'sự tham quan', details: 'Hoạt động đi tham quan các địa điểm nổi tiếng.', formula: 'go sightseeing', example: 'There was no time to go sightseeing in Seattle.', group: 'Basic - Travel', source: 'IELTS Basic' },
        
        { word: 'assignment', pronunciation: '/əˈsaɪnmənt/', type: 'noun', meaning: 'bài tập', details: 'Bài tập được giao ở trường hoặc đại học.', formula: 'complete an assignment', example: 'Students are required to complete all homework assignments.', group: 'Basic - Education', source: 'IELTS Basic' },
        { word: 'curriculum', pronunciation: '/kəˈrɪkjələm/', type: 'noun', meaning: 'chương trình học', details: 'Các môn học được giảng dạy trong một trường học.', formula: 'the school curriculum', example: 'Spanish is in the curriculum.', group: 'Basic - Education', source: 'IELTS Basic' },
        
        { word: 'therapy', pronunciation: '/ˈθerəpi/', type: 'noun', meaning: 'liệu pháp điều trị', details: 'Phương pháp chữa bệnh mà không cần dùng phẫu thuật.', formula: 'undergo therapy', example: 'He is receiving therapy for cancer.', group: 'Basic - Health', source: 'IELTS Basic' },
        { word: 'hygiene', pronunciation: '/ˈhaɪdʒiːn/', type: 'noun', meaning: 'vệ sinh', details: 'Thói quen giữ gìn sạch sẽ để ngăn ngừa bệnh tật.', formula: 'poor/good hygiene', example: 'Many skin diseases can be prevented by good personal hygiene.', group: 'Basic - Health', source: 'IELTS Basic' },

        { word: 'colleague', pronunciation: '/ˈkɒliːɡ/', type: 'noun', meaning: 'đồng nghiệp', details: 'Người làm việc cùng một công ty hoặc tổ chức.', formula: 'a work colleague', example: 'We were friends and colleagues for more than twenty years.', group: 'Basic - Work', source: 'IELTS Basic' },
        { word: 'promotion', pronunciation: '/prəˈməʊʃn/', type: 'noun', meaning: 'sự thăng chức', details: 'Sự đưa ai đó lên vị trí công việc cao hơn.', formula: 'get a promotion', example: 'Her promotion to Sales Manager took everyone by surprise.', group: 'Basic - Work', source: 'IELTS Basic' },

        { word: 'pollution', pronunciation: '/pəˈluːʃn/', type: 'noun', meaning: 'sự ô nhiễm', details: 'Sự làm bẩn môi trường.', formula: 'air/water pollution', example: 'The government has promised to clean up industrial pollution.', group: 'Basic - Environment', source: 'IELTS Basic' },
        { word: 'conservation', pronunciation: '/ˌkɒnsəˈveɪʃn/', type: 'noun', meaning: 'sự bảo tồn', details: 'Sự bảo vệ môi trường tự nhiên và động vật hoang dã.', formula: 'nature/wildlife conservation', example: 'Energy conservation reduces your fuel bills and helps the environment.', group: 'Basic - Environment', source: 'IELTS Basic' }
    ];

    const advancedData = [
        { word: 'breakthrough', pronunciation: '/ˈbreɪkθruː/', type: 'noun', meaning: 'bước đột phá', details: 'Phát hiện quan trọng giải quyết vấn đề lớn.', formula: 'make a breakthrough', example: 'Scientists are hoping for a breakthrough in the search for a cure for cancer.', group: 'Adv - Tech', source: 'IELTS Advanced' },
        { word: 'obsolete', pronunciation: '/ˈɒbsəliːt/', type: 'adj', meaning: 'lỗi thời', details: 'Không còn được sử dụng vì đã có thứ khác mới hơn.', formula: 'become obsolete', example: 'With technological changes many traditional skills have become obsolete.', group: 'Adv - Tech', source: 'IELTS Advanced' },
        
        { word: 'phenomenon', pronunciation: '/fəˈnɒmɪnən/', type: 'noun', meaning: 'hiện tượng', details: 'Sự việc đặc biệt phổ biến trong xã hội.', formula: 'a common/natural phenomenon', example: 'Globalization is a phenomenon of the 21st century.', group: 'Adv - Society', source: 'IELTS Advanced' },
        { word: 'demographic', pronunciation: '/ˌdeməˈɡræfɪk/', type: 'adj', meaning: 'thuộc nhân khẩu học', details: 'Liên quan đến cấu trúc dân số.', formula: 'demographic changes/trends', example: 'The demographic changes will impact the economy heavily.', group: 'Adv - Society', source: 'IELTS Advanced' },

        { word: 'masterpiece', pronunciation: '/ˈmɑːstəpiːs/', type: 'noun', meaning: 'kiệt tác', details: 'Tác phẩm nghệ thuật xuất sắc nhất.', formula: 'create a masterpiece', example: 'The museum houses several of his cubist masterpieces.', group: 'Adv - Art', source: 'IELTS Advanced' },
        
        { word: 'inflation', pronunciation: '/ɪnˈfleɪʃn/', type: 'noun', meaning: 'lạm phát', details: 'Sự tăng giá cả nói chung.', formula: 'high/low inflation', example: 'Inflation is currently running at 3%.', group: 'Adv - Economy', source: 'IELTS Advanced' },
        
        { word: 'legislation', pronunciation: '/ˌledʒɪsˈleɪʃn/', type: 'noun', meaning: 'luật pháp', details: 'Luật được chính phủ thông qua.', formula: 'introduce/pass legislation', example: 'New legislation on the sale of drugs will be introduced next year.', group: 'Adv - Law', source: 'IELTS Advanced' }
    ];

    let newWords = [...basicData, ...advancedData].map(getDefaultWordObject);

    newWords.forEach(w => {
        const exists = data.find(item => item.word === w.word && item.group === w.group);
        if (!exists) data.push(w);
    });

    saveGroups(groups);
    saveData(data);
}

// ===== HEATMAP =====
function renderHeatmap() {
    const activity = getActivity();
    const grid = document.getElementById('heatmapGrid');
    const monthsEl = document.getElementById('heatmapMonths');

    const today = new Date();
    const totalWeeks = 52;
    const totalDays = totalWeeks * 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diff);

    grid.innerHTML = '';
    monthsEl.innerHTML = '';

    let totalActivity = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let todayActivity = 0;

    const allDates = [];
    const currentDate = new Date(startDate);

    let lastMonth = -1;
    for (let w = 0; w < totalWeeks; w++) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'heatmap-week';

        for (let d = 0; d < 7; d++) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const count = activity[dateStr] || 0;
            const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;

            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.setAttribute('data-level', level);

            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip-text';
            const dateDisplay = currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            tooltip.textContent = count + ' hoạt động - ' + dateDisplay;
            cell.appendChild(tooltip);

            if (currentDate <= today) {
                totalActivity += count;
                allDates.push({ date: dateStr, count });

                const todayStr = today.toISOString().slice(0, 10);
                if (dateStr === todayStr) todayActivity = count;
            }

            weekDiv.appendChild(cell);

            if (currentDate.getMonth() !== lastMonth && d === 0) {
                const monthLabel = document.createElement('span');
                monthLabel.className = 'heatmap-month-label';
                monthLabel.textContent = currentDate.toLocaleDateString('vi-VN', { month: 'short' });
                monthLabel.style.marginLeft = (w * 17) + 'px';
                monthLabel.style.position = 'absolute';
                monthsEl.appendChild(monthLabel);
                lastMonth = currentDate.getMonth();
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
        grid.appendChild(weekDiv);
    }

    monthsEl.style.position = 'relative';
    monthsEl.style.height = '18px';

    const sortedDates = allDates.filter(d => new Date(d.date) <= today).sort((a, b) => a.date.localeCompare(b.date));
    tempStreak = 0;
    for (const entry of sortedDates) {
        if (entry.count > 0) {
            tempStreak++;
            if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
    }

    currentStreak = 0;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i].count > 0) currentStreak++;
        else break;
    }

    document.getElementById('heatmapTotal').textContent = totalActivity;
    document.getElementById('heatmapMaxStreak').textContent = maxStreak;
    document.getElementById('streakDays').textContent = currentStreak;
    document.getElementById('todayCount').textContent = todayActivity;
}

// ===== OVERVIEW =====
function renderOverview() {
    const data = getData();
    const groups = getGroups();
    document.getElementById('totalWords').textContent = data.length;
    document.getElementById('totalGroups').textContent = groups.length;
}

// ===== CATEGORY TABS & GROUPS =====
let activeCategoryTab = 'basic';
let activeGroupFilter = '';

function setCategoryTab(tab) {
    activeCategoryTab = tab;
    // Update button styles
    const tabs = document.getElementById('categoryTabs').children;
    tabs[0].className = tab === 'basic' ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm';
    tabs[1].className = tab === 'advanced' ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm';
    tabs[2].className = tab === 'custom' ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm';

    document.getElementById('addGroupContainer').style.display = tab === 'custom' ? 'flex' : 'none';
    document.getElementById('addWordBtn').style.display = tab === 'custom' ? 'inline-block' : 'none';

    // Set first active group
    const groups = getGroups();
    if (tab === 'basic') activeGroupFilter = groups.find(g => g.startsWith('Basic')) || '';
    else if (tab === 'advanced') activeGroupFilter = groups.find(g => g.startsWith('Adv')) || '';
    else activeGroupFilter = 'all_custom';

    renderGroups();
    renderWordTable();
}

function renderGroups() {
    const groups = getGroups();
    const data = getData();
    const container = document.getElementById('groupsContainer');

    const basicGroups = groups.filter(g => g.startsWith('Basic'));
    const advGroups = groups.filter(g => g.startsWith('Adv'));
    const customGroups = groups.filter(g => !basicGroups.includes(g) && !advGroups.includes(g));

    let html = '';
    
    const renderSection = (list, isCustom) => {
        if (!list.length && !isCustom) return '';
        let secHtml = `<div class="group-cards">`;
        
        if (isCustom) {
            const customWordsCount = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv')).length;
            secHtml += `<div class="group-card ${activeGroupFilter === 'all_custom' ? 'active' : ''}" onclick="selectGroup('all_custom')">
                <div class="group-card-header"><h4>Tất cả</h4><span class="group-word-count">${customWordsCount} từ</span></div>
                <p>Sổ từ vựng chung</p>
            </div>`;
        }

        list.forEach(g => {
            if (isCustom && g === 'Tất cả') return;
            const count = data.filter(v => v.group === g).length;
            
            let actionBtns = '';
            if (isCustom) {
               actionBtns = `<div class="ms-2 d-flex align-items-center">
                   <button class="btn btn-sm text-primary p-0" onclick="startRenameGroup(event, '${g.replace(/'/g, "\\'")}')" title="Đổi tên"><i class="bi bi-pencil"></i></button>
                   <button class="btn btn-sm text-danger p-0 ms-2" onclick="deleteGroup(event, '${g.replace(/'/g, "\\'")}')" title="Xóa nhóm"><i class="bi bi-trash"></i></button>
               </div>`;
            }

            secHtml += `<div class="group-card ${activeGroupFilter === g ? 'active' : ''}" onclick="selectGroup('${g.replace(/'/g, "\\'")}')">
                <div class="group-card-header">
                    <div class="d-flex align-items-center"><h4 class="mb-0" style="font-size: 1rem; font-weight: 700;">${g}</h4>${actionBtns}</div>
                    <span class="group-word-count">${count} từ</span>
                </div>
                <p>Nhóm từ vựng</p>
            </div>`;
        });
        secHtml += `</div>`;
        return secHtml;
    };

    if (activeCategoryTab === 'basic') html = renderSection(basicGroups, false);
    else if (activeCategoryTab === 'advanced') html = renderSection(advGroups, false);
    else html = renderSection(customGroups, true);

    container.innerHTML = html;
}

function startRenameGroup(event, oldName) {
    event.stopPropagation();
    const headerDiv = event.currentTarget.closest('.group-card-header').querySelector('h4');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm';
    input.style.width = '140px';
    input.style.display = 'inline-block';
    input.value = oldName;
    
    input.addEventListener('click', e => e.stopPropagation());
    
    headerDiv.innerHTML = '';
    headerDiv.appendChild(input);
    input.focus();
    
    const saveFunc = () => {
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            commitRenameGroup(oldName, newName);
        } else {
            renderGroups();
        }
    };
    
    input.addEventListener('blur', saveFunc);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            renderGroups();
        }
    });
}

function commitRenameGroup(oldName, newName) {
    const groups = getGroups();
    if (groups.includes(newName)) {
        alert("Tên nhóm này đã tồn tại!");
        renderGroups();
        return;
    }

    const idx = groups.indexOf(oldName);
    if (idx !== -1) groups[idx] = newName;
    saveGroups(groups);

    const data = getData();
    data.forEach(w => {
        if (w.group === oldName) w.group = newName;
    });
    saveData(data);

    if (activeGroupFilter === oldName) activeGroupFilter = newName;
    renderOverview();
    renderGroups();
    renderWordTable();
}

function deleteGroup(event, name) {
    event.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa nhóm "${name}" và toàn bộ từ vựng trong nhóm này không?`)) return;
    
    const groups = getGroups();
    const idx = groups.indexOf(name);
    if (idx !== -1) {
        groups.splice(idx, 1);
        saveGroups(groups);
    }
    
    const data = getData();
    const newData = data.filter(w => w.group !== name);
    saveData(newData);
    
    if (activeGroupFilter === name) activeGroupFilter = 'all_custom';
    renderOverview();
    renderGroups();
    renderWordTable();
}

function selectGroup(group) {
    activeGroupFilter = group;
    renderGroups();
    renderWordTable();
}

function addGroupFromPage() {
    const input = document.getElementById('newGroupInput');
    const name = input.value.trim();
    if (!name) return;
    const groups = getGroups();
    if (groups.includes(name)) { alert('Nhóm đã tồn tại!'); return; }
    groups.push(name);
    saveGroups(groups);
    input.value = '';
    activeGroupFilter = name;
    renderOverview();
    renderGroups();
    renderWordTable();
}

// ===== WORD TABLE & MODAL =====
function renderWordTable() {
    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }

    const tbody = document.getElementById('wordTableBody');
    const title = document.getElementById('wordTableTitle');
    const countEl = document.getElementById('wordTableCount');

    let titleText = activeGroupFilter;
    if (activeGroupFilter === 'all_custom') titleText = 'Sổ từ vựng của bạn';

    title.innerHTML = '<i class="bi bi-card-text"></i> ' + titleText;
    countEl.textContent = filtered.length + ' từ';

    const isCustom = activeCategoryTab === 'custom';
    document.getElementById('statusColHeader').style.display = isCustom ? 'table-cell' : 'none';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isCustom ? 8 : 7}" style="text-align:center;color:var(--text-light);padding:32px;">` +
            'Chưa có từ vựng nào.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((v, i) => {
        let statusTd = '';
        if (isCustom) {
            const statusLabel = v.status || 'Chưa thuộc';
            let btnClass = 'status-chua';
            if (statusLabel === 'Nhớ sơ sơ') btnClass = 'status-soso';
            if (statusLabel === 'Đã thuộc') btnClass = 'status-da';
            
            statusTd = `
            <td>
                <div class="dropdown custom-status-dropdown">
                    <button class="btn btn-sm dropdown-toggle status-btn ${btnClass}" type="button" data-bs-toggle="dropdown">
                        ${statusLabel}
                    </button>
                    <ul class="dropdown-menu p-2 shadow-sm" style="min-width: 140px; border-radius: 12px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;">
                        <li><a class="dropdown-item status-opt opt-chua" href="#" onclick="updateWordStatus(event, ${i}, 'Chưa thuộc')">Chưa thuộc</a></li>
                        <li><a class="dropdown-item status-opt opt-soso" href="#" onclick="updateWordStatus(event, ${i}, 'Nhớ sơ sơ')">Nhớ sơ sơ</a></li>
                        <li><a class="dropdown-item status-opt opt-da" href="#" onclick="updateWordStatus(event, ${i}, 'Đã thuộc')">Đã thuộc</a></li>
                    </ul>
                </div>
            </td>`;
        }

        return `<tr>
            <td><input type="checkbox" class="form-check-input" checked></td>
            ${statusTd}
            <td>
                <div class="fw-bold" style="font-size: 1.05rem;">${v.word}</div>
                ${v.pronunciation ? `<div class="text-secondary small mt-1">${v.pronunciation}</div>` : ''}
            </td>
            <td style="color: #64748b;">${v.type || '-'}</td>
            <td>${v.meaning || '-'}</td>
            <td>
                <ul class="mb-0 ps-3 text-muted" style="font-size: 0.875rem;">
                    ${Array.isArray(v.formula) ? v.formula.map(f => `<li>${f}</li>`).join('') : `<li>${v.formula || '-'}</li>`}
                </ul>
            </td>
            <td style="max-width: 280px;">
                <ul class="mb-0 ps-3 text-muted" style="font-size: 0.875rem; line-height: 1.4;">
                    ${Array.isArray(v.example) ? v.example.map(e => `<li>${e}</li>`).join('') : `<li>${v.example || '-'}</li>`}
                </ul>
            </td>
            <td class="word-actions">
                ${activeCategoryTab === 'custom' ? `<button class="btn-delete text-primary" onclick="editWord(${i})" title="Sửa"><i class="bi bi-pencil"></i></button>
                <button class="btn-delete" onclick="deleteWord(${i})" title="Xóa"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function updateWordStatus(event, filteredIndex, newStatus) {
    event.preventDefault();
    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }
    const toUpdate = filtered[filteredIndex];
    if (!toUpdate) return;
    const realIndex = data.findIndex(v => v.word === toUpdate.word && v.group === toUpdate.group);
    if (realIndex !== -1) {
        data[realIndex].status = newStatus;
        saveData(data);
        renderWordTable();
    }
}

// ===== DYNAMIC INPUTS HELPER =====
function renderDynamicInputs(containerId, valuesStrOrArr, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    let values = [];
    if (Array.isArray(valuesStrOrArr)) values = valuesStrOrArr;
    else if (valuesStrOrArr) values = [valuesStrOrArr];
    if (values.length === 0) values = [''];
    
    values.forEach((val, idx) => {
        addDynamicInput(containerId, val, type, idx === values.length - 1);
    });
}

function addDynamicInput(containerId, value, type, isLast) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'mb-2 position-relative';
    
    let btnStyle = "position: absolute; right: 6px; z-index: 10; padding: 4px; border: none; background: transparent;";
    if (type === 'textarea') {
        btnStyle += " top: 6px;";
    } else {
        btnStyle += " top: 50%; transform: translateY(-50%);";
    }
    
    let inputHtml = '';
    if (type === 'textarea') {
        inputHtml = `<textarea class="form-control pe-5" rows="2">${value}</textarea>`;
    } else {
        inputHtml = `<input type="text" class="form-control pe-5" value="${value}">`;
    }
    
    let btnHtml = '';
    if (isLast) {
        btnHtml = `<button type="button" class="btn text-primary shadow-none" style="${btnStyle}" onclick="appendDynamicInput('${containerId}', '${type}')"><i class="bi bi-plus-lg" style="font-size: 1.25rem;"></i></button>`;
    } else {
        btnHtml = `<button type="button" class="btn text-danger shadow-none" style="${btnStyle}" onclick="removeDynamicInput(this)"><i class="bi bi-trash" style="font-size: 1.1rem;"></i></button>`;
    }
    
    div.innerHTML = inputHtml + btnHtml;
    container.appendChild(div);
}

function appendDynamicInput(containerId, type) {
    const container = document.getElementById(containerId);
    const rows = container.children;
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const btn = lastRow.querySelector('button');
        btn.className = 'btn text-danger shadow-none';
        btn.innerHTML = '<i class="bi bi-trash" style="font-size: 1.1rem;"></i>';
        btn.setAttribute('onclick', 'removeDynamicInput(this)');
    }
    addDynamicInput(containerId, '', type, true);
}

function removeDynamicInput(btn) {
    const row = btn.closest('.position-relative');
    const container = row.parentElement;
    row.remove();
    if (container.children.length === 0) {
        const type = container.id.includes('example') ? 'textarea' : 'text';
        addDynamicInput(container.id, '', type, true);
    } else {
        const rows = container.children;
        const lastRow = rows[rows.length - 1];
        const lastBtn = lastRow.querySelector('button');
        const type = lastRow.querySelector('textarea') ? 'textarea' : 'text';
        lastBtn.className = 'btn text-primary shadow-none';
        lastBtn.innerHTML = '<i class="bi bi-plus-lg" style="font-size: 1.25rem;"></i>';
        lastBtn.setAttribute('onclick', `appendDynamicInput('${container.id}', '${type}')`);
    }
}

function getDynamicValues(containerId) {
    const container = document.getElementById(containerId);
    const inputs = container.querySelectorAll('input, textarea');
    const vals = [];
    inputs.forEach(inp => {
        if (inp.value.trim()) vals.push(inp.value.trim());
    });
    return vals;
}

let currentWordModal;

function openWordModal(realIndex = -1) {
    if (!currentWordModal) {
        currentWordModal = new bootstrap.Modal(document.getElementById('wordModal'));
    }
    
    const isEdit = realIndex !== -1;
    document.getElementById('wordModalTitle').textContent = isEdit ? 'Sửa từ vựng' : 'Thêm từ mới';
    document.getElementById('wordEditIndex').value = realIndex;
    
    if (isEdit) {
        const item = getData()[realIndex];
        document.getElementById('wordInput').value = item.word || '';
        document.getElementById('pronunciationInput').value = item.pronunciation || '';
        document.getElementById('typeInput').value = item.type || '';
        document.getElementById('meaningInput').value = item.meaning || '';
        renderDynamicInputs('formulaContainer', item.formula, 'text');
        renderDynamicInputs('exampleContainer', item.example, 'textarea');
    } else {
        document.getElementById('wordForm').reset();
        renderDynamicInputs('formulaContainer', '', 'text');
        renderDynamicInputs('exampleContainer', '', 'textarea');
    }
    
    currentWordModal.show();
}

function editWord(filteredIndex) {
    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }
    const toEdit = filtered[filteredIndex];
    if (!toEdit) return;
    const realIndex = data.findIndex(v => v.word === toEdit.word && v.group === toEdit.group);
    if (realIndex !== -1) {
        openWordModal(realIndex);
    }
}

function saveWord() {
    const word = document.getElementById('wordInput').value.trim();
    const meaning = document.getElementById('meaningInput').value.trim();
    if (!word || !meaning) {
        alert("Vui lòng điền đủ từ vựng và nghĩa");
        return;
    }
    
    const item = {
        word: word,
        pronunciation: document.getElementById('pronunciationInput').value.trim(),
        type: document.getElementById('typeInput').value.trim(),
        meaning: meaning,
        formula: getDynamicValues('formulaContainer'),
        example: getDynamicValues('exampleContainer'),
        source: 'Thêm thủ công',
        status: 'Chưa thuộc',
        addedAt: new Date().toISOString()
    };
    
    const realIdx = parseInt(document.getElementById('wordEditIndex').value, 10);
    const data = getData();
    
    if (realIdx !== -1) {
        const old = data[realIdx];
        item.details = old.details;
        item.addedAt = old.addedAt;
        item.group = old.group;
        item.status = old.status || 'Chưa thuộc';
        data[realIdx] = item;
    } else {
        let targetGroup = activeGroupFilter;
        if (activeGroupFilter === 'all_custom') {
            const customGroups = getGroups().filter(g => !g.startsWith('Basic') && !g.startsWith('Adv') && g !== 'Tất cả');
            targetGroup = customGroups.length > 0 ? customGroups[0] : 'Sổ từ vựng';
        }
        item.group = targetGroup;
        data.push(item);
    }
    
    saveData(data);
    currentWordModal.hide();
    renderOverview();
    renderWordTable();
    renderGroups();
}

function deleteWord(index) {
    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }
    const toRemove = filtered[index];
    if (!toRemove) return;
    const realIndex = data.findIndex(v => v.word === toRemove.word && v.group === toRemove.group);
    if (realIndex !== -1) {
        data.splice(realIndex, 1);
        saveData(data);
        renderOverview();
        renderWordTable();
        renderGroups();
    }
}

// ===== TABS =====
function showTab(tab) {
    const listBtn = document.getElementById('tabList');
    const reviewBtn = document.getElementById('tabReview');

    if (tab === 'list') {
        document.getElementById('listSection').style.display = 'block';
        document.getElementById('reviewSection').classList.remove('active');
        listBtn.className = 'btn btn-primary';
        reviewBtn.className = 'btn btn-outline-primary';
    } else {
        document.getElementById('listSection').style.display = 'none';
        document.getElementById('reviewSection').classList.add('active');
        listBtn.className = 'btn btn-outline-primary';
        reviewBtn.className = 'btn btn-primary';
        startReview();
    }
}

// ===== FLASHCARD REVIEW =====
let reviewCards = [];
let reviewIndex = 0;
let knownCount = 0;

function startReview() {
    const data = getData();
    if (data.length === 0) {
        document.getElementById('reviewEmpty').style.display = 'block';
        document.getElementById('reviewActive').style.display = 'none';
        document.getElementById('reviewDone').style.display = 'none';
        return;
    }

    // Shuffle
    reviewCards = [...data].sort(() => Math.random() - 0.5);
    reviewIndex = 0;
    knownCount = 0;

    document.getElementById('reviewEmpty').style.display = 'none';
    document.getElementById('reviewActive').style.display = 'block';
    document.getElementById('reviewDone').style.display = 'none';
    document.getElementById('reviewTotal').textContent = reviewCards.length;

    showCurrentCard();

    recordReviewActivity();
}

function showCurrentCard() {
    if (reviewIndex >= reviewCards.length) {
        finishReview();
        return;
    }

    const card = reviewCards[reviewIndex];
    document.getElementById('fcWord').textContent = card.word;
    document.getElementById('fcWordBack').textContent = card.word;
    document.getElementById('fcGroup').textContent = card.group;
    document.getElementById('fcSource').textContent = 'Nguồn: ' + (card.source || 'reading');
    document.getElementById('reviewCurrent').textContent = reviewIndex + 1;
    document.getElementById('reviewKnown').textContent = knownCount;

    document.getElementById('flashcard').classList.remove('flipped');
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function markCard(known) {
    if (known) knownCount++;
    reviewIndex++;
    showCurrentCard();
}

function finishReview() {
    document.getElementById('reviewActive').style.display = 'none';
    document.getElementById('reviewDone').style.display = 'block';
    document.getElementById('reviewResult').textContent = knownCount;
    document.getElementById('reviewResultTotal').textContent = reviewCards.length;
}

function recordReviewActivity() {
    const activity = getActivity();
    const today = new Date().toISOString().slice(0, 10);
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    renderHeatmap();
}

// ===== INITIATE =====
document.addEventListener('DOMContentLoaded', () => {
    initData();
    setCategoryTab('basic');
    renderHeatmap();
    renderOverview();
});
