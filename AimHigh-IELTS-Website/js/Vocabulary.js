// ===== STORAGE KEYS =====
const VOCAB_KEY = 'aimhigh_vocab';
const GROUPS_KEY = 'aimhigh_vocab_groups';
const ACTIVITY_KEY = 'aimhigh_vocab_activity';
const GROUP_META_KEY = 'aimhigh_vocab_group_meta';

const LEARN_LEVEL_TO_STATUS = {
    0: 'Chưa thuộc',
    1: 'Nhớ sơ sơ',
    2: 'Đã thuộc'
};

const STATUS_TO_LEARN_LEVEL = {
    'Chưa thuộc': 0,
    'Nhớ sơ sơ': 1,
    'Đã thuộc': 2
};

function safeParseJson(rawValue, fallbackValue) {
    if (rawValue == null || rawValue === '') return fallbackValue;
    try {
        const parsed = JSON.parse(rawValue);
        return parsed == null ? fallbackValue : parsed;
    } catch (_) {
        return fallbackValue;
    }
}

function hasBackendAuthToken() {
    return !!localStorage.getItem('aimhigh_token');
}

function getStoredCurrentUser() {
    const raw = localStorage.getItem('aimhigh_currentUser') || localStorage.getItem('aimhigh_user') || '{}';
    try {
        return JSON.parse(raw) || {};
    } catch (_) {
        return {};
    }
}

function isVocabularyLoggedIn() {
    const hasFlag = localStorage.getItem('aimhigh_loggedIn') === 'true';
    const hasToken = !!localStorage.getItem('aimhigh_token');
    const currentUser = getStoredCurrentUser();
    const hasUser = !!(currentUser && (currentUser.email || currentUser.name));
    return hasFlag || hasToken || hasUser;
}

function getUserInitials(nameValue) {
    const name = String(nameValue || '').trim();
    if (!name) return 'U';

    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function initVocabularyHeaderAuth() {
    const guestActions = document.getElementById('guestActions');
    const userActions = document.getElementById('userActions');
    const nameEl = document.getElementById('homeHeaderName');
    const avatarEl = document.getElementById('homeHeaderAvatar');
    const logoutLink = document.getElementById('homeLogoutLink');

    const currentUser = getStoredCurrentUser();
    const loggedIn = isVocabularyLoggedIn();

    if (loggedIn && guestActions && userActions) {
        guestActions.classList.add('d-none');
        userActions.classList.remove('d-none');
        if (nameEl) nameEl.textContent = currentUser.name || currentUser.email || 'Người dùng';
        if (avatarEl) avatarEl.textContent = getUserInitials(currentUser.name || currentUser.email || 'U');
    } else if (guestActions && userActions) {
        guestActions.classList.remove('d-none');
        userActions.classList.add('d-none');
    }

    if (logoutLink && !logoutLink.dataset.bound) {
        logoutLink.dataset.bound = 'true';
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();

            if (typeof apiLogout === 'function') {
                try {
                    await apiLogout();
                    return;
                } catch (_) {
                    // Fallback local logout below.
                }
            }

            localStorage.removeItem('aimhigh_token');
            localStorage.removeItem('aimhigh_refreshToken');
            localStorage.removeItem('aimhigh_loggedIn');
            localStorage.removeItem('aimhigh_currentUser');
            window.location.href = 'login.html';
        });
    }
}

function getData() {
    const parsed = safeParseJson(localStorage.getItem(VOCAB_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
}

function saveData(d) {
    const data = Array.isArray(d) ? d : [];
    localStorage.setItem(VOCAB_KEY, JSON.stringify(data));
}

function getGroups() {
    const parsed = safeParseJson(localStorage.getItem(GROUPS_KEY), []);
    const normalized = (Array.isArray(parsed) ? parsed : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean);

    const unique = [...new Set(normalized)];
    const hasCustomGroup = unique.some((groupName) => !groupName.startsWith('Basic') && !groupName.startsWith('Adv'));

    if (!unique.length || !hasCustomGroup) {
        const defaults = [...unique, 'Sổ từ vựng'];
        const fixed = [...new Set(defaults)];
        localStorage.setItem(GROUPS_KEY, JSON.stringify(fixed));
        return fixed;
    }

    if (unique.length !== normalized.length) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(unique));
    }

    return unique;
}

function saveGroups(g) {
    const groups = Array.isArray(g) ? [...new Set(g.map((item) => String(item || '').trim()).filter(Boolean))] : [];
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));

    const metaMap = getGroupMetaMap();
    const nextMeta = {};
    groups.forEach((groupName) => {
        if (metaMap[groupName]) {
            nextMeta[groupName] = metaMap[groupName];
        }
    });
    saveGroupMetaMap(nextMeta);
}

function getActivity() {
    const parsed = safeParseJson(localStorage.getItem(ACTIVITY_KEY), {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function getGroupMetaMap() {
    const parsed = safeParseJson(localStorage.getItem(GROUP_META_KEY), {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function saveGroupMetaMap(metaMap) {
    const map = metaMap && typeof metaMap === 'object' && !Array.isArray(metaMap) ? metaMap : {};
    localStorage.setItem(GROUP_META_KEY, JSON.stringify(map));
}

function getGroupMetaByName(groupName) {
    if (!groupName) return null;
    const map = getGroupMetaMap();
    return map[groupName] || null;
}

function setGroupMeta(groupName, metadata) {
    const name = String(groupName || '').trim();
    if (!name || !metadata || typeof metadata !== 'object') return;

    const backendId = Number(metadata.id);
    if (!Number.isFinite(backendId) || backendId <= 0) return;

    const map = getGroupMetaMap();
    map[name] = {
        id: backendId,
        name: String(metadata.name || name)
    };
    saveGroupMetaMap(map);
}

function removeGroupMeta(groupName) {
    const name = String(groupName || '').trim();
    if (!name) return;
    const map = getGroupMetaMap();
    if (map[name]) {
        delete map[name];
        saveGroupMetaMap(map);
    }
}

function getBackendGroupName(item) {
    const text = String(item?.groupName || item?.note || '').trim();
    return text || 'Sổ từ vựng';
}

function normalizeLearnLevel(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric <= 0) return 0;
    if (numeric >= 2) return 2;
    return 1;
}

function toStatusFromLearnLevel(learnLevel, learnedFlag) {
    const level = normalizeLearnLevel(learnLevel);
    if (level === 0 && learnedFlag === true) return 'Đã thuộc';
    return LEARN_LEVEL_TO_STATUS[level] || 'Chưa thuộc';
}

function toLearnLevelFromStatus(status) {
    const key = String(status || '').trim();
    if (Object.prototype.hasOwnProperty.call(STATUS_TO_LEARN_LEVEL, key)) {
        return STATUS_TO_LEARN_LEVEL[key];
    }
    return 0;
}

function getBackendWordStatus(item) {
    return toStatusFromLearnLevel(item?.learnLevel, item?.learned === true);
}

async function syncUserVocabularyFromBackend() {
    if (!hasBackendAuthToken() || typeof apiGetUserVocab !== 'function') return;

    try {
        const [groupsResponse, response] = await Promise.all([
            typeof apiGetUserVocabGroups === 'function' ? apiGetUserVocabGroups() : Promise.resolve([]),
            apiGetUserVocab({ size: 500, sort: 'newest' })
        ]);

        const remoteGroups = groupsResponse?.data || groupsResponse || [];
        const localGroups = getGroups();
        if (Array.isArray(remoteGroups)) {
            remoteGroups.forEach((groupItem) => {
                const groupName = String(groupItem?.name || '').trim();
                const groupId = Number(groupItem?.id);
                if (!groupName) return;
                if (!localGroups.includes(groupName)) {
                    localGroups.push(groupName);
                }
                if (Number.isFinite(groupId) && groupId > 0) {
                    setGroupMeta(groupName, { id: groupId, name: groupName });
                }
            });
            saveGroups(localGroups);
        }

        const remoteList = response?.data || response || [];
        if (!Array.isArray(remoteList)) return;

        const data = getData();
        const groups = getGroups();

        remoteList.forEach((item) => {
            const backendVocabId = Number(item?.id);
            const backendUserVocabularyId = Number(item?.userVocabularyId);
            const backendGroupId = Number(item?.groupId);
            if (!Number.isFinite(backendVocabId) || backendVocabId <= 0) return;

            const targetGroup = getBackendGroupName(item);
            if (!groups.includes(targetGroup)) groups.push(targetGroup);
            if (Number.isFinite(backendGroupId) && backendGroupId > 0) {
                setGroupMeta(targetGroup, { id: backendGroupId, name: targetGroup });
            }

            const existing = data.find((w) =>
                (Number.isFinite(backendUserVocabularyId) && Number(w?.backendUserVocabularyId) === backendUserVocabularyId)
                || Number(w?.backendVocabId) === backendVocabId
                || (
                    String(w?.word || '').toLowerCase() === String(item?.word || '').toLowerCase()
                    && String(w?.group || '') === targetGroup
                )
            );

            if (existing) {
                existing.word = item?.word || existing.word;
                existing.pronunciation = item?.ipa || existing.pronunciation;
                existing.type = item?.partOfSpeech || existing.type;
                existing.meaning = item?.viMeaning || item?.meaning || existing.meaning;
                existing.group = targetGroup;
                existing.status = getBackendWordStatus(item);
                existing.learnLevel = normalizeLearnLevel(item?.learnLevel);
                existing.backendVocabId = backendVocabId;
                existing.backendUserVocabularyId = Number.isFinite(backendUserVocabularyId) && backendUserVocabularyId > 0
                    ? backendUserVocabularyId
                    : existing.backendUserVocabularyId || null;
                existing.backendGroupId = Number.isFinite(backendGroupId) && backendGroupId > 0
                    ? backendGroupId
                    : existing.backendGroupId || null;
                existing.addedAt = existing.addedAt || new Date().toISOString();
                return;
            }

            data.push(getDefaultWordObject({
                word: item?.word || '',
                pronunciation: item?.ipa || '',
                type: item?.partOfSpeech || '',
                meaning: item?.viMeaning || item?.meaning || '',
                formula: '',
                example: '',
                group: targetGroup,
                source: 'Đồng bộ backend',
                status: getBackendWordStatus(item),
                learnLevel: normalizeLearnLevel(item?.learnLevel),
                backendVocabId,
                backendUserVocabularyId: Number.isFinite(backendUserVocabularyId) && backendUserVocabularyId > 0 ? backendUserVocabularyId : null,
                backendGroupId: Number.isFinite(backendGroupId) && backendGroupId > 0 ? backendGroupId : null,
                addedAt: item?.savedAt || new Date().toISOString()
            }));
        });

        saveGroups(groups);
        saveData(data);
    } catch (error) {
        console.warn('Không thể đồng bộ user vocabulary từ backend:', error?.message || error);
    }
}

async function saveWordToBackend(item, groupName) {
    if (!hasBackendAuthToken() || typeof apiLookupVocab !== 'function' || typeof apiSaveUserVocab !== 'function') return null;

    const lookupRes = await apiLookupVocab(item.word);
    const vocabData = lookupRes?.data || lookupRes;
    const vocabId = Number(vocabData?.id);
    if (!Number.isFinite(vocabId) || vocabId <= 0) return null;

    const targetGroupName = String(groupName || item.group || 'Sổ từ vựng').trim() || 'Sổ từ vựng';
    const groupMeta = getGroupMetaByName(targetGroupName);
    const saveRes = await apiSaveUserVocab(vocabId, {
        groupId: Number.isFinite(Number(groupMeta?.id)) ? Number(groupMeta.id) : undefined,
        groupName: targetGroupName,
        note: item?.note || null
    });
    const savedData = saveRes?.data || saveRes || {};

    const backendUserVocabularyId = Number(savedData?.userVocabularyId);
    const backendGroupId = Number(savedData?.groupId);
    if (Number.isFinite(backendGroupId) && backendGroupId > 0) {
        setGroupMeta(targetGroupName, { id: backendGroupId, name: savedData?.groupName || targetGroupName });
    }

    return {
        backendVocabId: vocabId,
        backendUserVocabularyId: Number.isFinite(backendUserVocabularyId) && backendUserVocabularyId > 0
            ? backendUserVocabularyId
            : null,
        backendGroupId: Number.isFinite(backendGroupId) && backendGroupId > 0 ? backendGroupId : null,
        learnLevel: normalizeLearnLevel(savedData?.learnLevel),
        status: toStatusFromLearnLevel(savedData?.learnLevel, savedData?.learned === true)
    };
}

// ===== AUTO INIT VOCAB DATA =====
function initData() {
    normalizeVocabularyStorage();

    let initialized = localStorage.getItem('aimhigh_vocab_init');
    const groups = getGroups();
    const hasBasicGroup = groups.some((name) => name.startsWith('Basic'));
    const hasAdvancedGroup = groups.some((name) => name.startsWith('Adv'));

    if (!initialized || !hasBasicGroup || !hasAdvancedGroup) {
        seedPresetVocabularies();
        localStorage.setItem('aimhigh_vocab_init', 'true');
    }

    let customSeeded = localStorage.getItem('aimhigh_custom_seeded_v3');
    const hasCustomWords = getData().some((item) => item?.group && !String(item.group).startsWith('Basic') && !String(item.group).startsWith('Adv'));
    if (!customSeeded || !hasCustomWords) {
        seedCustomVocabularies();
        localStorage.setItem('aimhigh_custom_seeded_v3', 'true');
    }

    normalizeVocabularyStorage();
}

function normalizeVocabularyStorage() {
    const groups = getGroups();
    let data = getData();
    let changed = false;

    if (!Array.isArray(data)) {
        data = [];
        changed = true;
    }

    const normalizedData = data
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const normalized = getDefaultWordObject(item);
            const groupName = String(item.group || normalized.group || 'Sổ từ vựng').trim() || 'Sổ từ vựng';
            normalized.group = groupName;
            normalized.status = ['Chưa thuộc', 'Nhớ sơ sơ', 'Đã thuộc'].includes(item.status)
                ? item.status
                : 'Chưa thuộc';
            normalized.learnLevel = toLearnLevelFromStatus(normalized.status);
            return normalized;
        });

    if (normalizedData.length !== data.length) changed = true;

    const mergedGroups = [...groups];
    normalizedData.forEach((item) => {
        if (item.group && !mergedGroups.includes(item.group)) {
            mergedGroups.push(item.group);
            changed = true;
        }
    });

    const hasCustomGroup = mergedGroups.some((name) => !name.startsWith('Basic') && !name.startsWith('Adv'));
    if (!hasCustomGroup) {
        mergedGroups.push('Sổ từ vựng');
        changed = true;
    }

    if (changed) {
        saveGroups(mergedGroups);
        saveData(normalizedData);
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
        { word: 'fluctuate', pronunciation: '/ˈflʌktʃueɪt/', type: 'verb', meaning: 'dao động, thay đổi', formula: 'fluctuate between A and B', example: 'During the crisis, oil prices fluctuated wildly.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'implement', pronunciation: '/ˈɪmplɪmənt/', type: 'verb', meaning: 'thực hiện, áp dụng', formula: 'implement a policy/plan', example: 'The changes to the national health system will be implemented next year.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'significant', pronunciation: '/sɪɡˈnɪfɪkənt/', type: 'adj', meaning: 'đáng kể, quan trọng', formula: 'a significant increase/decrease', example: 'There has been a significant increase in the number of women students.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'abandon', pronunciation: '/əˈbændən/', type: 'verb', meaning: 'từ bỏ', formula: 'abandon a project/idea', example: 'They had to abandon their attempt to climb the mountain.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Đã thuộc' },
        { word: 'perspective', pronunciation: '/pəˈspektɪv/', type: 'noun', meaning: 'quan điểm, góc nhìn', formula: 'from a ... perspective', example: 'Try to see the issue from a different perspective.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Nhớ sơ sơ' },
        { word: 'consequence', pronunciation: '/ˈkɒnsɪkwəns/', type: 'noun', meaning: 'hậu quả', formula: 'as a consequence of', example: 'He resigned as a direct consequence of the scandal.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'evaluate', pronunciation: '/ɪˈvæljueɪt/', type: 'verb', meaning: 'đánh giá', formula: 'evaluate performance/results', example: 'We need to evaluate the success of the campaign.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'comprehensive', pronunciation: '/ˌkɒmprɪˈhensɪv/', type: 'adj', meaning: 'toàn diện', formula: 'a comprehensive guide/review', example: 'This is a comprehensive guide to understanding the new policy.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Nhớ sơ sơ' },
        { word: 'contribute', pronunciation: '/kənˈtrɪbjuːt/', type: 'verb', meaning: 'đóng góp', formula: 'contribute to something', example: 'Many factors contributed to his success.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Đã thuộc' },
        { word: 'inevitable', pronunciation: '/ɪnˈevɪtəbl/', type: 'adj', meaning: 'không thể tránh khỏi', formula: 'an inevitable result/consequence', example: 'It was an inevitable consequence of the decision.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' },
        { word: 'alleviate', pronunciation: '/əˈliːvieɪt/', type: 'verb', meaning: 'làm giảm bớt', formula: 'alleviate pain/suffering', example: 'The medicine helped to alleviate his symptoms.', group: 'Sổ từ vựng', source: 'Tự thêm', status: 'Chưa thuộc' }
    ];

    customData.map(getDefaultWordObject).forEach(w => {
        const exists = data.find(item => item.word === w.word && item.group === w.group);
        if (!exists) data.push(w);
    });
    
    saveGroups(groups);
    saveData(data);
}

function getDefaultWordObject(w) {
    const learnLevel = normalizeLearnLevel(w?.learnLevel);
    const status = w?.status || toStatusFromLearnLevel(learnLevel, w?.learned === true);

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
        status,
        learnLevel,
        addedAt: w.addedAt || new Date().toISOString(),
        backendVocabId: Number.isFinite(Number(w.backendVocabId)) ? Number(w.backendVocabId) : null,
        backendUserVocabularyId: Number.isFinite(Number(w.backendUserVocabularyId)) ? Number(w.backendUserVocabularyId) : null,
        backendGroupId: Number.isFinite(Number(w.backendGroupId)) ? Number(w.backendGroupId) : null
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
let wordSearchQuery = '';
let wordStatusFilter = 'all';
let wordSortFilter = 'newest';
let wordPosFilter = 'all';
let wordDateFromFilter = '';
let wordDateToFilter = '';
let currentVocabularyPage = 'vault';

function detectVocabularyPageMode() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('vocabulary-notebook') ? 'notebook' : 'vault';
}

function redirectLegacyVocabularyRoutes() {
    const params = new URLSearchParams(window.location.search);
    const view = (params.get('view') || '').trim().toLowerCase();
    if (!view) return false;

    const isNotebookView = view === 'custom' || view === 'notebook' || view === 'so-tu-vung' || view === 'review';
    const isVaultView = view === 'list';

    const mode = detectVocabularyPageMode();
    if (isNotebookView && mode === 'vault') {
        window.location.replace('Vocabulary-notebook.html');
        return true;
    }

    if (isVaultView && mode === 'notebook') {
        window.location.replace('Vocabulary.html');
        return true;
    }

    return false;
}

function normalizePosValue(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return '';

    const map = {
        adjective: 'adj',
        adverb: 'adv',
        noun: 'noun',
        verb: 'verb'
    };

    return map[text] || text;
}

function getPosLabel(value) {
    const pos = normalizePosValue(value);
    const labelMap = {
        noun: 'Noun',
        verb: 'Verb',
        adj: 'Adjective',
        adv: 'Adverb'
    };
    return labelMap[pos] || (pos ? pos.charAt(0).toUpperCase() + pos.slice(1) : 'Khác');
}

function extractAddedDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function renderPosFilterOptions(scopedWords) {
    const posSelect = document.getElementById('wordPosFilter');
    if (!posSelect) return;

    const current = wordPosFilter;
    const posValues = [...new Set(scopedWords
        .map((item) => normalizePosValue(item.type))
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const options = ['<option value="all">Mọi từ loại</option>'];
    posValues.forEach((pos) => {
        options.push(`<option value="${pos}">${getPosLabel(pos)}</option>`);
    });

    posSelect.innerHTML = options.join('');
    posSelect.value = posValues.includes(current) ? current : 'all';
    wordPosFilter = posSelect.value || 'all';
}

function setCategoryTab(tab) {
    if (currentVocabularyPage === 'vault' && tab === 'custom') {
        tab = 'basic';
    }
    if (currentVocabularyPage === 'notebook') {
        tab = 'custom';
    }

    activeCategoryTab = tab;
    // Update button styles
    const categoryTabs = document.getElementById('categoryTabs');
    const tabs = categoryTabs ? categoryTabs.children : [];
    if (tabs.length >= 2) {
        tabs[0].className = tab === 'basic' ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm';
        tabs[1].className = tab === 'advanced' ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm';
    }

    const addGroupContainer = document.getElementById('addGroupContainer');
    if (addGroupContainer) addGroupContainer.style.display = tab === 'custom' ? 'flex' : 'none';

    const addWordBtn = document.getElementById('addWordBtn');
    if (addWordBtn) addWordBtn.style.display = tab === 'custom' ? 'inline-block' : 'none';

    const flContainer = document.getElementById('flashcardDropdownContainer');
    if (flContainer) flContainer.style.display = tab === 'custom' ? 'block' : 'none';

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
    
    const saveFunc = async () => {
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            await commitRenameGroup(oldName, newName);
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

async function commitRenameGroup(oldName, newName) {
    const groups = getGroups();
    const duplicate = groups.some((name) => name.toLowerCase() === newName.toLowerCase() && name !== oldName);
    if (duplicate) {
        alert("Tên nhóm này đã tồn tại!");
        renderGroups();
        return;
    }

    if (hasBackendAuthToken() && typeof apiRenameUserVocabGroup === 'function') {
        const groupMeta = getGroupMetaByName(oldName);
        if (groupMeta?.id) {
            try {
                const response = await apiRenameUserVocabGroup(groupMeta.id, newName);
                const payload = response?.data || response || {};
                setGroupMeta(newName, {
                    id: payload?.id || groupMeta.id,
                    name: payload?.name || newName
                });
                removeGroupMeta(oldName);
            } catch (error) {
                alert(`Không thể đổi tên nhóm trên backend: ${error?.message || 'Lỗi không xác định'}`);
                renderGroups();
                return;
            }
        }
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

async function deleteGroup(event, name) {
    event.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa nhóm "${name}" và toàn bộ từ vựng trong nhóm này không?`)) return;

    if (hasBackendAuthToken() && typeof apiDeleteUserVocabGroup === 'function') {
        const groupMeta = getGroupMetaByName(name);
        if (groupMeta?.id) {
            try {
                await apiDeleteUserVocabGroup(groupMeta.id);
            } catch (error) {
                alert(`Không thể xóa nhóm trên backend: ${error?.message || 'Lỗi không xác định'}`);
                return;
            }
        }
    }
    
    const groups = getGroups();
    const idx = groups.indexOf(name);
    if (idx !== -1) {
        groups.splice(idx, 1);
        saveGroups(groups);
    }
    removeGroupMeta(name);
    
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

async function addGroupFromPage() {
    const input = document.getElementById('newGroupInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    const groups = getGroups();
    const duplicate = groups.some((groupName) => groupName.toLowerCase() === name.toLowerCase());
    if (duplicate) { alert('Nhóm đã tồn tại!'); return; }

    if (hasBackendAuthToken() && typeof apiCreateUserVocabGroup === 'function') {
        try {
            const response = await apiCreateUserVocabGroup(name);
            const payload = response?.data || response || {};
            if (payload?.id) {
                setGroupMeta(name, { id: payload.id, name: payload.name || name });
            }
        } catch (error) {
            alert(`Không thể tạo nhóm trên backend: ${error?.message || 'Lỗi không xác định'}`);
            return;
        }
    }

    groups.push(name);
    saveGroups(groups);
    input.value = '';
    activeGroupFilter = name;
    renderOverview();
    renderGroups();
    renderWordTable();
}

function normalizeSearchValue(value) {
    if (Array.isArray(value)) {
        return value.join(' ');
    }
    return String(value || '');
}

function initWordTableControls() {
    const searchInput = document.getElementById('wordSearchInput');
    const posSelect = document.getElementById('wordPosFilter');
    const statusSelect = document.getElementById('wordStatusFilter');
    const sortSelect = document.getElementById('wordSortFilter');
    const dateFromInput = document.getElementById('wordDateFrom');
    const dateToInput = document.getElementById('wordDateTo');

    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('input', (event) => {
            wordSearchQuery = (event.target.value || '').trim().toLowerCase();
            renderWordTable();
        });
    }

    if (posSelect && !posSelect.dataset.bound) {
        posSelect.dataset.bound = 'true';
        posSelect.addEventListener('change', (event) => {
            wordPosFilter = normalizePosValue(event.target.value || 'all') || 'all';
            renderWordTable();
        });
    }

    if (statusSelect && !statusSelect.dataset.bound) {
        statusSelect.dataset.bound = 'true';
        statusSelect.addEventListener('change', (event) => {
            wordStatusFilter = event.target.value || 'all';
            renderWordTable();
        });
    }

    if (sortSelect && !sortSelect.dataset.bound) {
        sortSelect.dataset.bound = 'true';
        sortSelect.addEventListener('change', (event) => {
            wordSortFilter = event.target.value || 'newest';
            renderWordTable();
        });
    }

    if (dateFromInput && !dateFromInput.dataset.bound) {
        dateFromInput.dataset.bound = 'true';
        dateFromInput.addEventListener('change', (event) => {
            wordDateFromFilter = event.target.value || '';
            renderWordTable();
        });
    }

    if (dateToInput && !dateToInput.dataset.bound) {
        dateToInput.dataset.bound = 'true';
        dateToInput.addEventListener('change', (event) => {
            wordDateToFilter = event.target.value || '';
            renderWordTable();
        });
    }
}

// ===== WORD TABLE & MODAL =====
function renderWordTable() {
    const data = getData();
    const scopedWords = data
        .map((item, realIndex) => ({ ...item, _realIndex: realIndex }))
        .filter((item) => {
            if (activeGroupFilter === 'all_custom') {
                return item.group && !item.group.startsWith('Basic') && !item.group.startsWith('Adv');
            }
            return item.group === activeGroupFilter;
        });

    renderPosFilterOptions(scopedWords);

    const dateFrom = wordDateFromFilter;
    const dateTo = wordDateToFilter;
    const normalizedDateFrom = dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
    const normalizedDateTo = dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;

    let filtered = [...scopedWords];
    const isCustom = activeCategoryTab === 'custom';

    if (wordSearchQuery) {
        filtered = filtered.filter((item) => {
            const joined = [
                item.word,
                item.meaning,
                item.type,
                normalizeSearchValue(item.formula),
                normalizeSearchValue(item.example),
                item.pronunciation
            ].join(' ').toLowerCase();
            return joined.includes(wordSearchQuery);
        });
    }

    if (wordPosFilter !== 'all') {
        filtered = filtered.filter((item) => normalizePosValue(item.type) === wordPosFilter);
    }

    if (normalizedDateFrom || normalizedDateTo) {
        filtered = filtered.filter((item) => {
            const addedDate = extractAddedDate(item.addedAt);
            if (!addedDate) return false;

            if (normalizedDateFrom && addedDate < normalizedDateFrom) return false;
            if (normalizedDateTo && addedDate > normalizedDateTo) return false;

            return true;
        });
    }

    if (isCustom && wordStatusFilter !== 'all') {
        filtered = filtered.filter((item) => (item.status || 'Chưa thuộc') === wordStatusFilter);
    }

    const statusOrder = { 'Chưa thuộc': 1, 'Nhớ sơ sơ': 2, 'Đã thuộc': 3 };

    filtered.sort((a, b) => {
        if (wordSortFilter === 'az') {
            return (a.word || '').localeCompare((b.word || ''), 'vi');
        }
        if (wordSortFilter === 'za') {
            return (b.word || '').localeCompare((a.word || ''), 'vi');
        }
        if (wordSortFilter === 'oldest') {
            const ta = new Date(a.addedAt || 0).getTime();
            const tb = new Date(b.addedAt || 0).getTime();
            return ta - tb;
        }
        if (wordSortFilter === 'status') {
            const sa = statusOrder[a.status || 'Chưa thuộc'] || 99;
            const sb = statusOrder[b.status || 'Chưa thuộc'] || 99;
            if (sa !== sb) {
                return sa - sb;
            }
            return (a.word || '').localeCompare((b.word || ''), 'vi');
        }

        const ta = new Date(a.addedAt || 0).getTime();
        const tb = new Date(b.addedAt || 0).getTime();
        return tb - ta;
    });

    const tbody = document.getElementById('wordTableBody');
    const title = document.getElementById('wordTableTitle');
    const countEl = document.getElementById('wordTableCount');
    if (!tbody || !title || !countEl) return;

    let titleText = activeGroupFilter;
    if (activeGroupFilter === 'all_custom') titleText = 'Sổ từ vựng của bạn';

    title.innerHTML = '<i class="bi bi-card-text"></i> ' + titleText;
    countEl.textContent = filtered.length === scopedWords.length
        ? filtered.length + ' từ'
        : (filtered.length + '/' + scopedWords.length + ' từ');

    const statusColHeader = document.getElementById('statusColHeader');
    if (statusColHeader) statusColHeader.style.display = isCustom ? 'table-cell' : 'none';

    const dateFromInput = document.getElementById('wordDateFrom');
    if (dateFromInput) dateFromInput.value = wordDateFromFilter;
    const dateToInput = document.getElementById('wordDateTo');
    if (dateToInput) dateToInput.value = wordDateToFilter;

    const statusFilterEl = document.getElementById('wordStatusFilter');
    if (statusFilterEl) {
        if (!isCustom) {
            statusFilterEl.value = 'all';
            statusFilterEl.disabled = true;
            wordStatusFilter = 'all';
        } else {
            statusFilterEl.disabled = false;
            statusFilterEl.value = wordStatusFilter;
        }
    }

    const saveActionEl = document.getElementById('saveWordsAction');
    if (saveActionEl) {
        if (isCustom) {
            saveActionEl.classList.remove('d-flex');
            saveActionEl.classList.add('d-none');
        } else {
            saveActionEl.classList.remove('d-none');
            saveActionEl.classList.add('d-flex');
            const ca = document.getElementById('checkAllWords');
            if (ca) ca.checked = false;
        }
    }

    const customMassActions = document.getElementById('customMassActions');
    if (customMassActions) {
        if (isCustom) {
            customMassActions.classList.remove('d-none');
            customMassActions.classList.add('d-flex');
            const ca = document.getElementById('checkAllCustomWords');
            if (ca) ca.checked = false;
        } else {
            customMassActions.classList.remove('d-flex');
            customMassActions.classList.add('d-none');
        }
    }



    if (filtered.length === 0) {
        const emptyLabel = scopedWords.length === 0
            ? 'Chưa có từ vựng nào trong nhóm này.'
            : 'Không tìm thấy từ phù hợp với bộ lọc hiện tại.';
        tbody.innerHTML = `<tr><td colspan="${isCustom ? 8 : 7}" style="text-align:center;color:var(--text-light);padding:32px;">` +
            emptyLabel + '</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((v) => {
        const realIndex = v._realIndex;
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
                        <li><a class="dropdown-item status-opt opt-chua" href="#" onclick="updateWordStatus(event, ${realIndex}, 'Chưa thuộc')">Chưa thuộc</a></li>
                        <li><a class="dropdown-item status-opt opt-soso" href="#" onclick="updateWordStatus(event, ${realIndex}, 'Nhớ sơ sơ')">Nhớ sơ sơ</a></li>
                        <li><a class="dropdown-item status-opt opt-da" href="#" onclick="updateWordStatus(event, ${realIndex}, 'Đã thuộc')">Đã thuộc</a></li>
                    </ul>
                </div>
            </td>`;
        }

        return `<tr>
            <td><input type="checkbox" class="form-check-input word-checkbox" value="${realIndex}"></td>
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
                <div class="d-flex gap-2">
                    ${activeCategoryTab === 'custom' ? `<button class="btn-delete text-primary" onclick="editWord(${realIndex})" title="Sửa"><i class="bi bi-pencil"></i></button>
                    <button class="btn-delete" onclick="deleteWord(${realIndex})" title="Xóa"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
    
    if (typeof updateFlashcardCount === 'function') updateFlashcardCount();
}

async function updateWordStatus(event, realIndex, newStatus) {
    event.preventDefault();
    const data = getData();
    if (!Number.isInteger(realIndex) || !data[realIndex]) return;

    const oldStatus = data[realIndex].status || 'Chưa thuộc';
    data[realIndex].status = newStatus;
    data[realIndex].learnLevel = toLearnLevelFromStatus(newStatus);
    saveData(data);
    renderWordTable();

    const backendId = Number(data[realIndex]?.backendUserVocabularyId || data[realIndex]?.backendVocabId);
    if (hasBackendAuthToken() && Number.isFinite(backendId) && backendId > 0 && typeof apiUpdateUserVocabStatus === 'function') {
        try {
            const response = await apiUpdateUserVocabStatus(backendId, toLearnLevelFromStatus(newStatus));
            const payload = response?.data || response || {};
            data[realIndex].status = toStatusFromLearnLevel(payload?.learnLevel, payload?.learned === true);
            data[realIndex].learnLevel = normalizeLearnLevel(payload?.learnLevel);
            data[realIndex].backendVocabId = Number.isFinite(Number(payload?.id)) ? Number(payload.id) : data[realIndex].backendVocabId || null;
            data[realIndex].backendUserVocabularyId = Number.isFinite(Number(payload?.userVocabularyId))
                ? Number(payload.userVocabularyId)
                : data[realIndex].backendUserVocabularyId || null;
            saveData(data);
            renderWordTable();
        } catch (error) {
            data[realIndex].status = oldStatus;
            data[realIndex].learnLevel = toLearnLevelFromStatus(oldStatus);
            saveData(data);
            renderWordTable();
            alert(`Không thể cập nhật trạng thái trên backend: ${error?.message || 'Lỗi không xác định'}`);
        }
    }
}

function toggleAllWords() {
    const checkAll = document.getElementById('checkAllWords');
    const checkboxes = document.querySelectorAll('.word-checkbox');
    checkboxes.forEach(cb => cb.checked = checkAll.checked);
}

function toggleAllCustomWords() {
    const checkAll = document.getElementById('checkAllCustomWords');
    const checkboxes = document.querySelectorAll('.word-checkbox');
    checkboxes.forEach(cb => cb.checked = checkAll.checked);
}

async function massUpdateStatus(newStatus) {
    const checkboxes = document.querySelectorAll('.word-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Vui lòng chọn ít nhất 1 từ để đổi trạng thái!');
        return;
    }
    
    const data = getData();
    let updatedCount = 0;
    const backendIds = [];
    checkboxes.forEach(cb => {
        const realIndex = parseInt(cb.value, 10);
        if (Number.isInteger(realIndex) && data[realIndex] && data[realIndex].status !== newStatus) {
            data[realIndex].status = newStatus;
            data[realIndex].learnLevel = toLearnLevelFromStatus(newStatus);
            const backendId = Number(data[realIndex].backendUserVocabularyId || data[realIndex].backendVocabId);
            if (Number.isFinite(backendId) && backendId > 0) {
                backendIds.push(backendId);
            }
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        saveData(data);
        renderWordTable();

        if (hasBackendAuthToken() && backendIds.length > 0) {
            const uniqueIds = [...new Set(backendIds)];
            try {
                if (typeof apiBatchUpdateUserVocabStatus === 'function') {
                    await apiBatchUpdateUserVocabStatus(uniqueIds, toLearnLevelFromStatus(newStatus));
                } else if (typeof apiUpdateUserVocabStatus === 'function') {
                    await Promise.all(uniqueIds.map((id) => apiUpdateUserVocabStatus(id, toLearnLevelFromStatus(newStatus))));
                }
            } catch (error) {
                console.warn('Không thể đồng bộ trạng thái hàng loạt lên backend:', error?.message || error);
            }
        }
    }
}

function populateSaveDropdown() {
    const list = document.getElementById('saveWordDropdown');
    if (!list) return;
    
    const data = getData();
    const customGroups = [...new Set(data.filter(w => w.group && !w.group.startsWith('Basic') && !w.group.startsWith('Adv')).map(w => w.group))];
    const groups = getGroups();
    const mergedGroups = [...new Set([...customGroups, ...groups])].filter(g => 
        g !== 'Tất cả' && 
        !g.startsWith('Basic') && 
        !g.startsWith('Adv')
    );
    
    if (mergedGroups.length === 0) {
        const fallbackGroup = 'Sổ từ vựng';
        if (!groups.includes(fallbackGroup)) {
            groups.push(fallbackGroup);
            saveGroups(groups);
        }
        list.innerHTML = `<li><a class="dropdown-item py-2" href="#" onclick="event.preventDefault(); saveSelectedWords('${fallbackGroup}')"><i class="bi bi-folder2 text-primary me-2"></i>${fallbackGroup}</a></li>`;
        return;
    }
    
    list.innerHTML = mergedGroups.map(g => `<li><a class="dropdown-item py-2" href="#" onclick="event.preventDefault(); saveSelectedWords('${g}')"><i class="bi bi-folder2 text-primary me-2"></i>${g}</a></li>`).join('');
}

async function saveSelectedWords(groupName) {
    const checkboxes = document.querySelectorAll('.word-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Vui lòng chọn ít nhất 1 từ để lưu!');
        return;
    }
    
    const data = getData();
    
    let addedCount = 0;
    let backendSyncedCount = 0;
    checkboxes.forEach(cb => {
        const realIndex = parseInt(cb.value, 10);
        const item = Number.isInteger(realIndex) ? data[realIndex] : null;
        if (item) {
            // Check if already in target custom group
            const exist = data.some(v => v.word === item.word && v.group === groupName);
            if (!exist) {
                // Copy item to custom group
                const newItem = {
                    ...item,
                    group: groupName,
                    status: 'Chưa thuộc',
                    learnLevel: 0,
                    fcStatus: 'Chưa học', // Reset flashcard status if it exists
                    backendVocabId: null,
                    backendUserVocabularyId: null,
                    backendGroupId: Number.isFinite(Number(getGroupMetaByName(groupName)?.id))
                        ? Number(getGroupMetaByName(groupName).id)
                        : null
                };
                data.push(newItem);
                addedCount++;
            }
        }
    });

    const newItems = addedCount > 0 ? data.slice(data.length - addedCount) : [];
    for (const item of newItems) {
        try {
            const backendSync = await saveWordToBackend(item, groupName);
            if (backendSync?.backendVocabId) {
                item.backendVocabId = backendSync.backendVocabId;
                item.backendUserVocabularyId = backendSync.backendUserVocabularyId || null;
                item.backendGroupId = backendSync.backendGroupId || item.backendGroupId || null;
                item.learnLevel = normalizeLearnLevel(backendSync.learnLevel);
                item.status = backendSync.status || item.status;
                backendSyncedCount++;
            }
        } catch (error) {
            console.warn('Không thể đồng bộ từ vựng lên backend:', error?.message || error);
        }
    }
    
    if (addedCount > 0) {
        saveData(data);
        const syncedText = backendSyncedCount > 0 ? ` (${backendSyncedCount} từ đã đồng bộ backend)` : '';
        alert(`Đã lưu ${addedCount} từ vào Sổ từ vựng (Nhóm: ${groupName})!${syncedText}`);
        renderOverview();
        
        // Ensure the groups are loaded properly in LHS
        const groups = getGroups();
        if (!groups.includes(groupName)) {
            groups.push(groupName);
            saveGroups(groups);
            renderGroups();
        }
        
    } else {
        alert(`Tất cả các từ đã chọn đều đã có mặt trong nhóm '${groupName}'!`);
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

function editWord(realIndex) {
    const data = getData();
    if (!Number.isInteger(realIndex) || !data[realIndex]) return;
    openWordModal(realIndex);
}

async function saveWord() {
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
        item.learnLevel = normalizeLearnLevel(old.learnLevel ?? toLearnLevelFromStatus(item.status));
        item.backendVocabId = old.backendVocabId || null;
        item.backendUserVocabularyId = old.backendUserVocabularyId || null;
        item.backendGroupId = old.backendGroupId || null;
        data[realIdx] = item;
    } else {
        let targetGroup = activeGroupFilter;
        if (activeGroupFilter === 'all_custom') {
            const customGroups = getGroups().filter(g => !g.startsWith('Basic') && !g.startsWith('Adv') && g !== 'Tất cả');
            targetGroup = customGroups.length > 0 ? customGroups[0] : 'Sổ từ vựng';
        }
        item.group = targetGroup;

        try {
            const backendSync = await saveWordToBackend(item, targetGroup);
            if (backendSync?.backendVocabId) {
                item.backendVocabId = backendSync.backendVocabId;
                item.backendUserVocabularyId = backendSync.backendUserVocabularyId || null;
                item.backendGroupId = backendSync.backendGroupId || null;
                item.learnLevel = normalizeLearnLevel(backendSync.learnLevel);
                item.status = backendSync.status || item.status;
            }
        } catch (error) {
            console.warn('Không thể lưu từ mới lên backend:', error?.message || error);
        }

        data.push(item);
    }
    
    saveData(data);
    currentWordModal.hide();
    renderOverview();
    renderWordTable();
    renderGroups();
}

async function deleteWord(realIndex) {
    const data = getData();
    if (!Number.isInteger(realIndex) || !data[realIndex]) return;

    const target = data[realIndex];
    const backendDeleteId = Number(target?.backendUserVocabularyId || target?.backendVocabId);
    if (hasBackendAuthToken() && Number.isFinite(backendDeleteId) && backendDeleteId > 0 && typeof apiDeleteUserVocab === 'function') {
        try {
            await apiDeleteUserVocab(backendDeleteId);
        } catch (error) {
            console.warn('Không thể xóa từ vựng trên backend:', error?.message || error);
        }
    }

    data.splice(realIndex, 1);
    saveData(data);
    renderOverview();
    renderWordTable();
    renderGroups();
}

// ===== TABS =====
function showTab(tab) {
    if (tab === 'list' && currentVocabularyPage !== 'vault') {
        window.location.href = 'Vocabulary.html';
        return;
    }

    if ((tab === 'custom' || tab === 'review') && currentVocabularyPage !== 'notebook') {
        window.location.href = 'Vocabulary-notebook.html';
        return;
    }

    if (currentVocabularyPage === 'notebook') {
        const reviewSection = document.getElementById('reviewSection');
        if (reviewSection) {
            reviewSection.classList.add('active');
            if (tab === 'review') {
                reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

// ===== FLASHCARD REVIEW =====
let reviewCards = [];
let totalInitialCards = 0;
let completedCardsCount = 0;
let currentSessionOriginalCards = [];

function updateFlashcardCount() {
    if (!document.getElementById('fcCountTotalBtn')) return;

    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }
    
    let chua = 0, soSo = 0, da = 0;
    filtered.forEach(v => {
        if (v.status === 'Nhớ sơ sơ') soSo++;
        else if (v.status === 'Đã thuộc') da++;
        else chua++; // default
    });
    
    document.getElementById('fcCountChua').textContent = chua;
    document.getElementById('fcCountSoSo').textContent = soSo;
    document.getElementById('fcCountDa').textContent = da;
    
    const checkedChua = document.getElementById('fcOptChua').checked;
    const checkedSoSo = document.getElementById('fcOptSoSo').checked;
    const checkedDa = document.getElementById('fcOptDa').checked;
    
    let total = 0;
    if (checkedChua) total += chua;
    if (checkedSoSo) total += soSo;
    if (checkedDa) total += da;
    
    document.getElementById('fcCountTotalBtn').textContent = total;
}

function startCustomFlashcard() {
    const chuaTho = document.getElementById('fcOptChua').checked;
    const soSo = document.getElementById('fcOptSoSo').checked;
    const daThuoc = document.getElementById('fcOptDa').checked;
    
    const allowedStatus = [];
    if(chuaTho) allowedStatus.push('Chưa thuộc');
    if(soSo) allowedStatus.push('Nhớ sơ sơ');
    if(daThuoc) allowedStatus.push('Đã thuộc');

    if(allowedStatus.length === 0) {
        alert("Vui lòng chọn ít nhất 1 loại từ để học!");
        return;
    }

    const data = getData();
    let filtered;
    if (activeGroupFilter === 'all_custom') {
        filtered = data.filter(v => v.group && !v.group.startsWith('Basic') && !v.group.startsWith('Adv'));
    } else {
        filtered = data.filter(v => v.group === activeGroupFilter);
    }
    
    reviewCards = filtered.filter(v => {
        const st = v.status || 'Chưa thuộc';
        return allowedStatus.includes(st);
    });
    
    if(reviewCards.length === 0) {
        alert("Không có từ vựng nào phù hợp với lựa chọn của bạn!");
        return;
    }
    
    reviewCards = reviewCards.sort(() => Math.random() - 0.5);
    currentSessionOriginalCards = [...reviewCards];
    totalInitialCards = reviewCards.length;
    completedCardsCount = 0;
    
    document.getElementById('reviewEmpty').style.display = 'none';
    document.getElementById('reviewActive').style.display = 'block';
    document.getElementById('reviewDone').style.display = 'none';
    document.getElementById('reviewTotal').textContent = totalInitialCards;
    
    showTab('review');
    showCurrentCard();
    recordReviewActivity();
    
    const dropdownBtn = document.getElementById('btnHocFlashcards');
    if (dropdownBtn) {
        const dropdown = bootstrap.Dropdown.getInstance(dropdownBtn) || new bootstrap.Dropdown(dropdownBtn);
        if (dropdown) dropdown.hide();
    }
}

function processCard(newStatus) {
    if (reviewCards.length === 0) return;
    
    const currentCard = reviewCards.shift();
    if (currentCard) {
        const data = getData();
        const realIndex = data.findIndex(v => v.word === currentCard.word && v.group === currentCard.group);
        if (realIndex !== -1) {
            data[realIndex].status = newStatus;
            saveData(data);
            currentCard.status = newStatus;
        }
    }
    
    if (newStatus === 'Đã thuộc') {
        completedCardsCount++;
    } else if (newStatus === 'Nhớ sơ sơ') {
        if (reviewCards.length <= 2) {
            reviewCards.push(currentCard);
        } else {
            const minIdx = Math.floor(reviewCards.length / 2);
            const insertIdx = Math.floor(Math.random() * (reviewCards.length - minIdx + 1)) + minIdx;
            reviewCards.splice(insertIdx, 0, currentCard);
        }
    } else {
        if (reviewCards.length <= 1) {
            reviewCards.push(currentCard);
        } else {
            const insertIdx = Math.floor(Math.random() * 2) + 1;
            reviewCards.splice(Math.min(insertIdx, reviewCards.length), 0, currentCard);
        }
    }
    
    renderWordTable();
    
    if (reviewCards.length === 0) {
        finishReview();
    } else {
        showCurrentCard();
    }
}

function startReview() {
    const reviewSection = document.getElementById('reviewSection');
    if (reviewSection) reviewSection.classList.add('active');

    if (currentSessionOriginalCards.length === 0) {
        document.getElementById('reviewEmpty').style.display = 'block';
        document.getElementById('reviewActive').style.display = 'none';
        document.getElementById('reviewDone').style.display = 'none';
        return;
    }

    reviewCards = [...currentSessionOriginalCards].sort(() => Math.random() - 0.5);
    totalInitialCards = reviewCards.length;
    completedCardsCount = 0;

    document.getElementById('reviewEmpty').style.display = 'none';
    document.getElementById('reviewActive').style.display = 'block';
    document.getElementById('reviewDone').style.display = 'none';
    document.getElementById('reviewTotal').textContent = totalInitialCards;

    showCurrentCard();
    recordReviewActivity();
}

function showCurrentCard() {
    if (reviewCards.length === 0) {
        finishReview();
        return;
    }

    const card = reviewCards[0];
    document.getElementById('fcWord').textContent = card.word;
    document.getElementById('fcWordBack').textContent = card.word + (card.type ? ` (${card.type})` : '');
    
    const elPronunciation = document.getElementById('fcPronunciation');
    if (elPronunciation) elPronunciation.textContent = card.pronunciation || '';
    
    const elMeaning = document.getElementById('fcMeaning');
    if (elMeaning) elMeaning.textContent = card.meaning || '';
    
    const elFormulaContainer = document.getElementById('fcFormulaContainer');
    const elFormula = document.getElementById('fcFormula');
    if (elFormula && elFormulaContainer) {
        if (card.formula) {
            let formStr = '';
            if (Array.isArray(card.formula)) {
                formStr = card.formula.join('\n');
            } else {
                formStr = card.formula;
            }
            elFormula.innerHTML = formStr.replace(/\n/g, '<br>');
            elFormulaContainer.style.display = 'block';
        } else {
            elFormulaContainer.style.display = 'none';
        }
    }
    
    const elExample = document.getElementById('fcExample');
    if (elExample) {
        let exStr = '';
        if (Array.isArray(card.example)) {
            exStr = card.example.join('\n\n');
        } else {
            exStr = card.example || '';
        }
        elExample.innerHTML = exStr.replace(/\n/g, '<br>');
    }
    
    document.getElementById('reviewCurrent').textContent = completedCardsCount;

    document.getElementById('flashcard').classList.remove('flipped');
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function finishReview() {
    document.getElementById('reviewActive').style.display = 'none';
    document.getElementById('reviewDone').style.display = 'block';
    document.getElementById('reviewEmpty').style.display = 'none';
    document.getElementById('reviewResult').textContent = completedCardsCount;
    document.getElementById('reviewResultTotal').textContent = totalInitialCards;
}

function recordReviewActivity() {
    const activity = getActivity();
    const today = new Date().toISOString().slice(0, 10);
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    renderHeatmap();
}

function getInitialVocabularyView() {
    return currentVocabularyPage === 'notebook' ? 'custom' : 'list';
}

function updateVocabularyQueryParam(view) {
    return view;
}

function syncVocabularyMenuActive(view) {
    const notebookLink = document.getElementById('menuVocabularyNotebook');
    const vaultLink = document.getElementById('menuVocabularyVault');
    if (!notebookLink || !vaultLink) return;

    notebookLink.classList.toggle('active', view === 'custom');
    vaultLink.classList.toggle('active', view !== 'custom');
}

// ===== INITIATE =====
document.addEventListener('DOMContentLoaded', async () => {
    if (redirectLegacyVocabularyRoutes()) return;

    currentVocabularyPage = detectVocabularyPageMode();
    initVocabularyHeaderAuth();
    initData();
    await syncUserVocabularyFromBackend();
    initWordTableControls();

    if (currentVocabularyPage === 'notebook') {
        setCategoryTab('custom');
        syncVocabularyMenuActive('custom');
    } else {
        setCategoryTab('basic');
        syncVocabularyMenuActive('list');
    }

    renderHeatmap();
    renderOverview();
});
