# HTML/CSS Conventions

## Mục tiêu
- Giữ giao diện dễ bảo trì, dễ mở rộng và responsive ổn định.

## Quy tắc bắt buộc
- Ưu tiên semantic tags (`header`, `main`, `section`, `article`, `footer`) trước khi dùng `div` thuần.
- Naming theo BEM: `block__element--modifier` cho component tái sử dụng.
- Utility class ngắn gọn, phản ánh đúng mục đích (`u-hidden`, `u-text-center`).
- Cấu trúc CSS theo thứ tự: variables -> base -> layout -> components -> utilities.
- Tránh selector chain quá sâu, ưu tiên target class trực tiếp.
- Chuẩn hóa spacing và typography bằng CSS variables.
- Hạn chế inline style, chỉ dùng cho giá trị runtime thật sự động.
- Kiểm tra mobile-first trước khi merge.

## Anti-pattern cần tránh
- Gắn style theo id/page đặc thù gây khó tái sử dụng.
- Lạm dụng `!important` để vá layout.
- Viết media query rời rạc, không theo hệ thống breakpoint thống nhất.

## Checklist review PR
- Có dùng semantic HTML đúng vai trò không.
- Có phá vỡ naming convention hiện có không.
- Có phát sinh selector quá đặc hiệu hoặc `!important` không.
- UI có test ở desktop và mobile chưa.
