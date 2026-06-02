# Báo cáo Phân tích Hiện trạng và Kế hoạch Hoàn thiện Dự án AimHigh-IELTS-Website

Dưới đây là báo cáo phân tích tổng thể về hiện trạng, lỗ hổng và kế hoạch hành động dành cho dự án **AimHigh-IELTS-Website** dựa trên việc rà soát toàn bộ source code, file cấu hình và tài liệu của hệ thống.

## 1. Phân tích hiện trạng (What is done)

**1.1. Kiến trúc tổng thể:**
*   **Backend:** Áp dụng chuẩn cấu trúc 3-layer phân tách rõ ràng (Controller - Service - Repository). Hệ thống sử dụng DTO pattern rất tốt để giao tiếp giữa Client và Server, giúp ẩn thông tin nội bộ của Entity.
*   **Frontend:** Sử dụng kiến trúc Vanilla JS / HTML / CSS thuần (Không dùng Framework). Code được chia module hợp lý theo tính năng (VD: `api.js` làm Gateway giao tiếp Backend, `practice.js`, `auth.js`, v.v.).

**1.2. Các chức năng và API đã hoạt động:**
*   **Authentication & Authorization:** Đã có hệ thống đăng ký, đăng nhập Local và OAuth2 (Google) với Stateless JWT token. Đã phân quyền truy cập `Role-based` (ví dụ: các API `/api/admin/**` đã được cấu hình chặn bằng `SecurityConfig`).
*   **Module User & Bài thi:** Đã làm được luồng hiển thị danh sách bài thi, tính năng bắt đầu làm bài, lưu trữ tiến độ (Attempt Progress), nộp bài (Submit) và trả kết quả cho Reading & Listening. Tích hợp tính năng phụ trợ khá tốt (Note, Highlight, Vocabulary).
*   **Module Admin:** Có API cho Import đề thi từ Excel/JSON, cung cấp API lấy Template đề thi, quản lý (Test manager) và Admin Dashboard.

**1.3. Công nghệ Core (Theo cấu hình `pom.xml` và `application.properties`):**
*   **Java 21** kết hợp **Spring Boot 4.0.1**.
*   **Database:** MySQL (với Spring Data JPA) và Redis (Spring Boot Data Redis).
*   **Security:** Spring Security & OAuth2 Client/Resource Server.
*   **Cloud & File:** Cloudinary (lưu media, audio, avatar) và Apache POI (xử lý Excel).

---

## 2. Phân tích lỗ hổng và phần dang dở (What is missing)

**2.1. Lỗ hổng về Performance và Logic (Nghiêm trọng):**
*   **Logic tính toán In-memory tốn tài nguyên:** Tại `AdminDashboardServiceImpl`, hàm `getDashboardStats()` đang gọi `attemptRepository.findAll()` để load **toàn bộ dữ liệu** của bảng Attempt lên RAM sau đó mới xử lý đếm và phân loại (`weeklyAttempts`). Điều này sẽ gây lỗi tràn bộ nhớ (Out of Memory) khi hệ thống có hàng chục ngàn lượt làm bài.
*   **N+1 Query Issue:** Việc cấu hình Hibernate ở mặc định và fetch các Relation (`Attempt` -> `Exam` -> `Skill`) có nguy cơ rất cao gặp N+1 Query.

**2.2. Phần dang dở và nợ kỹ thuật (Technical Debt):**
*   **Thiếu API thực tế trên Frontend (`api.js`):** File `api.js` có các hàm/endpoint hướng tới `/tests`, `/results/history`, `/flashcards/*`, `/users/*` nhưng thực chất Backend chưa có Controller nào (hoặc chỉ mới mock) để đáp ứng.
*   **Tính năng Writing & Speaking:** Mới chỉ lưu trạng thái `SUBMITTED`, hệ thống chưa có quy trình chấm điểm (Grading Workflow) rành mạch cho Admin chấm tay hoặc API gửi sang AI chấm tự động.
*   **Cấu trúc dữ liệu "Status" của Exam:** Đang sử dụng field boolean `isActive` để phân biệt hiển thị. Điều này gộp chung khái niệm `draft` (nháp) và `archived` (lưu trữ) thành một (`false`), gây khó khăn cho Admin quản lý.
*   **Global Exception Handling:** Cấu trúc project có package `exception` với các custom exception (như `BadRequestException`, `UnauthorizedException`), nhưng chưa thấy đề cập rõ đến class `@RestControllerAdvice` để chuẩn hóa chung Response cho toàn bộ ứng dụng khi có lỗi.

---

## 3. Kế hoạch hành động (Action Plan)

Dưới đây là To-do List ưu tiên hoàn thiện dự án.

| Mức độ | Giai đoạn (Phase) | Tên công việc (Task) | Mô tả chi tiết |
| :---: | :--- | :--- | :--- |
| **Cao** | 1: DB & Core Optimization | **Refactor Admin Dashboard** | Thay thế logic in-memory bằng các lệnh `@Query` SQL/JPQL để nhóm (`GROUP BY`), đếm trực tiếp tại Database. |
| **Cao** | 1: DB & Core Optimization | **Cập nhật Exam Status** | Thay field `isActive` bằng Enum `ExamStatus` (DRAFT, PUBLISHED, ARCHIVED). |
| **Cao** | 1: DB & Core Optimization | **Global Exception Handler** | Thêm class `@RestControllerAdvice` bắt các lỗi văng ra và trả về định dạng `ApiResponse` chuẩn. |
| **Trung** | 2: API Integration | **Hoàn thiện Legacy APIs** | Bổ sung các API quản lý lịch sử (History), User Management, và Flashcard mà `api.js` đang gọi thiếu. |
| **Trung** | 2: API Integration | **Tối ưu Validation** | Bổ sung triệt để các annotation `@Valid`, `@NotBlank`, `@Size` vào các Request DTO. |
| **Thấp** | 3: UI/UX & Flow | **Luồng chấm Writing/Speaking**| Xây dựng màn hình Admin Grading hoặc tích hợp webhook với dịch vụ AI để xử lý. |
| **Thấp** | 3: UI/UX & Flow | **Bảo mật Spam/Rate Limit** | Cấu hình Redis Rate Limiting cho API Auth/Submit. |

### 🚀 Prompts tiếp theo (Next-step Prompts)

1. **Prompt 1:** "Hãy refactor phương thức `getDashboardStats` trong `AdminDashboardServiceImpl`. Xóa việc dùng `findAll()` và thay bằng cách định nghĩa các `@Query` JPQL trong `AttemptRepository` để tính tổng số lượng bài nộp, số attempt trong tuần và gom nhóm theo Skill. Hãy trả code Java chi tiết."
2. **Prompt 2:** "Tiến hành cập nhật hệ thống trạng thái của bài thi. Hãy tạo Enum `ExamStatus` (DRAFT, PUBLISHED, ARCHIVED), sau đó hướng dẫn tôi cách đổi field `isActive` trong bảng `Exam` sang dùng Enum này, đồng thời cập nhật lại logic của `ExamService`."
3. **Prompt 3:** "Hãy tạo cho tôi một class `GlobalExceptionHandler` sử dụng `@RestControllerAdvice`. Class này cần bắt và xử lý các lỗi như `BadRequestException`, `UnauthorizedException`, lỗi Validation của Spring (`MethodArgumentNotValidException`), trả về chung một khuôn dạng chuẩn của `ApiResponse`."
4. **Prompt 4:** "Dựa trên file `api.js` ở Frontend đang gọi đến các path legacy, hãy tạo cho tôi một `HistoryController` và phương thức tương ứng trong Service để xử lý API lấy danh sách bài test đã làm (Có hỗ trợ phân trang - Pagination)."

---

## 4. Giải pháp đề xuất (Technical Solutions)

1. **Về xử lý truy vấn dữ liệu (Performance):**
   - Đảm bảo trong Spring Data JPA có sử dụng `@EntityGraph` hoặc các truy vấn `JOIN FETCH` đối với các API load chi tiết bài thi để ngăn chặn N+1 Query (do một `Exam` chứa rất nhiều `Question`, `Choice`).
2. **Về kiến trúc Frontend:**
   - Việc quản lý State bài thi (hẹn giờ, chọn đáp án, đổi màu UI) hoàn toàn bằng Vanilla JS ở `reading.js`, `listening.js` tiềm ẩn rủi ro sinh ra rác (Spaghetti code) khi logic scale lên. 
   - *Giải pháp:* Nếu chưa thể đập đi làm lại bằng React/Vue, nên áp dụng Pattern dạng Observer / PubSub Event để quản lý State trên Frontend nhằm gỡ rối cho các module.
3. **Bảo mật ứng dụng (Security):**
   - Cần cấu hình Rate Limiting (Sử dụng Spring Cloud Gateway hoặc thư viện Bucket4j tích hợp Redis) ở các API Submit và API Authentication để tránh botnet ddos làm sập DB.
   - Kiểm tra kỹ việc cấu hình CORS trên Production, không được phép mapping `*` cho `allowedOrigins` khi release.
