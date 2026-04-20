# Prompt tổng hợp: Hoàn thiện tính năng còn thiếu và sửa lỗi tồn đọng

Bạn là kỹ sư fullstack senior cho dự án AimHigh IELTS.
Hãy trực tiếp sửa code trong workspace hiện tại, không chỉ phân tích.
Mục tiêu là hoàn thiện các tính năng còn thiếu và sửa các lỗi đang tồn tại theo mức độ ưu tiên, sau đó tự kiểm tra và báo cáo kết quả.

## Bối cảnh kỹ thuật
- Frontend: HTML/CSS/JS thuần trong thư mục AimHigh-IELTS-Website.
- Backend: Spring Boot trong thư mục AimHigh-backend.
- Ưu tiên giữ nguyên các luồng đang chạy ổn: Reading/Listening attempt, profile, admin import exam.
- Không phá vỡ contract API hiện có nếu chưa cần thiết.

## Danh sách vấn đề đã xác minh (bắt buộc xử lý)
1. VocabularyController đang hard-code userId = 1L ở nhiều endpoint.
   - File: AimHigh-backend/src/main/java/vn/aimhigh/aimhighbackend/controller/VocabularyController.java
   - Yêu cầu: lấy user từ token (Authentication) giống các controller chuẩn, không dùng cứng userId.

2. OAuth callback lưu sai key token.
   - File: AimHigh-IELTS-Website/oauth2_callback.html
   - Hiện tại lưu aimhigh_accessToken, trong khi toàn hệ thống đọc aimhigh_token.
   - Yêu cầu: chuẩn hóa về aimhigh_token và aimhigh_refreshToken, đảm bảo sau callback vào được dashboard và các API authenticated hoạt động.

3. API lịch sử làm bài của user đang trả rỗng.
   - File: AimHigh-backend/src/main/java/vn/aimhigh/aimhighbackend/controller/ResultController.java
   - Endpoint: GET /api/users/me/attempts hiện trả List rỗng.
   - Yêu cầu: implement thật (service + mapping response), trả đúng dữ liệu theo user đăng nhập.

4. Auth flow frontend còn phân mảnh.
   - File: AimHigh-IELTS-Website/login.html
   - File: AimHigh-IELTS-Website/register.html
   - Yêu cầu: bỏ gọi fetch inline cho login/register, chuyển về dùng chung hàm trong js/api.js để đồng nhất xử lý lỗi và token.

5. practice.js đang fetch trực tiếp thay vì gateway API dùng chung.
   - File: AimHigh-IELTS-Website/js/practice.js
   - Yêu cầu: chuyển sang dùng hàm API chung trong js/api.js.

6. Notes/Highlights chưa kết nối backend trong Reading/Listening.
   - File: AimHigh-IELTS-Website/js/reading.js
   - File: AimHigh-IELTS-Website/js/listening.js
   - File API có sẵn: AimHigh-IELTS-Website/js/api.js
   - Yêu cầu: thay cơ chế lưu tạm cục bộ bằng gọi API create/update/delete note và create/delete highlight theo attempt đang làm.

7. Vocabulary frontend còn lệch kiến trúc backend.
   - File: AimHigh-IELTS-Website/vocabulary.html
   - File: AimHigh-IELTS-Website/js/Vocabulary.js
   - Yêu cầu: kết nối kho/sổ từ vựng với endpoint backend user-vocabulary, đồng bộ đúng theo user đăng nhập.

## Thứ tự triển khai bắt buộc
- Bước 1: Sửa P0 trước (mục 1 và 2).
- Bước 2: Hoàn thiện API dữ liệu thật cho attempts (mục 3).
- Bước 3: Chuẩn hóa frontend auth + practice API usage (mục 4, 5).
- Bước 4: Tích hợp notes/highlights + vocabulary backend (mục 6, 7).
- Bước 5: Chạy kiểm tra lỗi và test smoke các luồng chính.

## Tiêu chí nghiệm thu
1. Không còn userId hard-code trong controller nghiệp vụ theo user.
2. Đăng nhập OAuth xong có aimhigh_token và gọi được endpoint cần auth.
3. Trang lịch sử/dashboard lấy được dữ liệu attempts thật từ backend.
4. login/register/practice không còn fetch inline trực tiếp khi đã có API gateway chung.
5. Reading/Listening lưu note/highlight thành công qua backend theo attempt.
6. vocabulary.html hiển thị và thao tác dữ liệu theo user-vocabulary backend.
7. Không phát sinh lỗi mới ở các file đã chỉnh.

## Cách làm việc mong muốn
- Tự đọc code liên quan trước khi sửa.
- Sửa theo patch nhỏ, an toàn, dễ review.
- Sau mỗi cụm sửa lớn, tự chạy validate (lint/build/check errors) trong phạm vi có thể.
- Nếu gặp blocker thật sự (thiếu endpoint/phụ thuộc), nêu rõ blocker và đề xuất cách xử lý cụ thể.

## Đầu ra bắt buộc
- Danh sách file đã sửa và lý do.
- Danh sách endpoint/contract thay đổi (nếu có).
- Kết quả kiểm tra sau sửa (build, lỗi tĩnh, test nhanh).
- Danh sách việc còn lại (nếu chưa hoàn tất 100%).
