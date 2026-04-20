# SOURCE CODE MAP - AIMHIGH (FULL PROJECT)

Ngay cap nhat: 08/04/2026

## 1) Muc tieu file nay
Ban do nhanh de dev/agent tra cuu:
- Chuc nang nam o dau (backend + frontend)
- Luong goi chinh page -> js -> API -> controller -> service
- Danh sach endpoint backend hien co
- Cac diem can luu y khi debug

## 2) Tong quan workspace
- AimHigh-backend/: Spring Boot backend (auth, exams, attempts, scoring, vocab, admin)
- AimHigh-IELTS-Website/: Frontend static HTML/CSS/JS
- SOURCE_CODE_MAP.md: Ban do ma nguon tong hop

## 2.1) Bo tai lieu flow-map cho Copilot (moi)
- Thu muc: `ai-docs/flow-map/`
- File bat dau de doc nhanh: `ai-docs/flow-map/00-copilot-reading-order.md`
- Frontend flow details: `ai-docs/flow-map/frontend/*.md`
- Backend flow details: `ai-docs/flow-map/backend/*.md`
- FE-BE contract map: `ai-docs/flow-map/integration/*.md`
- Danh gia hien trang + roadmap: `ai-docs/flow-map/assessment/*.md`

## 3) Backend stack + cau hinh

### 3.1 Dependencies chinh (AimHigh-backend/pom.xml)
- Java 21
- Spring Boot 4.0.1
- spring-boot-starter-web
- spring-boot-starter-data-jpa
- spring-boot-starter-security
- spring-boot-starter-oauth2-resource-server
- spring-boot-starter-oauth2-client
- spring-boot-starter-validation
- spring-boot-starter-data-redis
- springdoc-openapi-starter-webmvc-ui
- mysql-connector-j
- poi-ooxml (import/export Excel)
- lombok
- springboot4-dotenv

### 3.2 Runtime config (src/main/resources/application.properties)
- DB: DB_URL, DB_USERNAME, DB_PASSWORD
- JWT: JWT_SECRET, JWT_EXPIRATION
- Redis: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- Google OAuth2: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- Frontend URL: app.frontend-url=http://localhost:5500/AimHigh-IELTS-Website
- Server port: 8080

## 4) Backend structure day du

### 4.1 Package count (src/main/java/vn/aimhigh/aimhighbackend)
- config: 4 files
- controller: 7 files
- dto: 26 files
- enums: 9 files
- exception: 5 files
- model: 23 files
- repository: 20 files
- service: 13 files

### 4.2 Config
- config/CorsConfig.java
- config/SecurityConfig.java
- config/RedisConfig.java
- config/OAuth2SuccessHandler.java

### 4.3 Controllers va endpoint map

AuthController (base: /api/auth)
- POST /register
- POST /login
- POST /refresh
- POST /logout

ExamController (base: /api/exams)
- GET /
- GET /{id}

AttemptController (base: /api/attempts)
- POST /start
- POST /{id}/progress
- GET /{id}/progress
- POST /{id}/submit

PracticeController (base: /api)
- GET /attempts/{id}/questions/{qId}/answer
- POST /attempts/{id}/notes
- GET /attempts/{id}/notes
- DELETE /notes/{id}
- PATCH /notes/{id}
- POST /attempts/{id}/highlights
- GET /attempts/{id}/highlights
- DELETE /highlights/{id}
- PATCH /highlights/{id}/note

ResultController (base: /api)
- GET /attempts/{id}/result
- GET /users/me/attempts

VocabularyController (base: /api)
- GET /vocabulary/lookup
- POST /user-vocabulary
- GET /user-vocabulary
- DELETE /user-vocabulary/{id}

AdminExamController (base: /api/admin/exams)
- POST /import/json
- POST /import/excel
- POST /
- GET /template/reading
- GET /template/listening
- GET /template/reading/full-sample
- GET /template/listening/full-sample
- GET /
- PUT /{id}
- PATCH /{id}/status
- DELETE /{id}

### 4.4 Service layer
- AuthenticationService, JwtService, UserDetailServiceCustomize, CustomOAuth2UserService
- ExamService, ExamImportService
- AttemptService, ResultService, ScoringService
- NoteService, HighlightService
- VocabularyService
- RedisService

### 4.5 Entity/model map
- Core exam: Exam, Question, Choice, QuestionType, ReadingPassage, ListeningPart, MapLabel, MatchingItem
- Attempt/result: Attempt, Answer
- Practice annotation: Note, Highlight
- User/auth: User, Notification, UserProgress, StudyLog
- Vocab: Vocabulary, VocabularyExample, UserVocabulary
- Other: Source, Topic, WritingSubmission, SpeakingSubmission

### 4.6 Repository map
- ExamRepository, QuestionRepository, ChoiceRepository, QuestionTypeRepository
- ReadingPassageRepository, ListeningPartRepository, MapLabelRepository, MatchingItemRepository
- AttemptRepository, AnswerRepository
- NoteRepository, HighlightRepository
- UserRepository, UserProgressRepository
- VocabularyRepository, VocabularyExampleRepository, UserVocabularyRepository
- NotificationRepository, SourceRepository, TopicRepository

### 4.7 DTO map
- request/: login/register/refresh, attempt flow, note/highlight, vocab save, import exam
- response/: ApiResponse, AuthResponse, ExamSummaryResponse, ExamDetailResponse, AttemptResponse, ResultResponse, NoteResponse, HighlightResponse, VocabularyResponse, ProgressResponse, ...

### 4.8 Enums
- Skill, ExamLevel, ExamType, Role, AuthProvider, AttemptMode, AttemptStatus, NotificationType, QuestionTypeName

## 5) Frontend structure day du

### 5.1 Main pages (user)
- index.html (landing)
- login.html, register.html, oauth2_callback.html
- dashboard.html, profile.html
- practice.html
- reading.html, listening.html
- result.html
- flashcard.html
- vocabulary.html
- speaking.html, writing.html

### 5.2 Admin pages
- admin/dashboard.html
- admin/test-builder.html
- admin/test-manager.html
- admin/grading.html
- admin/users.html
- admin/roles.html
- admin/reports.html
- admin/notifications.html
- admin/audit-log.html
- admin/settings.html

### 5.3 JS modules
- js/api.js: API gateway chinh (auth, exam, attempt, result, vocab, admin)
- js/admin.js: admin UI interaction + page behaviors
- js/auth.js: login/register/logout/checkAuth
- js/main.js: landing interactions
- js/navbar.js: navbar rendering/behavior
- js/practice.js: practice list/filter/start mode
- js/reading.js: reading test engine + timer + nav + local interactions
- js/listening.js: listening test engine + audio controls + timer + local interactions
- js/flashcard.js: flashcard local logic (SM2-style schedule)
- js/test.js: test helpers

### 5.4 CSS assets
- css/style.css (main site)
- css/admin.css (admin theme)
- css/test.css (test pages)

## 6) Page -> script -> API nhanh

### 6.1 Admin test builder
- admin/test-builder.html
  - Dung: ../js/api.js + ../js/admin.js
  - Luong import:
    - adminImportExamJson -> POST /api/admin/exams/import/json
    - adminImportExamExcel -> POST /api/admin/exams/import/excel
    - adminDownloadExamTemplate -> GET /api/admin/exams/template/{skill}
    - adminDownloadFullSampleExamTemplate -> GET /api/admin/exams/template/{skill}/full-sample

### 6.2 Admin test manager
- admin/test-manager.html
  - Dung: ../js/api.js + ../js/admin.js
  - Luong quan ly exam:
    - adminGetTests -> GET /api/admin/exams
    - adminUpdateTestStatus -> PATCH /api/admin/exams/{id}/status
    - adminDeleteTest -> DELETE /api/admin/exams/{id}
    - (co ham san) adminCreateTest -> POST /api/admin/exams

### 6.3 User practice -> attempt -> result
- practice.html (js/practice.js)
  - Lay danh sach de qua /api/exams
- reading.html, listening.html (js/reading.js, js/listening.js)
  - getExamData -> GET /api/exams/{id}
  - startAttempt -> POST /api/attempts/start
  - saveAttemptProgress/getAttemptProgress -> /api/attempts/{id}/progress
  - submitAttemptAnswers -> POST /api/attempts/{id}/submit
  - getAttemptResult -> GET /api/attempts/{id}/result

### 6.4 Practice annotation va vocab
- Note/highlight API:
  - POST/GET /api/attempts/{id}/notes
  - DELETE/PATCH /api/notes/{id}
  - POST/GET /api/attempts/{id}/highlights
  - DELETE /api/highlights/{id}
- Vocab API:
  - GET /api/vocabulary/lookup
  - POST/GET/DELETE /api/user-vocabulary

## 7) Luong nghiep vu chinh

### 7.1 Auth flow
- Frontend auth.js -> api.js (apiLogin/apiRegister/apiLogout)
- Backend AuthController -> AuthenticationService + JwtService
- OAuth2: SecurityConfig + CustomOAuth2UserService + OAuth2SuccessHandler

### 7.2 Exam listing/detail
- Frontend practice.js / reading.js / listening.js goi API
- Backend ExamController -> ExamService

### 7.3 Attempt/scoring/result
- AttemptController -> AttemptService
- Submit attempt -> ScoringService
- ResultController -> ResultService

### 7.4 Admin exam import va manage
- AdminExamController -> ExamImportService / ExamService
- Ho tro import JSON va Excel qua Apache POI

## 8) Luu y quan trong

### 8.1 Security boundary
- SecurityConfig bao ve /api/admin/** cho role ADMIN.
- Khi debug admin, can check JWT va role trong token.

### 8.2 Status convention exam
- Hien tai map theo isActive:
  - published -> true
  - draft/archived -> false
- Neu can tach draft va archived rieng, can them cot status rieng.

### 8.3 Frontend API legacy/mock can review
- Trong js/api.js co nhom function cu/legacy (vi du /tests, /results/history, /flashcards/*, /users/*) khong thay controller backend tuong ung trong src/main/java/controller.
- Can xac nhan lai:
  - giu de fallback/mock
  - hay can implement backend endpoint thieu
  - hay can xoa de tranh nham lan

## 9) Test va sample data
- Backend test:
  - src/test/java/vn/aimhigh/aimhighbackend/AimHighBackendApplicationTests.java
  - src/test/java/vn/aimhigh/aimhighbackend/SeedTest.java
- Import samples:
  - docs/samples/json/*.json
  - docs/samples/excel-reading-full/*.csv
  - docs/samples/excel-listening-full/*.csv

## 10) Quick debug checklist
1. Check BE env: DB_*, JWT_*, GOOGLE_*, REDIS_*.
2. Check token trong localStorage (aimhigh_token) va role.
3. Thu endpoint auth:
   - POST /api/auth/login
4. Thu endpoint exam list:
   - GET /api/exams
5. Thu endpoint attempt:
   - POST /api/attempts/start
6. Thu endpoint admin:
   - GET /api/admin/exams?skill=READING&status=published
7. Test UI:
   - admin/test-builder.html
   - admin/test-manager.html
   - practice.html -> reading.html/listening.html -> result.html
