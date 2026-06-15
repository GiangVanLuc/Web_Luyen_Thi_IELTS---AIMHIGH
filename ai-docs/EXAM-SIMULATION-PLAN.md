# Kế hoạch hoàn thiện hệ thống thi IELTS mô phỏng (bàn giao)

> Tài liệu tự chứa để tiếp tục ở session mới. Mục tiêu: admin **import được mọi đề IELTS** (mọi dạng câu), người thi có **trải nghiệm như thi thật** (kéo-thả, điền từ, timer, audio), đủ 4 kỹ năng Reading / Listening / Writing / Speaking. Dùng bộ Cambridge 20 làm bộ test nghiệm thu.

---

## 0. Trạng thái tổng quan

| Pha | Nội dung | Trạng thái |
|---|---|---|
| **0** | Chuẩn hoá schema + normalizer khi import | ✅ DONE (đã test) |
| **7** | Hoàn thiện chấm điểm (chọn-2, `\|`/`/`, labelling) | ✅ DONE (đã test) |
| **1** | Listening đủ dạng (matching, map, chọn-2, audio) | ✅ DONE (code; cần test với đề thật) |
| **2** | Reading hoàn thiện (chọn-2, summary word-bank) | ✅ DONE (code; cần test với đề thật) |
| **3** | Component Map/Diagram labelling (dùng chung R+L) | ✅ DONE (`js/exam-labelling.js`) |
| 4 | Writing (ảnh task1, đếm chữ, 2 task, chấm AI) | 🟡 PHẦN LỚN ĐÃ CÓ (ảnh+min-word có sẵn; còn polish) |
| 5 | Speaking (cue card, ghi âm, chấm) | 🟡 PHẦN LỚN ĐÃ CÓ (thiếu timer chuẩn bị 1' Part 2 + giới hạn 2') |
| 6 | Vỏ phòng thi (timer, palette, review có đáp án) | 🟡 PHẦN LỚN ĐÃ CÓ (R/L có timer+palette+flag+review; mở rộng review cho dạng mới) |

**Khuyến nghị thứ tự làm tiếp:** ~~1 → 3 → 2~~ (DONE) → 6 (review cho dạng mới) → 4 → 5.

### Cập nhật phiên 2026-06-15 (Chấm AI kĩ lưỡng + đề Cam20 + Speaking Part 2)
- **Chấm AI có cấu trúc (W/S):** `AiGradingService.grade()` viết lại — prompt bắt Gemini trả JSON: `overallBand` + 4 tiêu chí (band + nhận xét trích dẫn) + `strengths` + `improvements` + `corrections` (lỗi→sửa→giải thích) + `improvedVersion` (Writing, bài mẫu Band 8+) + `pronunciationNotes` (Speaking) + `summary`. Dùng `response_mime_type=application/json`, temp 0.3, parse chống lỗi, tự tính overall = TB 4 tiêu chí (làm tròn 0.5), fallback an toàn. Lưu cả JSON vào `attempt.feedback` (LONGTEXT) — **không migrate DB**. `mvn compile` PASS.
- **Sửa bug:** `ResultServiceImpl.getResult` KHÔNG trả `feedback` (DTO có field nhưng builder bỏ sót) → đã thêm `.feedback(...)`; nay xem lại bài W/S cũ vẫn thấy báo cáo AI.
- **FE renderer mới:** `js/ai-grading-report.js` (`AiGradingReport.render`) — parse JSON, dựng báo cáo (band tổng, thanh điểm 4 tiêu chí, điểm mạnh/cải thiện, bảng sửa lỗi, bài mẫu); fallback text nếu feedback đời cũ. Nối vào modal kết quả `writing.js` + `speaking.js`; include script trong `writing.html` + `speaking.html`.
- **Đề Cambridge 20 Test 1 đủ 4 kỹ năng** (`AimHigh-backend/docs/samples/json/`): listening (đã sửa: Part 1 thêm `type:NOTE_COMPLETION` tránh render bảng rỗng; mỗi câu thứ 2 của chọn-2 gán đáp án cặp để đủ 2 điểm), reading (có sẵn), **writing + speaking mới tạo**. Kèm `README-cambridge20-test1.md` (cách import + đáp án đối chiếu).
- **Speaking Part 2 thực tế hơn:** sửa bug `resetRecordButton` gọi đệ quy chính nó (crash sau câu đầu); thêm **đếm ngược chuẩn bị 60s** + **tự dừng ghi âm ở 2 phút** + đồng hồ ghi âm trên nút.
- **Còn nợ:** (a) Reading Q19–23 (match person) & Q31–35 (sentence endings) đang render radio MCQ thay vì kéo-thả — chấm đúng nhưng chưa "siêu thực" (có thể đổi sang `MATCHING` + `matchOptions`); (b) review mode cho mcq-multi/labelling; (c) chấm tay `grading.html` ghi đè `feedback` bằng text thường (renderer tự fallback nên không vỡ). CHƯA test trình duyệt thật.

### Cập nhật phiên 2026-06-14 (Pha 1+2+3)
- **Module dùng chung mới:** `js/exam-labelling.js` (`window.ExamLabelling.render(group)`), include trong `reading.html` + `listening.html` trước file renderer. Render ảnh `group.imageUrl` + drop zone định vị `dropZones[].x/y` (%), token chữ cái từ `matchOptions`, kéo-thả (chuột) + tap (cảm ứng), gỡ bằng double-click; map mỗi zone→`questionNumber` (ưu tiên `dropZones[].questionNumber`, rồi `id` số, rồi thứ tự `questions`). Không có toạ độ → fallback hàng `match-slot`.
- **listening.js:** `renderGroup` viết lại theo **canonical `group.type`** (hàm `resolveRenderKind`). Đã port từ reading: `renderMatchingDrag` + handlers (`focusMatchSlot/clearMatchAnswer/onMatchDrag*/onMatchOptionClick`), `renderTableCompletion`, `renderSummaryCompletion`. Thêm mới (chia sẻ ý tưởng với reading): `renderMcqMulti`/`onMcqMultiChange` (chọn-2, chặn quá `maxSelect`, nộp `"A,E"` cho cả 2 số câu), `renderSummaryWordbank`. `pa()` mở rộng để cập nhật hidden input `#q{n}` + match slot `#ms/#mst`.
- **reading.js:** thêm `resolveRenderKind` ưu tiên canonical `group.type` (vẫn fallback `resolveDisplayTypeForGroup`), thêm case `MULTIPLE_CHOICE_MULTI`, `MAP_LABELLING`/`DIAGRAM_LABELLING` (→ ExamLabelling), `SUMMARY_WORDBANK`. Thêm `renderMcqMulti`/`onMcqMultiChange`/`renderSummaryWordbank`/`resolveWordbankOptions`.
- **CSS:** `css/test.css` thêm khối matching cho `body.listening-page` (trước chỉ có reading), `.map-label-*` + `.map-zone` (cả 2 trang), `.mcq-multi-*` (cả 2 trang), `.match-chip.selected`.
- **Đã verify:** scorer (`ScoringServiceImpl`) khớp format FE nộp — matching/labelling 1 chữ cái (exact), chọn-2 `"A,E"` (`isLetterSet`→`scoreLetterSet`, đúng cho cả 2 số câu). Backend KHÔNG đổi.
- **Còn nợ (polish):** (a) review mode chưa decorate `mcq-multi` (không có `qi{n}`/`q{n}` nên bỏ qua êm); (b) reading `pa()` format matching thành "Paragraph A" nên ô word-bank hiện "Paragraph A" thay vì cụm từ — cosmetic, đáp án vẫn đúng; (c) chọn-2 chỉ chấm full-credit (đúng 1/2 = 0) — đúng như Pha 7 ghi.
- **CHƯA test trên trình duyệt thật** (cần backend 8085 + MySQL/Redis + Live Server). Mới `node --check` cú pháp 3 file JS đều OK.

---

## 1. Kiến trúc & file quan trọng

**Backend (Spring Boot, Java, `tools.jackson` = Jackson 3):**
- Import đề: `service/impl/ExamImportServiceImpl.java` (JSON + Excel→JSON→import). Lưu entity (ListeningPart/ReadingPassage/Question/Choice) + `examData` (JSON đã **xoá đáp án** để gửi client).
- **Chuẩn hoá (Pha 0):** `service/impl/ExamSchemaNormalizer.java` — gọi đầu `importFromJson`.
- Chấm điểm: `service/impl/ScoringServiceImpl.java` (R/L tự động + đổi band), `AiGradingService` (W/S bằng AI), `AdminSubmissionService` + trang `admin/grading.html` (chấm tay).
- Lấy đề cho người thi: `service/impl/ExamServiceImpl.getExamDetail()` → trả `examData` JSON (đã sạch đáp án) hoặc dựng từ entity.
- Controller: `controller/ExamController.java` (public `/api/exams`, `/api/exams/{id}`), `controller/AdminExamController.java` (`/api/admin/exams/...` import/create/template).
- Enum dạng câu (cũ, 7 giá trị): `enums/QuestionTypeName.java`. **Bộ canonical mới nằm trong `ExamSchemaNormalizer`** (16 dạng) — đây mới là chuẩn dùng xuyên suốt.

**Frontend (vanilla JS, không framework):**
- `reading.html` + `js/reading.js` — **renderer THAM CHIẾU**, đã hỗ trợ: `TRUE_FALSE_NG`, `MULTIPLE_CHOICE`, `MATCHING`/`MATCHING_HEADINGS` (kéo-thả, hàm `renderMatchingDrag`), `FILL_BLOCK`, `TABLE_COMPLETION`, `SUMMARY_COMPLETION`. Có highlight + review.
- `listening.html` + `js/listening.js` — **còn yếu**: chỉ `TRUE_FALSE_NG`, `MULTIPLE_CHOICE` (1 đáp án), `FILL_BLOCK`.
- `writing.html` + `js/writing.js` — đã nối: task1/task2, đếm chữ, nộp → chấm AI.
- `speaking.html` + `js/speaking.js` — cần kiểm tra/hoàn thiện.
- `js/api.js` — lớp gọi API (`apiFetch`, `getExamData`, `submitAttemptAnswers`...). `API_BASE = http://localhost:8085/api`.
- `js/test.js` — logic phòng thi/đề chung (kiểm tra để tái dùng cho vỏ thi).

---

## 2. Canonical JSON schema (HỢP ĐỒNG import — quan trọng nhất)

Admin upload theo dạng này; `ExamSchemaNormalizer` sẽ chuẩn hoá `type` + `correctAnswer` khi import.

```jsonc
{
  "exam": { "title", "skill":"LISTENING|READING|WRITING|SPEAKING", "type":"ACADEMIC",
            "level":"MEDIUM", "duration":30, "description", "thumbnail" },
  "sections": [{
    "sectionNumber": 1,
    "label": "Part 1",                 // hoặc "title"
    "questionFrom": 1, "questionTo": 10, // có thể bỏ -> tự suy
    "audioUrl": "...",                  // LISTENING: audio theo part
    "audioDuration": 420,               // giây (tuỳ chọn)
    "transcript": "...",                // tuỳ chọn
    "passages": [                       // READING: bắt buộc >=1
      { "title", "content" (HTML/text, đoạn đánh dấu A–G), "imageUrl" }
    ],
    "groups": [{
      "type": "NOTE_COMPLETION",        // 1 trong bộ canonical (mục 3)
      "instruction": "Complete the table. Write ONE WORD AND/OR A NUMBER.",
      "questionFrom": 1, "questionTo": 10,
      "imageUrl": "...",                // map/diagram cho labelling
      "matchOptions": [                 // MATCHING / SUMMARY_WORDBANK / labelling
        { "letter":"A", "text":"providing entertainment" }
      ],
      "dropZones": [                    // MAP/DIAGRAM_LABELLING: vùng thả định vị %
        { "id":"B", "x":42, "y":18 }
      ],
      "questions": [{
        "questionNumber": 1,
        "questionText": "Good for people who are especially keen on {{1}}", // {{n}} = ô điền
        "choices": [ {"label":"A","text":"...","isCorrect":true} ],         // MCQ
        "maxSelect": 1,                 // =2 cho chọn-2
        "correctAnswer": "fish"         // "30|thirty" (biến thể), "A" (nhãn), "A,E" (tập chọn-2)
      }]
    }]
  }]
}
```

**Quy ước đáp án (`correctAnswer`):**
- Biến thể chấp nhận: phân tách bằng `|` **hoặc** `/` → "30|thirty" hoặc "30/thirty" (normalizer đổi `|`→`/`).
- Bài chọn-2/đa đáp án: dùng **dấu phẩy** hoặc **chữ HOA viết liền**: `"A,E"` hoặc `"AE"` (KHÔNG dùng `/`/`|` vì đó là OR-biến-thể). Scorer (Pha 7) so khớp tập, không phân biệt thứ tự.
- Labelling: 1 chữ cái (`"B"`).
- T/F/NG, Y/N/NG: `"TRUE"`/`"FALSE"`/`"NOT GIVEN"`/`"YES"`/`"NO"` (chấp nhận shortcut T/F/NG/Y/N).

---

## 3. Bộ type canonical (định nghĩa trong ExamSchemaNormalizer)

`NOTE_COMPLETION`, `TABLE_COMPLETION`, `FORM_COMPLETION`, `FLOWCHART_COMPLETION`, `SENTENCE_COMPLETION`, `SUMMARY_COMPLETION`, `SUMMARY_WORDBANK`, `MULTIPLE_CHOICE`, `MULTIPLE_CHOICE_MULTI`, `TRUE_FALSE_NOTGIVEN`, `YES_NO_NOTGIVEN`, `MATCHING`, `MAP_LABELLING`, `DIAGRAM_LABELLING`, `WRITING_TASK`, `SPEAKING_PART`.

Normalizer còn ghi kèm `displayType` (token mà FE hiện hiểu) để renderer cũ vẫn chạy:
- `*_COMPLETION` (trừ TABLE/SUMMARY) + `SUMMARY_WORDBANK` → `FILL_BLOCK`
- `TABLE_COMPLETION` → `TABLE_COMPLETION`; `SUMMARY_COMPLETION` → `SUMMARY_COMPLETION`
- `MULTIPLE_CHOICE(_MULTI)` → `MULTIPLE_CHOICE`
- `TRUE_FALSE_NOTGIVEN`/`YES_NO_NOTGIVEN` → `TRUE_FALSE_NG`
- `MATCHING`/`MAP_LABELLING`/`DIAGRAM_LABELLING` → `MATCHING`

→ **Khi làm FE các pha sau, đọc `group.type` (canonical) thay vì đoán.** `displayType` chỉ là cầu nối tạm cho renderer cũ.

---

## 4. ĐÃ HOÀN THÀNH (đừng làm lại)

### Pha 0 — ExamSchemaNormalizer
- File: `service/impl/ExamSchemaNormalizer.java`, gọi tại `ExamImportServiceImpl.importFromJson` ngay sau `deepCopy`.
- Làm: (a) gom mọi nhãn `type`/`displayType` đồng nghĩa → canonical (ưu tiên: nhãn → instruction → cấu trúc choices/matchOptions/dropZones/đáp án); ghi `type` + `displayType`. (b) `correctAnswer`: `|`→`/`, gọn khoảng trắng.
- Đã test: import đề probe → `FILL_IN_BLANK`→`NOTE_COMPLETION`, `TFNG`→`TRUE_FALSE_NOTGIVEN`, `matching headings`→`MATCHING`; DB lưu `30/thirty`.

### Pha 7 — ScoringServiceImpl.scoreAnswer
- Tách biến thể trên cả `/` và `|` (`split("[/|]")`).
- `isLetterSet`: nhận dạng tập chữ cái **chỉ khi** có dấu phẩy/space (`A,E`) hoặc chữ HOA viết liền (`AE`) → tránh nhầm từ điền thường.
- `scoreLetterSet`: tập trùng khớp (nguyên-bộ `A,E`≡`E,A`≡`AE`) HOẶC 1 chữ cái nằm trong tập (nộp tách từng câu).
- Labelling 1 chữ cái: dùng so khớp exact sẵn có.
- Đã test 11/11 case (file Java độc lập).
- **Còn nợ:** điểm thành phần cho choose-2 (đúng 1/2) chưa tách — chốt khi làm UI Pha 1/2.

---

## 5. CÁC PHA CÒN LẠI (chi tiết)

### Pha 1 — Listening đủ dạng
**Mục tiêu:** `listening.js` render được mọi dạng Listening + audio như thi thật.
**Việc:**
1. Port **matching kéo-thả** từ `reading.js` (`renderMatchingDrag`) sang `listening.js`; render khi `displayType==='MATCHING'`. Dùng `group.matchOptions` (A–I).
2. **MCQ chọn-2** (`MULTIPLE_CHOICE_MULTI`): render checkbox, chặn chọn quá `maxSelect` (=2). Khi nộp: gửi `"A,E"` cho **cả hai** số câu (khớp scorer Pha 7) — ghi rõ format này.
3. **Map/Plan labelling**: dùng component Pha 3 (ảnh + drop zones). Tạm thời nếu chưa có Pha 3 thì render dạng select chữ cái cho mỗi số câu.
4. **Audio player**: phát theo `section.audioUrl`, mặc định nghe **1 lần**, đồng bộ timer; chuyển part theo tiến trình. (IELTS thật: audio chạy liên tục; tối thiểu cho mỗi part 1 file.)
**Acceptance:** import 1 đề Listening Cam-style có đủ: note/table completion, MCQ đơn, MCQ chọn-2, matching (A–I), map labelling → render đúng, chấm tự động khớp đáp án.

### Pha 2 — Reading hoàn thiện
**Việc:**
1. **MCQ chọn-2** (giống Pha 1, dùng chung helper nếu tách được).
2. **Summary completion có word-bank** (`SUMMARY_WORDBANK`): kéo cụm từ `matchOptions` (A–H) thả vào ô `{{n}}` trong đoạn summary. (Tái dùng cơ chế kéo-thả của matching.)
3. Gộp mọi biến thể matching (headings/info/features/sentence-endings) về **một component theo `group.type`** (bỏ heuristic `resolveDisplayTypeForGroup` dễ vỡ — giờ có canonical `type`).
4. Neo đoạn A–G trong `passage.content` để matching-information hiển thị nhãn đoạn.
**Acceptance:** import 1 đề Reading đủ dạng (T/F/NG, Y/N/NG, matching headings/info/features, sentence endings, MCQ đơn+chọn-2, summary word-bank, sentence/note/table completion) → render + chấm đúng.

### Pha 3 — Component Map/Diagram labelling (dùng chung R + L)
**Việc:** tạo 1 module JS dùng chung:
- Hiển thị `group.imageUrl`, đặt **drop zone** theo `dropZones[].x/y` (toạ độ %).
- Token chữ cái (A–G) từ `matchOptions` kéo-thả vào drop zone; hỗ trợ **chuột + cảm ứng**; cho gỡ/đổi.
- Khi nộp: mỗi `questionNumber` ↔ 1 drop zone, giá trị = chữ cái đã thả → so khớp exact (đã có ở scorer).
**Acceptance:** 1 đề có map labelling: kéo đúng chữ vào vị trí, lưu/nộp đúng, chấm đúng.

### Pha 4 — Writing
**Việc:**
1. Hiển thị **ảnh Task 1** (`section.imageUrl` hoặc `passage.imageUrl`): chart/table/map/process.
2. **Đếm từ** realtime + cảnh báo dưới 150 (task1)/250 (task2).
3. Điều hướng 2 task, timer chung 60 phút.
4. Nộp → `AiGradingService` chấm 4 tiêu chí + band; admin override ở `grading.html`.
**Acceptance:** import đề Writing (task1 có ảnh + task2) → làm bài, đếm từ, nộp, có band AI + vào hàng chấm tay.

### Pha 5 — Speaking
**Việc:**
1. Part 1/2/3 hiển thị câu hỏi; **Part 2 cue card**: 1 phút chuẩn bị + 2 phút ghi âm.
2. Ghi âm trên trình duyệt (MediaRecorder) → upload Cloudinary (đã có `CloudinaryMediaStorageService`).
3. Chấm AI/tay (4 tiêu chí Speaking).
**Acceptance:** làm đủ 3 part, ghi âm + upload thành công, có kết quả chấm.

### Pha 6 — Vỏ phòng thi (trải nghiệm thật)
**Việc:** lớp khung dùng chung cho R/L/W/S:
- **Timer** theo kỹ năng (đếm ngược, tự nộp khi hết giờ).
- **Palette điều hướng câu** + trạng thái đã/chưa trả lời + **cờ đánh dấu (flag)**.
- Giữ **highlight + ghi chú** (đã có service `Note`/`Highlight`).
- Xác nhận nộp; **màn hình review** hiển thị đáp án đúng/sai + band (Reading đã có review, mở rộng cho Listening).
**Acceptance:** trải nghiệm liền mạch: timer + palette + flag + review giống thi thật.

---

## 6. Gotchas & quy ước (kinh nghiệm đã rút ra)

1. **Auth:** `AdminAuthorizationService` resolve user qua `authentication.getName()` (= email từ JWT subject) rồi `findByEmail` — KHÔNG dùng `getPrincipal() instanceof User` (principal là `Jwt`). Mọi endpoint `/api/admin/**` cần `hasRole("ADMIN")`.
2. **Role:** hệ thống chỉ còn 2 role `STUDENT`, `ADMIN`.
3. **examData gửi client đã bị xoá `correctAnswer`/`isCorrect`** (hàm `sanitizeExamDataForClient`). FE không bao giờ thấy đáp án; chấm ở backend.
4. **Đọc `group.type` (canonical)** ở FE mới, đừng đoán theo instruction.
5. **Choose-2 nộp:** thống nhất gửi `"A,E"` cho cả 2 số câu (hoặc tách từng chữ) — scorer Pha 7 nhận cả hai.
6. **Encoding:** một số file HTML/JS từng bị lỗi mojibake; luôn lưu UTF-8.
7. **Reading.js là bản tham chiếu** cho kéo-thả — port sang Listening thay vì viết lại.

---

## 7. Vận hành (chạy & test)

- **Backend** cần MySQL (`aimhigh`) + Redis + biến môi trường trong `AimHigh-backend/.env` (DB, JWT_SECRET, Redis, Cloudinary, Gemini...).
- **Chạy backend (cổng 8085):** từ `AimHigh-backend/`, nạp `.env` rồi `mvn spring-boot:run`. Khi build lại: `mvn clean compile` trước. Nếu chạy từ IDE: Rebuild + tắt tiến trình 8085 cũ tránh trùng cổng.
- **Frontend:** Live Server cổng 5500, `API_BASE` trỏ `localhost:8085`. CORS đã cho `localhost:5500`.
- **Test API nhanh không cần đăng nhập:** tự ký JWT HS512 bằng `JWT_SECRET` trong `.env`, claim `{ "sub": "<email>", "role": "ADMIN|STUDENT" }`, subject là email user có thật trong bảng `users` (vd `admin@aimhigh.local`). Gửi `Authorization: Bearer <token>`.
- **Tài khoản admin seed:** `admin@aimhigh.local` (role ADMIN). Sau khi tạo đề/test, **nhớ xoá dữ liệu probe** (DELETE `/api/admin/exams/{id}` hoặc SQL) để không để lại rác.
- **Dữ liệu mẫu vocab hiện có:** thư mục Basic/Advanced + vài chủ đề (từ các pha trước) — không liên quan exam.

## 8. Nghiệm thu tổng
Import cả 4 Test của Cambridge 20 (mỗi kỹ năng) theo schema mục 2 → mỗi đề render **đúng mọi dạng câu**, **chấm tự động khớp đáp án mẫu** (R/L), Writing/Speaking vào hàng chấm. Người thi: kéo-thả + điền từ + chọn mượt, có timer/audio/palette/review như thi thật.
