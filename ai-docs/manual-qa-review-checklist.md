# Checklist QA thủ công - Review mode (Reading/Listening)

## 1) Mục tiêu kiểm thử nhanh
- Xác nhận nút Xem đối chiếu ở trang kết quả điều hướng đúng theo kỹ năng.
- Xác nhận giao diện review hiển thị đúng/sai/bỏ qua chính xác.
- Xác nhận fallback đáp án đúng hoạt động khi thiếu `correctAnswer`.
- Xác nhận header website đã được ẩn trong giao diện làm bài để tăng không gian hiển thị.

## 2) Điều kiện chuẩn bị
- Backend đang chạy và API trả dữ liệu attempt/result bình thường.
- Có ít nhất 1 attempt Reading và 1 attempt Listening đã nộp bài.
- Trình duyệt đã làm mới cache (Ctrl + F5) hoặc mở tab ẩn danh.

## 3) Checklist luồng Reading review
- [ ] Mở trang `result.html?attemptId=<readingAttemptId>`.
- [ ] Nút hành động hiển thị text `Xem đối chiếu trong bài đọc`.
- [ ] Bấm nút, điều hướng sang `reading.html?mode=review&attemptId=...`.
- [ ] Trong review mode, không còn header navbar (logo/menu tài khoản) ở phía trên.
- [ ] Câu đúng có màu xanh, câu sai màu đỏ, câu bỏ qua màu xám.
- [ ] Khối chi tiết có đủ nút `Câu trước`, `Câu sau`, `Xem vị trí`.
- [ ] Bấm `Câu trước/Câu sau` chuyển đúng câu và cập nhật nội dung panel.
- [ ] Khối chi tiết hiển thị thứ tự: từ khóa -> lời giải -> câu gốc.
- [ ] Các chip meta hiển thị rõ: loại câu, bạn chọn, đáp án đúng.
- [ ] Ô trả lời không chỉnh sửa được trong review mode.

## 4) Checklist luồng Listening review
- [ ] Mở trang `result.html?attemptId=<listeningAttemptId>`.
- [ ] Nút hành động hiển thị text `Xem đối chiếu trong bài nghe`.
- [ ] Bấm nút, điều hướng sang `listening.html?mode=review&attemptId=...`.
- [ ] Trong review mode, không còn header navbar (logo/menu tài khoản) ở phía trên.
- [ ] Màu trạng thái câu hỏi trên list và ô số câu đúng/sai/bỏ qua chính xác.
- [ ] Panel chi tiết có đủ nút `Câu trước`, `Câu sau`, `Đến câu`.
- [ ] Bấm `Câu trước/Câu sau` chuyển đúng câu và highlight câu active.
- [ ] Nội dung panel hiển thị đủ 3 bước: từ khóa -> lời giải -> câu gốc.
- [ ] Các control làm bài đã bị khóa (không thể submit/auto-save mới trong review mode).

## 5) Checklist fallback đáp án thiếu
- [ ] Chuẩn bị 1 câu hỏi có `correctAnswer = null` hoặc rỗng.
- [ ] Nếu câu có `choices.isCorrect = true`, hệ thống hiển thị đáp án đúng từ choices.
- [ ] Nếu không có choices đúng, nhưng explanation có mẫu `Đáp án đúng: ...`, hệ thống trích được đáp án.
- [ ] Tại trang `result.html`, cột đáp án đúng không còn hiện `(Trống)` sai ngữ cảnh.
- [ ] Tại panel review Reading/Listening, chip `Đáp án đúng` hiển thị giá trị fallback.
- [ ] Với câu điền từ sai/bỏ qua, hint `Đáp án đúng:` xuất hiện bên dưới ô nhập.

## 6) Regression nhanh sau khi sửa UI
- [ ] Practice mode Reading vẫn chạy timer, điều hướng câu, submit bình thường.
- [ ] Practice mode Listening vẫn chạy audio/timer/submit bình thường.
- [ ] Real mode Reading/Listening không bị lệch top bar hoặc che nội dung.
- [ ] Mobile width (<= 768px): nút panel review tự xuống hàng, không tràn khung.

## 7) Mẫu ghi nhận lỗi nhanh
- Mã lỗi: 
- Môi trường (URL, mode, attemptId): 
- Bước tái hiện ngắn: 
- Kết quả hiện tại: 
- Kết quả mong đợi: 
- Ảnh/video đính kèm: 
