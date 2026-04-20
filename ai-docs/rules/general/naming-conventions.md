# Naming Conventions

## Mục tiêu
- Tên gọi nhất quán xuyên suốt backend, frontend và database.

## Quy tắc bắt buộc
- Dùng domain noun rõ nghĩa: `Exam`, `Attempt`, `Vocabulary`, `UserProgress`.
- Java class: PascalCase; method/variable: camelCase.
- Table/column DB: snake_case.
- JS file: lower-case hoặc kebab-case theo domain (`reading.js`, `admin.js`).
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`, `TOKEN_KEY`).
- CSS class theo BEM cho component tái sử dụng.
- Tránh viết tắt khó hiểu, trừ thuật ngữ chuẩn được team thống nhất.
- Tên phải phản ánh hành vi nghiệp vụ, không phản ánh chi tiết kỹ thuật tạm thời.

## Quy tắc đặt tên theo lớp
- Controller: `<Domain>Controller`.
- Service: `<Domain>Service`, triển khai: `<Domain>ServiceImpl`.
- Repository: `<Domain>Repository`.
- DTO request/response: `<Action><Domain>Request`, `<Action><Domain>Response`.

## Checklist review PR
- Có tên class/method/file nào vi phạm convention không.
- Có viết tắt khó hiểu trong biến/hàm mới không.
- Có tên gây hiểu nhầm nghiệp vụ không.
