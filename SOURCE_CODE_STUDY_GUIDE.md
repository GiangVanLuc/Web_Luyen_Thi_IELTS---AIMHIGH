# HƯỚNG DẪN ĐỌC SOURCE CODE - AIMHIGH

Mục đích của file này là giúp bạn đọc và ôn source trước khi báo cáo. Tài liệu chỉ rõ nên đọc từ đâu, đọc theo thứ tự nào, và khi cô hỏi “chức năng này code ở đâu” thì bạn phải chỉ được đúng file, đúng hàm, đúng controller, đúng service.

Ngày tạo: 02/06/2026

---

## 0) Cách dùng tài liệu này

Không nên học thuộc từng file một cách rời rạc. Dự án này phải đọc theo luồng:

```text
Màn hình HTML
-> file JS xử lý sự kiện/render
-> hàm API trong js/api.js
-> Controller backend
-> Service xử lý nghiệp vụ
-> Repository truy vấn database
-> Model/Entity là bảng dữ liệu
```

Khi bị hỏi một chức năng, bạn trả lời theo mẫu:

```text
Chức năng này bắt đầu ở <page>.html.
Phần xử lý giao diện nằm ở js/<file>.js, hàm <tên hàm>.
Hàm đó gọi backend qua js/api.js, hàm <tên hàm API>.
Backend nhận request ở <Controller>.java.
Nghiệp vụ xử lý ở <ServiceImpl>.java.
Dữ liệu liên quan nằm trong <Entity>.java và <Repository>.java.
```

Không cần đọc các file sinh ra bởi build:

- `AimHigh-backend/target/`
- `.idea/`
- `.git/`
- file log hoặc file tạm

Các phần cần đọc chính:

- `AimHigh-backend/src/main/java/vn/aimhigh/aimhighbackend/`
- `AimHigh-backend/src/main/resources/application.properties`
- `AimHigh-IELTS-Website/*.html`
- `AimHigh-IELTS-Website/js/`
- `AimHigh-IELTS-Website/css/`

---

## 1) Thứ tự đọc để không bị lạc

### Bước 1: Đọc tổng quan cấu trúc

Đọc các file này trước:

1. `SOURCE_CODE_MAP.md`
2. `AimHigh-backend/pom.xml`
3. `AimHigh-backend/src/main/resources/application.properties`
4. `AimHigh-IELTS-Website/js/api.js`

Mục tiêu:

- Biết backend dùng Spring Boot, JPA, Security, Redis, MySQL, Cloudinary, Gemini.
- Biết frontend là HTML/CSS/JS tĩnh, không dùng React/Vue.
- Biết `js/api.js` là cầu nối chính giữa frontend và backend.

### Bước 2: Đọc backend theo lớp

Thứ tự đọc backend:

1. `AimHighBackendApplication.java`
2. `config/`
3. `enums/`
4. `model/`
5. `repository/`
6. `dto/request/` và `dto/response/`
7. `controller/`
8. `service/`
9. `service/impl/`
10. `exception/`

Lý do: backend Spring Boot chạy theo hướng Controller -> Service -> Repository -> Entity. Nếu đọc service trước khi biết entity thì sẽ khó hiểu.

### Bước 3: Đọc frontend theo page

Với mỗi màn hình:

1. Đọc file HTML để biết layout, id, class, button, form.
2. Xem cuối file HTML đang import script nào.
3. Đọc file JS được import.
4. Tìm `DOMContentLoaded`.
5. Tìm hàm gọi API trong `js/api.js`.
6. Đọc CSS nếu cần giải thích giao diện.

Ví dụ:

```text
practice.html -> js/api.js + js/practice.js -> css/test.css
```

---

## 2) Bản đồ backend tổng quát

### 2.1 Entry point và cấu hình

- `AimHigh-backend/src/main/java/vn/aimhigh/aimhighbackend/AimHighBackendApplication.java:10`
  - Hàm `main()` chạy Spring Boot.

- `config/SecurityConfig.java:34`
  - Cấu hình bảo mật, route public/private, JWT/OAuth2.

- `config/CorsConfig.java:13`
  - Cho phép frontend gọi backend.

- `config/RedisConfig.java:17`
  - Cấu hình Redis.

- `config/CloudinaryConfig.java:12`
  - Cấu hình Cloudinary để upload media/avatar/audio.

- `config/GeminiConfig.java:8`
  - Cấu hình Gemini AI.

- `exception/GlobalExceptionHandler.java:17`
  - Bắt lỗi toàn cục và trả về `ApiResponse`.

### 2.2 Controller map

Controller là nơi nhận request từ frontend.

#### Auth

- `controller/AuthController.java:17` base `/api/auth`
- `POST /register` dòng 25
- `POST /login` dòng 34
- `POST /refresh` dòng 41
- `POST /logout` dòng 49

#### Exam public

- `controller/ExamController.java:16` base `/api/exams`
- `GET /api/exams` dòng 22
- `GET /api/exams/{id}` dòng 29

#### Attempt

- `controller/AttemptController.java:22` base `/api/attempts`
- `POST /start` dòng 29
- `POST /{id}/progress` dòng 37
- `GET /{id}/progress` dòng 47
- `POST /{id}/submit` dòng 55

#### Result

- `controller/ResultController.java:20` base `/api`
- `GET /attempts/{id}/result` dòng 27
- `GET /users/me/attempts` dòng 35
- `GET /results/history` dòng 41

#### Practice note/highlight

- `controller/PracticeController.java:29` base `/api`
- `GET /attempts/{id}/questions/{qId}/answer` dòng 39
- `POST /attempts/{id}/notes` dòng 58
- `GET /attempts/{id}/notes` dòng 67
- `DELETE /notes/{id}` dòng 75
- `PATCH /notes/{id}` dòng 84
- `POST /attempts/{id}/highlights` dòng 95
- `GET /attempts/{id}/highlights` dòng 104
- `DELETE /highlights/{id}` dòng 113
- `PATCH /highlights/{id}/note` dòng 122

#### Vocabulary user

- `controller/VocabularyController.java:28` base `/api`
- `GET /vocabulary/lookup` dòng 35
- `POST /user-vocabulary` dòng 43
- `GET /user-vocabulary` dòng 52
- `DELETE /user-vocabulary/{id}` dòng 81
- `PATCH /user-vocabulary/{id}/status` dòng 90
- `PATCH /user-vocabulary/{id}` dòng 100
- `POST /user-vocabulary/batch-save` dòng 110
- `PATCH /user-vocabulary/batch-status` dòng 119
- `POST /user-vocabulary/batch-delete` dòng 128
- `GET /user-vocabulary-groups` dòng 137
- `POST /user-vocabulary-groups` dòng 143
- `PATCH /user-vocabulary-groups/{groupId}` dòng 152
- `DELETE /user-vocabulary-groups/{groupId}` dòng 162

#### User/profile

- `controller/UserController.java:24` base `/api/users`
- `GET /profile` dòng 31
- `PUT /profile` dòng 37
- `POST /avatar` dòng 45
- `GET /dashboard` dòng 53
- `PUT /change-password` dòng 59

#### Admin exam

- `controller/AdminExamController.java:18` base `/api/admin/exams`
- `POST /import/json` dòng 25
- `POST /import/excel` dòng 31
- `POST /` dòng 37
- `GET /template/reading` dòng 42
- `GET /template/listening` dòng 49
- `GET /template/reading/full-sample` dòng 56
- `GET /template/listening/full-sample` dòng 63
- `GET /` dòng 70
- `PUT /{id}` dòng 78
- `PATCH /{id}/status` dòng 85
- `DELETE /{id}` dòng 93

#### Admin vocabulary

- `controller/AdminVocabularyController.java:26` base `/api/admin/vocabulary`
- `GET /` dòng 32
- `POST /` dòng 42
- `DELETE /{id}` dòng 49
- `POST /import/json` dòng 55
- `POST /import/excel` dòng 62

#### Admin submissions

- `controller/AdminSubmissionController.java:20` base `/api/admin/submissions`
- `GET /ungraded` dòng 27
- `POST /{id}/grade` dòng 38

#### Admin users

- `controller/AdminUserController.java:17` base `/api/admin/users`
- `GET /` dòng 23
- `PATCH /{id}/role` dòng 41
- `PATCH /{id}/lock` dòng 52

#### Các controller khác

- `controller/AdminDashboardController.java:13` thống kê admin.
- `controller/AdminMediaController.java:16` upload media phía admin.
- `controller/MediaController.java:17` upload media phía user.
- `controller/AiController.java:34` AI chat.
- `controller/NotificationController.java:19` thông báo.
- `controller/StudyLogController.java:22` heatmap học tập.

### 2.3 Service map

#### Auth

- `service/impl/AuthenticationServiceImpl.java:36` đăng ký.
- `service/impl/AuthenticationServiceImpl.java:62` đăng nhập.
- `service/impl/AuthenticationServiceImpl.java:87` refresh token.
- `service/impl/AuthenticationServiceImpl.java:116` đăng xuất.
- `service/impl/JwtServiceImpl.java:34` tạo access token.
- `service/impl/JwtServiceImpl.java:57` tạo refresh token.
- `service/impl/JwtServiceImpl.java:79` kiểm tra token.
- `service/UserDetailServiceCustomize.java:18` load user cho Spring Security.

#### Exam

- `service/impl/ExamServiceImpl.java:43` lấy danh sách đề public.
- `service/impl/ExamServiceImpl.java:57` lấy danh sách đề admin.
- `service/impl/ExamServiceImpl.java:85` tạo đề admin.
- `service/impl/ExamServiceImpl.java:114` sửa đề admin.
- `service/impl/ExamServiceImpl.java:147` cập nhật trạng thái đề.
- `service/impl/ExamServiceImpl.java:155` xoá đề.
- `service/impl/ExamServiceImpl.java:212` lấy chi tiết đề.

#### Import exam

- `service/impl/ExamImportServiceImpl.java:61` import JSON.
- `service/impl/ExamImportServiceImpl.java:490` import Excel.
- `service/impl/ExamImportServiceImpl.java:506` tải template.
- `service/impl/ExamImportServiceImpl.java:522` tải full sample template.

#### Attempt/result/scoring

- `service/impl/AttemptServiceImpl.java:46` bắt đầu làm bài.
- `service/impl/AttemptServiceImpl.java:92` lưu tiến độ.
- `service/impl/AttemptServiceImpl.java:113` lấy tiến độ.
- `service/impl/AttemptServiceImpl.java:136` nộp bài.
- `service/impl/ScoringServiceImpl.java:31` chấm attempt.
- `service/impl/ScoringServiceImpl.java:90` chấm một câu.
- `service/impl/ScoringServiceImpl.java:146` tính IELTS band.
- `service/impl/ResultServiceImpl.java:39` lấy chi tiết kết quả.
- `service/impl/ResultServiceImpl.java:76` lấy attempts của user.
- `service/impl/ResultServiceImpl.java:91` lấy lịch sử làm bài.

#### Vocabulary

- `service/impl/VocabularyServiceImpl.java:57` tra từ.
- `service/impl/VocabularyServiceImpl.java:75` lưu từ vào sổ của user.
- `service/impl/VocabularyServiceImpl.java:136` lấy từ vựng của user.
- `service/impl/VocabularyServiceImpl.java:186` xoá từ của user.
- `service/impl/VocabularyServiceImpl.java:193` cập nhật trạng thái học.
- `service/impl/VocabularyServiceImpl.java:205` cập nhật từ.
- `service/impl/VocabularyServiceImpl.java:229` lưu hàng loạt.
- `service/impl/VocabularyServiceImpl.java:270` cập nhật trạng thái hàng loạt.
- `service/impl/VocabularyServiceImpl.java:299` xoá hàng loạt.
- `service/impl/VocabularyServiceImpl.java:324` lấy nhóm từ.
- `service/impl/VocabularyServiceImpl.java:338` tạo nhóm.
- `service/impl/VocabularyServiceImpl.java:364` đổi tên nhóm.
- `service/impl/VocabularyServiceImpl.java:390` xoá nhóm.

#### Admin

- `service/impl/AdminDashboardServiceImpl.java:27` thống kê dashboard.
- `service/impl/AdminSubmissionServiceImpl.java:36` lấy bài chưa chấm.
- `service/impl/AdminSubmissionServiceImpl.java:83` chấm bài.
- `service/impl/AdminVocabularyServiceImpl.java:50` lấy từ vựng admin.
- `service/impl/AdminVocabularyServiceImpl.java:71` tạo/sửa từ.
- `service/impl/AdminVocabularyServiceImpl.java:77` xoá từ.
- `service/impl/AdminVocabularyServiceImpl.java:85` import vocabulary JSON.
- `service/impl/AdminVocabularyServiceImpl.java:105` import vocabulary Excel.
- `service/impl/UserServiceImpl.java:132` admin lấy danh sách user.
- `service/impl/UserServiceImpl.java:139` đổi role user.
- `service/impl/UserServiceImpl.java:148` khoá/mở khoá user.

#### Note/highlight

- `service/impl/NoteServiceImpl.java:31` tạo note.
- `service/impl/NoteServiceImpl.java:58` lấy notes.
- `service/impl/NoteServiceImpl.java:67` xoá note.
- `service/impl/NoteServiceImpl.java:75` sửa note.
- `service/impl/HighlightServiceImpl.java:33` tạo highlight.
- `service/impl/HighlightServiceImpl.java:54` lấy highlights.
- `service/impl/HighlightServiceImpl.java:73` xoá highlight.
- `service/impl/HighlightServiceImpl.java:81` sửa note của highlight.

#### Media/AI/Redis

- `service/impl/CloudinaryMediaStorageService.java:36` upload file.
- `service/AiGradingService.java:43` AI grading.
- `service/impl/RedisServiceImpl.java:18` set Redis key.
- `service/impl/RedisServiceImpl.java:72` cache exam.
- `service/impl/RedisServiceImpl.java:86` lưu progress.
- `service/impl/RedisServiceImpl.java:114` cache result.

---

## 3) Bản đồ model/database

### User

- `model/User.java`: tài khoản, role, provider, password, profile.
- `enums/Role.java`: USER/ADMIN.
- `enums/AuthProvider.java`: LOCAL/GOOGLE.

### Exam

- `model/Exam.java`: đề thi, skill, type, level, duration, status, examData.
- `model/ReadingPassage.java`: passage reading.
- `model/ListeningPart.java`: section/part listening.
- `model/Question.java`: câu hỏi.
- `model/Choice.java`: đáp án lựa chọn.
- `model/QuestionType.java`: loại câu hỏi.
- `model/MapLabel.java`, `model/MatchingItem.java`: câu hỏi map/matching.
- `enums/Skill.java`: READING/LISTENING/WRITING/SPEAKING.
- `enums/ExamStatus.java`: PUBLISHED/DRAFT/ARCHIVED.
- `enums/ExamType.java`, `enums/ExamLevel.java`: loại và độ khó đề.

### Attempt/result

- `model/Attempt.java`: một lần làm bài.
- `model/Answer.java`: câu trả lời của user.
- `enums/AttemptMode.java`: PRACTICE/EXAM.
- `enums/AttemptStatus.java`: IN_PROGRESS/SUBMITTED/GRADED.

### Vocabulary

- `model/Vocabulary.java`: từ vựng gốc.
- `model/VocabularyExample.java`: ví dụ của từ.
- `model/UserVocabulary.java`: từ user đã lưu.
- `model/UserVocabularyGroup.java`: nhóm từ của user.

### Practice annotation

- `model/Note.java`: note trong bài thi.
- `model/Highlight.java`: highlight passage.

### Other

- `model/StudyLog.java`: heatmap học tập.
- `model/Notification.java`: thông báo.
- `model/UserProgress.java`: tiến độ.
- `model/Source.java`, `model/Topic.java`: metadata.

---

## 4) Bản đồ frontend tổng quát

### 4.1 File nền cần đọc đầu tiên

- `AimHigh-IELTS-Website/js/api.js:3`
  - `API_BASE = http://localhost:8080/api`
  - Toàn bộ hàm fetch backend nằm ở đây.

- `AimHigh-IELTS-Website/js/navbar.js:1`
  - Xử lý navbar, login state, dropdown.

- `AimHigh-IELTS-Website/css/style.css`
  - CSS chung.

- `AimHigh-IELTS-Website/css/test.css`
  - CSS cho practice/reading/listening/result.

- `AimHigh-IELTS-Website/css/Vocabulary.css`
  - CSS riêng cho từ vựng.

### 4.2 API frontend trong `js/api.js`

#### Auth/profile

- `apiFetch()` dòng 8
- `apiLogin()` dòng 61
- `apiRegister()` dòng 85
- `apiLogout()` dòng 105
- `getProfile()` dòng 180
- `updateProfile()` dòng 188
- `apiUploadAvatar()` dòng 199
- `getDashboardStats()` dòng 218
- `changePassword()` dòng 234

#### Admin

- `adminGetDashboardStats()` dòng 225
- `adminUploadMedia()` dòng 287
- `adminCreateTest()` dòng 310
- `adminUpdateTest()` dòng 322
- `adminUpdateTestStatus()` dòng 334
- `adminDeleteTest()` dòng 345
- `adminGetTests()` dòng 355
- `adminImportExamJson()` dòng 360
- `adminImportExamExcel()` dòng 367
- `adminGetVocabulary()` dòng 394
- `adminUpsertVocabulary()` dòng 399
- `adminDeleteVocabulary()` dòng 406
- `adminImportVocabularyJson()` dòng 412
- `adminImportVocabularyExcel()` dòng 419
- `adminGetUngradedSubmissions()` dòng 472
- `adminGradeSubmission()` dòng 482
- `adminGetUsers()` dòng 493
- `adminUpdateUserRole()` dòng 503
- `adminToggleUserLock()` dòng 515

#### Exam/attempt/result

- `getExamData()` dòng 535
- `getExamList()` dòng 542
- `startAttempt()` dòng 551
- `saveAttemptProgress()` dòng 565
- `getAttemptProgress()` dòng 576
- `submitAttemptAnswers()` dòng 585
- `getAttemptResult()` dòng 600
- `getMyAttempts()` dòng 607

#### Note/highlight

- `createNote()` dòng 613
- `updateNote()` dòng 619
- `getAttemptNotes()` dòng 626
- `deleteNote()` dòng 630
- `createHighlight()` dòng 634
- `getAttemptHighlights()` dòng 641
- `updateHighlightNote()` dòng 646
- `deleteHighlight()` dòng 653

#### Vocabulary

- `apiLookupVocab()` dòng 659
- `apiSaveUserVocab()` dòng 663
- `apiGetUserVocab()` dòng 688
- `apiDeleteUserVocab()` dòng 707
- `apiUpdateUserVocabStatus()` dòng 713
- `apiUpdateUserVocab()` dòng 720
- `apiBatchSaveUserVocab()` dòng 727
- `apiBatchUpdateUserVocabStatus()` dòng 739
- `apiBatchDeleteUserVocab()` dòng 746
- `apiGetUserVocabGroups()` dòng 753
- `apiCreateUserVocabGroup()` dòng 757
- `apiRenameUserVocabGroup()` dòng 764
- `apiDeleteUserVocabGroup()` dòng 771

---

## 5) Map từng chức năng báo cáo

### 5.1 Đăng ký, đăng nhập, đăng xuất

Frontend:

- `login.html`
- `register.html`
- `js/auth.js:51` `handleLogin`
- `js/auth.js:103` `handleRegister`
- `js/auth.js:164` `checkAuth`
- `js/auth.js:171` `logout`
- `js/api.js:61` `apiLogin`
- `js/api.js:85` `apiRegister`
- `js/api.js:105` `apiLogout`

Backend:

- `controller/AuthController.java:17`
- `service/impl/AuthenticationServiceImpl.java:36`
- `service/impl/AuthenticationServiceImpl.java:62`
- `service/impl/JwtServiceImpl.java:34`
- `service/impl/RedisServiceImpl.java:36`
- `repository/UserRepository.java`
- `model/User.java`

Luồng chạy:

```text
Form login
-> handleLogin
-> apiLogin
-> POST /api/auth/login
-> AuthController.login
-> AuthenticationServiceImpl.login
-> UserRepository
-> JwtServiceImpl
-> lưu token vào localStorage
```

### 5.2 Trang danh sách đề thi

Frontend:

- `practice.html`
- `js/practice.js:15` DOMContentLoaded
- `js/practice.js:34` `fetchExams`
- `js/practice.js:70` `renderExamCard`
- `js/practice.js:173` `initPracticeFilters`
- `js/practice.js:364` `openModeModal`
- `js/practice.js:382` `startActualTest`
- `js/api.js:542` `getExamList`

Backend:

- `controller/ExamController.java:16`
- `controller/ExamController.java:22`
- `service/impl/ExamServiceImpl.java:43`
- `repository/ExamRepository.java`
- `model/Exam.java`

Luồng chạy:

```text
practice.html load
-> fetchExams
-> getExamList
-> GET /api/exams
-> ExamController.getExams
-> ExamServiceImpl.getExams
-> ExamRepository.findByStatus(PUBLISHED)
-> renderExamCard
```

### 5.3 Mở bài Reading

Frontend:

- `reading.html`
- `js/reading.js:993` DOMContentLoaded
- `js/reading.js:1004` `loadExam`
- `js/reading.js:1233` `renderPassages`
- `js/reading.js:1353` `renderQuestions`
- `js/reading.js:1738` `startTimer`
- `js/reading.js:1755` `buildNav`
- `js/reading.js:1917` `initRealMode`
- `js/reading.js:2465` `submitTest`
- `js/reading.js:2484` `confirmSub`
- `js/reading.js:2541` `startAutoSave`
- `js/reading.js:2564` `restoreProgress`

Backend:

- `controller/ExamController.java:29` lấy chi tiết đề.
- `service/impl/ExamServiceImpl.java:212` xử lý chi tiết đề.
- `controller/AttemptController.java:29` bắt đầu làm bài.
- `controller/AttemptController.java:37` lưu tiến độ.
- `controller/AttemptController.java:55` nộp bài.
- `service/impl/AttemptServiceImpl.java:46`
- `service/impl/AttemptServiceImpl.java:92`
- `service/impl/AttemptServiceImpl.java:136`
- `service/impl/ScoringServiceImpl.java:31`
- `service/impl/ResultServiceImpl.java:39`

Luồng chạy:

```text
startActualTest
-> reading.html?examId=...
-> loadExam
-> getExamData
-> GET /api/exams/{id}
-> startAttempt
-> POST /api/attempts/start
-> renderPassages/renderQuestions
-> submitTest/confirmSub
-> submitAttemptAnswers
-> POST /api/attempts/{id}/submit
-> AttemptServiceImpl.submitAttempt
-> ScoringServiceImpl.scoreAttempt
-> ResultResponse
```

### 5.4 Mở bài Listening

Frontend:

- `listening.html`
- `js/listening.js:643` DOMContentLoaded
- `js/listening.js:655` `loadExam`
- `js/listening.js:760` `renderQuestions`
- `js/listening.js:903` `updateAudioTotalTime`
- `js/listening.js:910` `updateAudioSrc`
- `js/listening.js:935` `togglePlay`
- `js/listening.js:974` `startTimer`
- `js/listening.js:1002` `buildNav`
- `js/listening.js:1075` `initRealMode`
- `js/listening.js:1315` `submitTest`
- `js/listening.js:1334` `confirmSub`
- `js/listening.js:1388` `startAutoSave`
- `js/listening.js:1409` `restoreProgress`

Backend giống Reading, nhưng dữ liệu chính liên quan tới `ListeningPart`.

Luồng chạy:

```text
practice card Listening
-> listening.html
-> loadExam
-> getExamData
-> startAttempt
-> renderQuestions + audio controls
-> submit
-> AttemptServiceImpl
-> ScoringServiceImpl
-> ResultServiceImpl
```

### 5.5 Writing

Frontend:

- `writing.html`
- `js/writing.js:3` DOMContentLoaded
- `js/writing.js:54` start attempt
- `js/writing.js:116` submit writing answers
- `js/writing.js:321` render writing prompt

Backend:

- `controller/AttemptController.java:29`
- `controller/AttemptController.java:55`
- `service/impl/AttemptServiceImpl.java:46`
- `service/impl/AttemptServiceImpl.java:136`
- `service/impl/ScoringServiceImpl.java:31`
- `service/AiGradingService.java:43`
- `controller/AdminSubmissionController.java:20`
- `service/impl/AdminSubmissionServiceImpl.java:83`

Luồng chạy:

```text
writing.html
-> startAttempt
-> render prompt
-> user viết bài
-> submitAttemptAnswers
-> backend lưu Answer
-> bài subjective cần AI/admin grading
```

### 5.6 Speaking

Frontend:

- `speaking.html`
- `js/speaking.js:3` DOMContentLoaded
- `js/speaking.js:69` start attempt
- `js/speaking.js:195` render speaking navigation
- `js/speaking.js:283` render speaking main
- `js/speaking.js:410` kiểm tra MediaRecorder
- `js/speaking.js:436` tạo MediaRecorder
- `js/speaking.js:552` submit speaking answers

Backend:

- `controller/MediaController.java:17`
- `service/impl/CloudinaryMediaStorageService.java:36`
- `controller/AttemptController.java:55`
- `service/impl/AttemptServiceImpl.java:136`
- `service/AiGradingService.java:43`
- `controller/AdminSubmissionController.java:38`
- `service/impl/AdminSubmissionServiceImpl.java:83`

Luồng chạy:

```text
speaking.html
-> lấy prompt
-> user record audio
-> MediaRecorder
-> upload audio nếu cần
-> submitAttemptAnswers
-> backend lưu answer/audioUrl
-> AI/admin grading
```

### 5.7 Kết quả và lịch sử làm bài

Frontend:

- `result.html`
- `js/api.js:600` `getAttemptResult`
- `js/api.js:607` `getMyAttempts`
- `js/reading.js:934` apply review mode
- `js/listening.js:587` apply review mode

Backend:

- `controller/ResultController.java:20`
- `controller/ResultController.java:27`
- `controller/ResultController.java:35`
- `controller/ResultController.java:41`
- `service/impl/ResultServiceImpl.java:39`
- `service/impl/ResultServiceImpl.java:76`
- `service/impl/ResultServiceImpl.java:91`

Luồng chạy:

```text
submit bài
-> backend trả ResultResponse
hoặc result.html
-> getAttemptResult/getMyAttempts
-> ResultController
-> ResultServiceImpl
-> Attempt/Answer
```

### 5.8 Note và highlight trong Reading/Listening

Frontend Reading:

- `js/reading.js:2069` lấy payload highlight.
- `js/reading.js:2158` lưu highlight.
- `js/reading.js:2167` khôi phục annotations.
- `js/reading.js:2175` load highlights.
- `js/reading.js:2195` thêm note.
- `js/reading.js:2231` load notes.
- `js/reading.js:2257` render notes.

Frontend Listening:

- `js/listening.js:1198` thêm note.
- `js/listening.js:1234` load notes.
- `js/listening.js:1260` render notes.

API:

- `js/api.js:613` create note.
- `js/api.js:619` update note.
- `js/api.js:626` get notes.
- `js/api.js:630` delete note.
- `js/api.js:634` create highlight.
- `js/api.js:641` get highlights.
- `js/api.js:646` update highlight note.
- `js/api.js:653` delete highlight.

Backend:

- `controller/PracticeController.java:29`
- `service/impl/NoteServiceImpl.java:31`
- `service/impl/HighlightServiceImpl.java:33`
- `model/Note.java`
- `model/Highlight.java`

### 5.9 Tra từ và lưu từ vựng từ Reading

Frontend:

- `js/reading.js:2324` lấy dữ liệu từ vựng local.
- `js/reading.js:2345` hiện popup từ vựng.
- `js/reading.js:2382` lưu từ.
- `js/reading.js:2420` highlight từ trong passage.
- `js/Vocabulary.js` là trang quản lý từ vựng đầy đủ.

Backend:

- `controller/VocabularyController.java:35` lookup.
- `controller/VocabularyController.java:43` save user vocab.
- `service/impl/VocabularyServiceImpl.java:57`
- `service/impl/VocabularyServiceImpl.java:75`
- `model/Vocabulary.java`
- `model/UserVocabulary.java`
- `model/UserVocabularyGroup.java`

### 5.10 Trang sổ từ vựng và flashcard

Frontend:

- `Vocabulary.html`
- `Vocabulary-notebook.html`
- `js/Vocabulary.js:227` sync backend vocabulary.
- `js/Vocabulary.js:324` lưu từ lên backend.
- `js/Vocabulary.js:540` render heatmap.
- `js/Vocabulary.js:639` render overview.
- `js/Vocabulary.js:735` set category tab.
- `js/Vocabulary.js:771` render groups.
- `js/Vocabulary.js:825` đổi tên nhóm.
- `js/Vocabulary.js:906` xoá nhóm.
- `js/Vocabulary.js:946` thêm nhóm.
- `js/Vocabulary.js:1042` render bảng từ.
- `js/Vocabulary.js:1250` cập nhật trạng thái từ.
- `js/Vocabulary.js:1284` sync trạng thái flashcard.
- `js/Vocabulary.js:1324` cập nhật hàng loạt.
- `js/Vocabulary.js:1392` lưu từ đã chọn.
- `js/Vocabulary.js:1552` mở modal từ.
- `js/Vocabulary.js:1584` lưu từ.
- `js/Vocabulary.js:1649` xoá từ.
- `js/Vocabulary.js:1733` bắt đầu custom flashcard.
- `js/Vocabulary.js:1787` xử lý card.
- `js/Vocabulary.js:1831` bắt đầu review.
- `js/Vocabulary.js:1904` lật card.
- `js/Vocabulary.js:1958` DOMContentLoaded.

Backend:

- `controller/VocabularyController.java:28`
- `service/impl/VocabularyServiceImpl.java:57`
- `service/impl/VocabularyServiceImpl.java:136`
- `service/impl/VocabularyServiceImpl.java:193`
- `service/impl/VocabularyServiceImpl.java:324`
- `service/impl/VocabularyServiceImpl.java:338`
- `service/impl/VocabularyServiceImpl.java:364`
- `service/impl/VocabularyServiceImpl.java:390`

### 5.11 Admin import và quản lý đề thi

Frontend:

- `admin/test-builder.html`
- `admin/test-manager.html`
- `js/admin.js:96` upload zone.
- `js/api.js:287` admin upload media.
- `js/api.js:310` tạo test.
- `js/api.js:322` sửa test.
- `js/api.js:334` cập nhật trạng thái.
- `js/api.js:345` xoá test.
- `js/api.js:355` lấy tests.
- `js/api.js:360` import JSON.
- `js/api.js:367` import Excel.
- `js/api.js:444` tải template.
- `js/api.js:456` tải full sample.

Backend:

- `controller/AdminExamController.java:18`
- `service/impl/ExamImportServiceImpl.java:61`
- `service/impl/ExamImportServiceImpl.java:490`
- `service/impl/ExamServiceImpl.java:57`
- `service/impl/ExamServiceImpl.java:85`
- `service/impl/ExamServiceImpl.java:147`
- `repository/ExamRepository.java`
- `model/Exam.java`
- `model/Question.java`
- `model/Choice.java`

Luồng import:

```text
test-builder.html
-> adminImportExamJson/adminImportExamExcel
-> POST /api/admin/exams/import/json hoặc import/excel
-> AdminExamController
-> ExamImportServiceImpl
-> tạo Exam/ReadingPassage/ListeningPart/Question/Choice
```

### 5.12 Admin chấm bài Writing/Speaking

Frontend:

- `admin/grading.html`
- `js/api.js:472` lấy bài chưa chấm.
- `js/api.js:482` chấm bài.

Backend:

- `controller/AdminSubmissionController.java:20`
- `service/impl/AdminSubmissionServiceImpl.java:36`
- `service/impl/AdminSubmissionServiceImpl.java:83`
- `model/Attempt.java`
- `model/Answer.java`

### 5.13 Admin quản lý user

Frontend:

- `admin/users.html`
- `js/api.js:493` lấy users.
- `js/api.js:503` cập nhật role.
- `js/api.js:515` khoá user.

Backend:

- `controller/AdminUserController.java:17`
- `service/impl/UserServiceImpl.java:132`
- `service/impl/UserServiceImpl.java:139`
- `service/impl/UserServiceImpl.java:148`
- `model/User.java`

### 5.14 Admin quản lý từ vựng

Frontend:

- `admin/vocabulary-manager.html`
- `js/api.js:394` lấy vocabulary.
- `js/api.js:399` thêm/sửa vocabulary.
- `js/api.js:406` xoá vocabulary.
- `js/api.js:412` import vocabulary JSON.
- `js/api.js:419` import vocabulary Excel.

Backend:

- `controller/AdminVocabularyController.java:26`
- `service/impl/AdminVocabularyServiceImpl.java:50`
- `service/impl/AdminVocabularyServiceImpl.java:71`
- `service/impl/AdminVocabularyServiceImpl.java:85`
- `service/impl/AdminVocabularyServiceImpl.java:105`
- `model/Vocabulary.java`
- `model/VocabularyExample.java`

### 5.15 Profile, dashboard, heatmap

Frontend:

- `profile.html`
- `dashboard.html`
- `js/profile.js:17` init profile page.
- `js/profile.js:126` load profile.
- `js/profile.js:228` save profile.
- `js/api.js:180` get profile.
- `js/api.js:188` update profile.
- `js/api.js:199` upload avatar.
- `js/api.js:218` dashboard stats.

Backend:

- `controller/UserController.java:24`
- `service/impl/UserServiceImpl.java:59`
- `service/impl/UserServiceImpl.java:67`
- `service/impl/UserServiceImpl.java:93`
- `service/impl/UserServiceImpl.java:104`
- `controller/StudyLogController.java:22`
- `model/User.java`
- `model/StudyLog.java`

### 5.16 AI tutor

Frontend:

- `ai-tutor.html`
- `js/ai-tutor.js:3`
- `js/ai-tutor.js:88` gửi tin nhắn.

Backend:

- `controller/AiController.java:34`
- `service/AiGradingService.java:43`
- `config/GeminiConfig.java:8`

---

## 6) Nếu cô bắt code lại thì cần nắm các mẫu nào

### 6.1 Mẫu Controller

Ví dụ:

```java
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {
    private final ExamService examService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamSummaryResponse>>> getExams(...) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExams(...)));
    }
}
```

Cần nói được:

- `@RestController` đánh dấu đây là REST API.
- `@RequestMapping` là base URL.
- `@GetMapping/@PostMapping` là endpoint.
- Controller không xử lý logic phức tạp, chỉ gọi service.
- `ApiResponse.success(...)` đóng gói response.

### 6.2 Mẫu Service

Ví dụ:

```java
public List<ExamSummaryResponse> getExams(Skill skill, ExamLevel level) {
    List<Exam> exams = examRepository.findByStatus(ExamStatus.PUBLISHED);
    return exams.stream().map(this::toSummary).collect(Collectors.toList());
}
```

Cần nói được:

- Service xử lý nghiệp vụ.
- Repository lấy dữ liệu DB.
- DTO response được map từ Entity để trả về frontend.

### 6.3 Mẫu Repository

Ví dụ:

```java
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStatus(ExamStatus status);
}
```

Cần nói được:

- `JpaRepository<Entity, IdType>` có sẵn CRUD.
- Method `findByStatus` được Spring Data JPA tự sinh query theo tên hàm.

### 6.4 Mẫu Frontend API

Ví dụ trong `js/api.js`:

```javascript
async function getExamList() {
    return apiFetch('/exams');
}
```

Cần nói được:

- Frontend không gọi fetch lung tung, dùng `apiFetch`.
- `apiFetch` tự gắn `Authorization: Bearer token` nếu có token.
- Nếu lỗi 401 thì xoá token và về login.

### 6.5 Mẫu Frontend render

Ví dụ trong `js/practice.js`:

```javascript
async function fetchExams() {
    const body = await getExamList();
    exams = body.data || body;
    exams.forEach(exam => renderExamCard(exam, grid));
}
```

Cần nói được:

- Lấy data từ API.
- Xoá loading.
- Lặp qua danh sách exam.
- Tạo card bằng DOM/innerHTML.

---

## 7) Checklist học trước báo cáo

### Ngày 1: Backend nền

- Đọc `pom.xml`, `application.properties`.
- Đọc `config/SecurityConfig.java`, `CorsConfig.java`.
- Đọc `model/User.java`, `Exam.java`, `Question.java`, `Attempt.java`, `Answer.java`.
- Đọc `repository/ExamRepository.java`, `AttemptRepository.java`, `UserRepository.java`.

### Ngày 2: Auth + user

- Đọc `login.html`, `register.html`, `js/auth.js`, `js/api.js`.
- Đọc `AuthController`, `AuthenticationServiceImpl`, `JwtServiceImpl`, `UserDetailServiceCustomize`.
- Tự vẽ lại flow login.

### Ngày 3: Exam + attempt

- Đọc `practice.html`, `practice.js`.
- Đọc `ExamController`, `ExamServiceImpl`.
- Đọc `AttemptController`, `AttemptServiceImpl`.
- Tự vẽ lại flow: list exam -> start attempt -> submit.

### Ngày 4: Reading/Listening

- Đọc `reading.html`, `reading.js`.
- Đọc `listening.html`, `listening.js`.
- Tập trung: loadExam, renderQuestions, startTimer, submitTest, confirmSub, autoSave.

### Ngày 5: Writing/Speaking

- Đọc `writing.html`, `writing.js`.
- Đọc `speaking.html`, `speaking.js`.
- Tập trung: dynamic prompt, submit answer, recording audio, grading.

### Ngày 6: Vocabulary

- Đọc `Vocabulary.html`, `Vocabulary-notebook.html`, `Vocabulary.js`, `Vocabulary.css`.
- Đọc `VocabularyController`, `VocabularyServiceImpl`, `Vocabulary`, `UserVocabulary`, `UserVocabularyGroup`.

### Ngày 7: Admin

- Đọc `admin/test-builder.html`, `admin/test-manager.html`, `admin/grading.html`, `admin/users.html`, `admin/vocabulary-manager.html`.
- Đọc `AdminExamController`, `ExamImportServiceImpl`.
- Đọc `AdminSubmissionController`, `AdminSubmissionServiceImpl`.
- Đọc `AdminVocabularyController`, `AdminVocabularyServiceImpl`.
- Đọc `AdminUserController`, `UserServiceImpl`.

---

## 8) Câu hỏi hay bị hỏi và cách chỉ code

### Câu: "Tại sao bài thi không hiện lên?"

Chỉ code:

- `practice.html`
- `js/practice.js:34` fetch exam.
- `js/api.js:542` call `/exams`.
- `ExamController.java:22`
- `ExamServiceImpl.java:43`
- `ExamRepository.findByStatus(PUBLISHED)`
- `Exam.status`

Trả lời ngắn:

```text
Trang practice lấy danh sách từ /api/exams.
Backend chỉ trả đề có status PUBLISHED.
Nếu admin để DRAFT/ARCHIVED hoặc frontend filter sai skill/type thì không hiện.
```

### Câu: "Nút bắt đầu làm bài chạy như thế nào?"

Chỉ code:

- `js/practice.js:364` open modal.
- `js/practice.js:382` startActualTest.
- Redirect sang `reading.html/listening.html/writing.html/speaking.html`.
- File skill tương ứng gọi `startAttempt`.
- `js/api.js:551`
- `AttemptController.java:29`
- `AttemptServiceImpl.java:46`

### Câu: "Chấm điểm ở đâu?"

Chỉ code:

- `js/reading.js:2484` confirm submit.
- `js/listening.js:1334` confirm submit.
- `js/api.js:585` submitAttemptAnswers.
- `AttemptController.java:55`
- `AttemptServiceImpl.java:136`
- `ScoringServiceImpl.java:31`
- `ScoringServiceImpl.java:90`
- `ScoringServiceImpl.java:146`

### Câu: "Từ vựng lưu ở đâu?"

Chỉ code:

- `Vocabulary.js:1584` save word.
- `Vocabulary.js:324` saveWordToBackend.
- `js/api.js:663` apiSaveUserVocab.
- `VocabularyController.java:43`
- `VocabularyServiceImpl.java:75`
- `UserVocabulary.java`

### Câu: "Thêm nhóm từ vựng ở đâu?"

Chỉ code:

- `Vocabulary-notebook.html` khu `addGroupContainer`.
- `Vocabulary.css` `.add-group-inline`.
- `Vocabulary.js:946` addGroupFromPage.
- `js/api.js:757` apiCreateUserVocabGroup.
- `VocabularyController.java:143`
- `VocabularyServiceImpl.java:338`
- `UserVocabularyGroup.java`

### Câu: "Import đề thi ở đâu?"

Chỉ code:

- `admin/test-builder.html`
- `js/api.js:360` adminImportExamJson.
- `js/api.js:367` adminImportExamExcel.
- `AdminExamController.java:25`
- `AdminExamController.java:31`
- `ExamImportServiceImpl.java:61`
- `ExamImportServiceImpl.java:490`

### Câu: "Speaking record audio ở đâu?"

Chỉ code:

- `speaking.html`
- `js/speaking.js:410` kiểm tra MediaRecorder.
- `js/speaking.js:436` tạo MediaRecorder.
- `js/speaking.js:552` submit.
- `MediaController.java:23` upload file.
- `CloudinaryMediaStorageService.java:36`

---

## 9) Cách đọc "không sót dòng nào"

Nếu thật sự cần đọc hết source, làm theo cách này:

1. Tạo checklist file.
2. Đọc mỗi file 3 lượt:
   - Lượt 1: file này làm gì.
   - Lượt 2: các hàm/class chính.
   - Lượt 3: dòng nào gọi sang file khác.
3. Sau mỗi file ghi lại:
   - Input của file.
   - Output của file.
   - Gọi API nào.
   - Gọi service/repository nào.
   - Dùng model nào.
4. Dùng `rg` để tìm nhanh:

```powershell
rg -n "tenHam|endpoint|idHtml|className" .
```

Ví dụ:

```powershell
rg -n "addGroupFromPage|user-vocabulary-groups" AimHigh-IELTS-Website AimHigh-backend
rg -n "submitAttemptAnswers|/submit|scoreAttempt" AimHigh-IELTS-Website AimHigh-backend
rg -n "adminImportExamJson|import/json|importFromJson" AimHigh-IELTS-Website AimHigh-backend
```

---

## 10) Files cần ưu tiên nếu thời gian ít

### Backend

1. `controller/AuthController.java`
2. `controller/ExamController.java`
3. `controller/AttemptController.java`
4. `controller/VocabularyController.java`
5. `controller/AdminExamController.java`
6. `service/impl/AuthenticationServiceImpl.java`
7. `service/impl/ExamServiceImpl.java`
8. `service/impl/AttemptServiceImpl.java`
9. `service/impl/ScoringServiceImpl.java`
10. `service/impl/VocabularyServiceImpl.java`
11. `service/impl/ExamImportServiceImpl.java`
12. `model/User.java`
13. `model/Exam.java`
14. `model/Question.java`
15. `model/Attempt.java`
16. `model/Answer.java`
17. `model/Vocabulary.java`
18. `model/UserVocabulary.java`

### Frontend

1. `js/api.js`
2. `js/auth.js`
3. `js/practice.js`
4. `js/reading.js`
5. `js/listening.js`
6. `js/writing.js`
7. `js/speaking.js`
8. `js/Vocabulary.js`
9. `js/admin.js`
10. `practice.html`
11. `reading.html`
12. `listening.html`
13. `writing.html`
14. `speaking.html`
15. `Vocabulary.html`
16. `Vocabulary-notebook.html`
17. `admin/test-builder.html`
18. `admin/test-manager.html`

---

## 11) Ghi nhớ khi báo cáo

- Frontend là HTML/CSS/JS tĩnh.
- `js/api.js` là cầu nối quan trọng nhất giữa frontend và backend.
- Backend chia theo mô hình Controller -> Service -> Repository -> Model.
- Đề thi public chỉ hiện khi `Exam.status = PUBLISHED`.
- Reading/Listening được chấm tự động bằng `ScoringServiceImpl`.
- Writing/Speaking là bài subjective, có hướng AI/admin grading.
- Từ vựng có localStorage để hiển thị nhanh và backend sync để lưu thật.
- Admin import đề thi từ JSON/Excel qua `ExamImportServiceImpl`.
- JWT lưu trên localStorage ở frontend, backend verify qua Security/JwtService.

