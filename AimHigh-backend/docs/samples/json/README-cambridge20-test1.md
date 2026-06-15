# Bộ đề Cambridge 20 — Test 1 (4 kỹ năng) — sẵn sàng import

Bốn file JSON dưới đây đúng **canonical schema** (mục 2 của `ai-docs/EXAM-SIMULATION-PLAN.md`), import thẳng qua trang admin hoặc API.

| Kỹ năng | File | Ghi chú |
|---|---|---|
| Listening | `cambrige-ielts20-listening.json` | 40 câu, 4 part, có `audioUrl` Cloudinary thật. Note completion, MCQ đơn, **MCQ chọn-2** (đáp án gán cho **cả 2 số câu** để được đủ 2 điểm). |
| Reading | `Reading/cambrige-ielts20.json` | 3 passage, 40 câu: T/F/NG, Y/N/NG, note/summary completion, matching paragraphs (kéo-thả), MCQ. |
| Writing | `cambrige-ielts20-writing.json` | Task 1 (bảng dân số New York, dữ liệu nhúng trong đề) + Task 2 (nước sạch). Chấm AI 4 tiêu chí. |
| Speaking | `cambrige-ielts20-speaking.json` | Part 1 (Walking), Part 2 cue card (play/film) + **1' chuẩn bị, 2' ghi âm**, Part 3 (theatre/acting). Ghi âm → Cloudinary → chấm AI. |

## Cách import
1. Đăng nhập admin (`admin@aimhigh.local`), vào **Test Manager → Import đề** (hoặc API `POST /api/admin/exams/import` với JSON body).
2. Chọn đúng file theo kỹ năng. Normalizer (Pha 0) tự chuẩn hoá `type` + `correctAnswer` khi import.
3. Vào trang luyện tương ứng (`listening.html`/`reading.html`/`writing.html`/`speaking.html`) với `?examId=<id>` để nghiệm thu render + chấm.

## Nghiệm thu nhanh
- **Listening/Reading:** làm vài câu mỗi dạng → nộp → màn review hiển thị đúng/sai + đáp án chuẩn. MCQ chọn-2: chọn đủ 2 đáp án đúng → được **2 điểm** (cả 2 số câu).
- **Writing:** nhập bài → "Chấm AI" → báo cáo 4 tiêu chí + sửa lỗi + bài mẫu Band 8+ (cần `GEMINI_API_KEY`).
- **Speaking:** Part 2 hiện đếm ngược chuẩn bị 60s; ghi âm Part 2 tự dừng ở 2 phút; nộp → báo cáo AI 4 tiêu chí + ghi chú phát âm.

## Đáp án tham chiếu (để đối chiếu khi chấm)
- **Listening:** 1 fish · 2 roof · 3 Spanish · 4 vegetarian · 5 Audley · 6 hotel · 7 reviews · 8 local · 9 30/thirty · 10 average · 11 A · 12 B · 13 C · 14 A · 15 B · 16 C · 17–18 A,E · 19–20 C,E · 21–22 C,E · 23–24 A,C · 25–26 A,B · 27 A · 28 B · 29 A · 30 C · 31 factories · 32 dead · 33 whale · 34 apartments · 35 park · 36 art · 37 beaches · 38 ferry · 39 bikes · 40 drone
- **Reading:** 1 F · 2 F · 3 F · 4 NG · 5 T · 6 T · 7 bulbs · 8 soil · 9 feathers · 10 deer · 11 1980 · 12 funding · 13 stakeholders · 14 C · 15 G · 16 B · 17 E · 18 C · 19 B · 20 A · 21 B · 22 C · 23 A · 24 oak · 25 flooring · 26 keel · 27 C · 28 A · 29 D · 30 C · 31 B · 32 G · 33 F · 34 E · 35 D · 36 Y · 37 NG · 38 N · 39 Y · 40 Y

> Sau khi nghiệm thu xong nhớ xoá đề probe nếu không muốn để lại dữ liệu test (`DELETE /api/admin/exams/{id}`).
