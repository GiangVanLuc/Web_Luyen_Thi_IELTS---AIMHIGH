// ===== EXAM-LABELLING.JS — Component Map/Diagram labelling dùng chung Reading + Listening (Pha 3) =====
// Hiển thị ảnh (group.imageUrl) + drop zone định vị theo toạ độ % (group.dropZones[].x/y),
// kéo-thả token chữ cái (A–G) từ group.matchOptions vào drop zone.
// Hỗ trợ chuột (drag) + cảm ứng/tap (chọn chip rồi chạm vị trí). Cho gỡ/đổi (double-click hoặc tap lại).
// Mỗi questionNumber ↔ 1 drop zone, giá trị = chữ cái đã thả → so khớp exact ở backend.
// Tích hợp answer-store của từng trang qua window.pa(questionNumber, letter).

window.ExamLabelling = (function () {
    'use strict';

    const eh = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let activeSlot = null;        // questionNumber đang chờ thả (tap-to-place)
    let pendingValue = null;      // chữ cái đã chọn từ option bank (touch flow)

    // ── Lấy danh sách token (chữ cái + mô tả tuỳ chọn) ──────────────────────────
    function resolveOptions(g) {
        if (Array.isArray(g.matchOptions) && g.matchOptions.length) {
            return g.matchOptions.map((o) => {
                if (o && typeof o === 'object') {
                    return {
                        letter: String(o.letter || o.label || o.id || '').trim(),
                        text: String(o.text || o.value || o.name || '').trim()
                    };
                }
                return { letter: String(o || '').trim(), text: '' };
            }).filter((o) => o.letter);
        }
        return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l) => ({ letter: l, text: '' }));
    }

    // ── Map mỗi drop zone về 1 questionNumber ───────────────────────────────────
    function resolveZones(g) {
        const questions = Array.isArray(g.questions) ? g.questions : [];
        const rawZones = Array.isArray(g.dropZones) ? g.dropZones : [];

        if (rawZones.length) {
            return rawZones.map((z, i) => {
                let qn = Number(z.questionNumber);
                if (!Number.isFinite(qn) || qn <= 0) {
                    qn = /^\d+$/.test(String(z.id)) ? Number(z.id) : Number(questions[i]?.questionNumber);
                }
                return {
                    questionNumber: Number.isFinite(qn) && qn > 0 ? qn : null,
                    x: z.x == null ? null : Number(z.x),
                    y: z.y == null ? null : Number(z.y),
                    label: String(z.label || '').trim()
                };
            }).filter((z) => z.questionNumber);
        }

        // Không có toạ độ → fallback từng câu thành hàng select chữ cái.
        return questions
            .map((q) => ({ questionNumber: Number(q.questionNumber), x: null, y: null, label: '' }))
            .filter((z) => Number.isFinite(z.questionNumber) && z.questionNumber > 0);
    }

    function hasCoords(z) {
        return z.x != null && z.y != null && !Number.isNaN(z.x) && !Number.isNaN(z.y);
    }

    function slotButton(qn, extraClass, positioned, style) {
        return `<button type="button" class="${extraClass}" id="ms${qn}" data-q="${qn}"${style ? ` style="${style}"` : ''}
            onclick="ExamLabelling.focusSlot(${qn})"
            ondblclick="ExamLabelling.clearSlot(${qn})"
            ondragover="ExamLabelling.dragOver(event)"
            ondrop="ExamLabelling.drop(event,${qn})">`;
    }

    // ── Render khối labelling ───────────────────────────────────────────────────
    function render(g) {
        const imageUrl = String(g.imageUrl || g.image || '').trim();
        const options = resolveOptions(g);
        const zones = resolveZones(g);
        const positioned = zones.filter((z) => imageUrl && hasCoords(z));
        const plain = zones.filter((z) => !imageUrl || !hasCoords(z));

        let html = '<div class="map-label-block">';

        if (imageUrl) {
            html += '<div class="map-label-canvas">';
            html += `<img src="${eh(imageUrl)}" alt="Map / Diagram" class="map-label-img" draggable="false">`;
            positioned.forEach((z) => {
                const qn = z.questionNumber;
                html += slotButton(qn, 'map-zone', true, `left:${z.x}%;top:${z.y}%;`);
                html += `<span class="map-zone-num">${qn}</span><span class="map-zone-val" id="mst${qn}"></span></button>`;
                html += `<input type="hidden" id="q${qn}" value="">`;
            });
            html += '</div>';
        }

        if (plain.length) {
            html += '<div class="map-label-rows">';
            plain.forEach((z) => {
                const qn = z.questionNumber;
                const qObj = (g.questions || []).find((q) => Number(q.questionNumber) === Number(qn));
                const qText = qObj ? eh(qObj.questionText || z.label || '') : eh(z.label || '');
                html += `<div id="qi${qn}" class="qi map-row" data-q="${qn}">
                    <input type="hidden" id="q${qn}" value="">`;
                html += slotButton(qn, 'match-slot', false, '');
                html += `<span class="match-slot-text" id="mst${qn}">${qn}</span></button>
                    <div class="match-qtext">${qText}</div>
                </div>`;
            });
            html += '</div>';
        }

        html += '<div class="map-label-options"><div class="match-options-title">List of options</div><div class="match-options">';
        options.forEach((opt) => {
            const display = opt.text ? `${opt.letter}. ${opt.text}` : opt.letter;
            html += `<button type="button" class="match-chip" data-val="${eh(opt.letter)}" draggable="true"
                ondragstart="ExamLabelling.dragStart(event,this.dataset.val)"
                onclick="ExamLabelling.optionClick(this.dataset.val)">${eh(display)}</button>`;
        });
        html += '</div></div></div>';

        return html;
    }

    // ── Tương tác ───────────────────────────────────────────────────────────────
    function applyAnswer(qn, letter) {
        const val = String(letter || '').trim();
        if (typeof window.pa === 'function') window.pa(qn, val);
        // Ghi đè hiển thị (pa của Reading format thành "Paragraph A" — labelling chỉ cần chữ cái).
        const valEl = document.getElementById('mst' + qn);
        if (valEl) valEl.textContent = val || (document.getElementById('ms' + qn)?.classList.contains('map-zone') ? '' : String(qn));
        const slot = document.getElementById('ms' + qn);
        if (slot) slot.classList.toggle('filled', !!val);
    }

    function focusSlot(qn) {
        // Nếu đã chọn sẵn 1 chữ cái (touch flow) → thả ngay vào ô này.
        if (pendingValue) {
            applyAnswer(qn, pendingValue);
            pendingValue = null;
            document.querySelectorAll('.match-chip.selected').forEach((c) => c.classList.remove('selected'));
            return;
        }
        activeSlot = qn;
        document.querySelectorAll('.map-zone.active, .match-slot.active').forEach((el) => el.classList.remove('active'));
        const target = document.getElementById('ms' + qn);
        if (target) target.classList.add('active');
    }

    function clearSlot(qn) {
        applyAnswer(qn, '');
    }

    function dragStart(event, value) {
        event.dataTransfer.setData('text/plain', String(value || ''));
        event.dataTransfer.effectAllowed = 'copy';
    }

    function dragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    function drop(event, qn) {
        event.preventDefault();
        const value = String(event.dataTransfer.getData('text/plain') || '').trim();
        if (!value) return;
        applyAnswer(qn, value);
        activeSlot = qn;
    }

    function optionClick(value) {
        const val = String(value || '').trim();
        if (!val) return;

        // Có ô đang active → thả vào ô đó.
        let targetQ = activeSlot;
        if (!targetQ) {
            const firstEmpty = document.querySelector('.map-zone:not(.filled),.match-slot:not(.filled)');
            if (firstEmpty) targetQ = Number(firstEmpty.dataset.q);
        }
        if (targetQ) {
            applyAnswer(targetQ, val);
            // Sau khi thả, bỏ active để lần tap kế tiếp chọn ô khác.
            activeSlot = null;
            document.querySelectorAll('.map-zone.active, .match-slot.active').forEach((el) => el.classList.remove('active'));
            return;
        }

        // Chưa có ô nào → ghi nhớ chữ cái, chờ người dùng chạm ô (touch flow).
        pendingValue = val;
        document.querySelectorAll('.match-chip.selected').forEach((c) => c.classList.remove('selected'));
        const chip = document.querySelector(`.match-chip[data-val="${CSS && CSS.escape ? CSS.escape(val) : val}"]`);
        if (chip) chip.classList.add('selected');
    }

    return { render, focusSlot, clearSlot, dragStart, dragOver, drop, optionClick };
})();
