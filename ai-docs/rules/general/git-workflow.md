# Git Workflow

## Mục tiêu
- Giữ lịch sử Git rõ ràng, dễ truy vết và dễ review.

## Quy tắc bắt buộc
- Tạo nhánh mới từ `main` theo pattern `feature/<scope>-<short-name>`.
- Mỗi commit chỉ chứa một thay đổi logic rõ ràng.
- Commit message theo format `<type>: <short summary>` (`feat`, `fix`, `refactor`, `docs`, `test`).
- Đồng bộ với `main` định kỳ để tránh lệch nhánh quá lâu.
- Chạy check cục bộ (build/test) trước khi mở PR.
- PR phải mô tả thay đổi contract API và màn hình frontend bị ảnh hưởng.
- Không trộn refactor không liên quan với thay đổi tính năng trong cùng PR.
- Nếu đổi hành vi endpoint phải cập nhật docs/samples trong cùng PR.

## Anti-pattern cần tránh
- Một PR quá lớn, nhiều mục tiêu, khó review.
- Commit message mơ hồ kiểu `update`, `fix bug`.
- Sửa nóng trên `main` không qua PR.

## Checklist review PR
- Nhánh và commit message đúng chuẩn chưa.
- PR có mô tả impact rõ cho backend/frontend/docs chưa.
- Có thay đổi contract nhưng chưa cập nhật tài liệu không.
