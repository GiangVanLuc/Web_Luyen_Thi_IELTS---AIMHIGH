# Spring Boot Conventions

## Mục tiêu
- Giữ code backend nhất quán, dễ đọc và dễ bảo trì.
- Tách rõ trách nhiệm giữa controller, service, repository.

## Quy tắc đặt tên
- Class naming: `*Controller`, `*Service`, `*ServiceImpl`, `*Repository`, `*Request`, `*Response`.
- Entity names are singular nouns; table names follow snake_case plural where possible.
- DTO packages tách theo hướng: `dto.request` và `dto.response`.

## Quy tắc kiến trúc
- Dùng constructor injection, tránh field injection.
- Controller phải mỏng, chỉ nhận request/validate cơ bản/chuyển tiếp service.
- Business logic đặt tại service layer.
- Truy cập dữ liệu đặt tại repository layer.
- Mapping entity <-> DTO tách riêng bằng mapper helper (manual hoặc MapStruct).
- Không expose entity JPA trực tiếp qua API.

## Quy tắc code style
- Method ngắn gọn, tên thể hiện ý đồ nghiệp vụ.
- Tránh class/service quá dài, tách theo bounded context.
- Config classes đặt dưới package `config` và annotate rõ ràng.

## Checklist review PR
- Có vi phạm tách lớp controller-service-repository không.
- Có trả entity trực tiếp ra response không.
- Có dùng constructor injection nhất quán không.
- Package/tên class có đúng convention không.
