// ===== AI-GRADING-REPORT.JS — Renderer báo cáo chấm AI (Writing/Speaking) dùng chung =====
// Backend trả về attempt.feedback là JSON có cấu trúc (version 2):
//   { version, skill, overallBand, criteria:[{name,band,comment}], strengths:[], improvements:[],
//     corrections:[{original,suggestion,explanation}], improvedVersion?, pronunciationNotes?, summary }
// Module này parse và dựng HTML đẹp; nếu feedback là text thường (đời cũ) thì hiển thị nguyên văn.
// Dùng: AiGradingReport.render(feedbackRaw, { bandScore, skill }) -> HTML string.

window.AiGradingReport = (function () {
    'use strict';

    const eh = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    function parse(raw) {
        if (raw == null) return null;
        if (typeof raw === 'object') return raw;
        const text = String(raw).trim();
        if (!text) return null;
        if (text[0] !== '{') return null; // text thường (định dạng cũ)
        try { return JSON.parse(text); } catch (_) { return null; }
    }

    function bandColor(band) {
        const b = Number(band);
        if (!Number.isFinite(b)) return '#9ca3af';
        if (b >= 7) return '#16a34a';
        if (b >= 5.5) return '#d4a017';
        if (b >= 4) return '#ea580c';
        return '#dc2626';
    }

    function fmtBand(v) {
        const n = Number(v);
        return Number.isFinite(n) ? (Number.isInteger(n) ? n.toFixed(1) : String(n)) : '–';
    }

    function renderCriteria(criteria) {
        if (!Array.isArray(criteria) || !criteria.length) return '';
        const rows = criteria.map((c) => {
            const band = Number(c.band);
            const pct = Number.isFinite(band) ? Math.max(0, Math.min(100, (band / 9) * 100)) : 0;
            const color = bandColor(band);
            return `
                <div class="aigr-crit">
                    <div class="aigr-crit-head">
                        <span class="aigr-crit-name">${eh(c.name || '')}</span>
                        <span class="aigr-crit-band" style="background:${color};">${fmtBand(c.band)}</span>
                    </div>
                    <div class="aigr-bar"><div class="aigr-bar-fill" style="width:${pct}%;background:${color};"></div></div>
                    <div class="aigr-crit-comment">${eh(c.comment || '')}</div>
                </div>`;
        }).join('');
        return `<div class="aigr-section"><h6 class="aigr-h">Điểm theo từng tiêu chí</h6>${rows}</div>`;
    }

    function renderList(title, items, icon, cls) {
        if (!Array.isArray(items) || !items.length) return '';
        const lis = items.map((it) => `<li>${eh(it)}</li>`).join('');
        return `<div class="aigr-section"><h6 class="aigr-h ${cls}"><i class="bi ${icon}"></i> ${eh(title)}</h6><ul class="aigr-ul ${cls}">${lis}</ul></div>`;
    }

    function renderCorrections(corrections) {
        if (!Array.isArray(corrections) || !corrections.length) return '';
        const rows = corrections.map((c) => `
            <div class="aigr-fix">
                <div class="aigr-fix-line"><span class="aigr-fix-bad">${eh(c.original || '')}</span>
                    <i class="bi bi-arrow-right aigr-fix-arrow"></i>
                    <span class="aigr-fix-good">${eh(c.suggestion || '')}</span></div>
                ${c.explanation ? `<div class="aigr-fix-why">${eh(c.explanation)}</div>` : ''}
            </div>`).join('');
        return `<div class="aigr-section"><h6 class="aigr-h"><i class="bi bi-pencil-square"></i> Sửa lỗi chi tiết</h6>${rows}</div>`;
    }

    function renderImproved(text) {
        if (!text) return '';
        return `<div class="aigr-section">
            <h6 class="aigr-h"><i class="bi bi-stars"></i> Bài mẫu Band 8+ (tham khảo)</h6>
            <div class="aigr-improved">${eh(text).replace(/\n/g, '<br>')}</div>
        </div>`;
    }

    function renderPlainText(raw) {
        const text = String(raw || 'Không có nhận xét chi tiết.');
        return `<div class="aigr-summary">${eh(text).replace(/\n/g, '<br>')}</div>`;
    }

    // Trả về HTML đầy đủ (không gồm điểm tổng — caller tự hiển thị badge nếu muốn).
    function renderBody(data) {
        let html = '';
        if (data.summary) {
            html += `<div class="aigr-section aigr-summary-box"><h6 class="aigr-h"><i class="bi bi-chat-left-text-fill"></i> Nhận xét tổng quan</h6><div class="aigr-summary">${eh(data.summary).replace(/\n/g, '<br>')}</div></div>`;
        }
        html += renderCriteria(data.criteria);
        html += renderList('Điểm mạnh', data.strengths, 'bi-hand-thumbs-up-fill', 'good');
        html += renderList('Cần cải thiện', data.improvements, 'bi-lightbulb-fill', 'warn');
        html += renderCorrections(data.corrections);
        if (data.pronunciationNotes) {
            html += `<div class="aigr-section"><h6 class="aigr-h"><i class="bi bi-mic-fill"></i> Phát âm & ngữ điệu</h6><div class="aigr-summary">${eh(data.pronunciationNotes).replace(/\n/g, '<br>')}</div></div>`;
        }
        html += renderImproved(data.improvedVersion);
        return html;
    }

    // options: { bandScore, skill, showOverall (default true) }
    function render(feedbackRaw, options = {}) {
        const data = parse(feedbackRaw);
        const band = options.bandScore != null ? options.bandScore : (data && data.overallBand);

        let html = '<div class="aigr">';
        if (options.showOverall !== false && band != null) {
            const color = bandColor(band);
            html += `<div class="aigr-overall">
                <span class="aigr-overall-label">Overall Band</span>
                <span class="aigr-overall-band" style="background:${color};">${fmtBand(band)}</span>
            </div>`;
        }
        html += data ? renderBody(data) : renderPlainText(feedbackRaw);
        html += '</div>';
        return html;
    }

    function injectStylesOnce() {
        if (document.getElementById('aigr-styles')) return;
        const css = `
        .aigr{font-family:'Be Vietnam Pro',sans-serif;color:#2b2b2b;text-align:left;}
        .aigr-overall{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:18px;}
        .aigr-overall-label{font-weight:700;font-size:1.05rem;color:#4a3800;}
        .aigr-overall-band{color:#fff;font-weight:800;font-size:1.7rem;min-width:64px;text-align:center;border-radius:14px;padding:6px 14px;box-shadow:0 4px 12px rgba(0,0,0,.12);}
        .aigr-section{margin-bottom:16px;}
        .aigr-h{font-weight:800;font-size:.92rem;margin-bottom:8px;color:#3a3a3a;display:flex;align-items:center;gap:6px;}
        .aigr-h.good{color:#16a34a;} .aigr-h.warn{color:#d97706;}
        .aigr-summary-box{background:#fffdf5;border:1px solid #f0e8c8;border-radius:14px;padding:12px 14px;}
        .aigr-summary{font-size:.92rem;line-height:1.7;color:#444;}
        .aigr-crit{margin-bottom:11px;}
        .aigr-crit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
        .aigr-crit-name{font-weight:700;font-size:.88rem;}
        .aigr-crit-band{color:#fff;font-weight:800;font-size:.8rem;border-radius:8px;padding:1px 9px;min-width:34px;text-align:center;}
        .aigr-bar{height:7px;border-radius:6px;background:#eee;overflow:hidden;}
        .aigr-bar-fill{height:100%;border-radius:6px;transition:width .4s;}
        .aigr-crit-comment{font-size:.85rem;color:#555;margin-top:5px;line-height:1.6;}
        .aigr-ul{margin:0;padding-left:20px;font-size:.88rem;line-height:1.7;}
        .aigr-ul.good li{color:#15803d;} .aigr-ul.warn li{color:#b45309;}
        .aigr-fix{border:1px solid #eee;border-left:3px solid #d4a017;border-radius:8px;padding:8px 11px;margin-bottom:8px;background:#fafafa;}
        .aigr-fix-line{font-size:.88rem;display:flex;flex-wrap:wrap;align-items:center;gap:7px;}
        .aigr-fix-bad{color:#b91c1c;text-decoration:line-through;}
        .aigr-fix-good{color:#15803d;font-weight:600;}
        .aigr-fix-arrow{color:#9ca3af;}
        .aigr-fix-why{font-size:.8rem;color:#666;margin-top:4px;font-style:italic;}
        .aigr-improved{font-size:.9rem;line-height:1.8;color:#333;background:#f5fbf6;border:1px solid #cfe9d6;border-radius:12px;padding:12px 14px;white-space:normal;}
        `;
        const style = document.createElement('style');
        style.id = 'aigr-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    return { render, parse, injectStylesOnce };
})();
