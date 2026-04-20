# Database SQL Conventions

## Mục tiêu
- Đảm bảo schema nhất quán, dữ liệu sạch, truy vấn ổn định theo thời gian.

## Quy tắc bắt buộc
- Table names dùng snake_case số nhiều (`users`, `attempts`, `user_vocabulary`).
- Primary key mặc định `id`; foreign key theo dạng `<entity>_id`.
- Bảng mutable phải có `created_at`, `updated_at`.
- Business key phải có unique constraint ở DB.
- Truy vấn join/filter thường xuyên phải có index (`user_id`, `exam_id`, `status`, ...).
- Trường bắt buộc nghiệp vụ không để nullable.
- Giá trị enum phải ổn định giữa DB và Java enum.
- Dùng migration script theo hướng forward-only để tái lập môi trường.

## Anti-pattern cần tránh
- Chỉ kiểm tra trùng ở service mà không có unique constraint ở DB.
- Thêm index tràn lan không dựa truy vấn thực tế.
- Sửa trực tiếp DB production không qua migration.

## Checklist review PR
- Migration có rollback strategy hoặc hướng khắc phục lỗi deploy chưa.
- Có thêm cột mới nhưng thiếu index/constraint cần thiết không.
- Có gây phá vỡ dữ liệu cũ không và đã có script migrate data chưa.
