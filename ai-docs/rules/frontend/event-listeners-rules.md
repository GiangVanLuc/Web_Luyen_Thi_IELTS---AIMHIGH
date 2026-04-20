# Event Listeners Rules

## Mục tiêu
- Kiểm soát vòng đời listener rõ ràng, tránh leak và bug do bind trùng.

## Quy tắc bắt buộc
- Đăng ký listeners trong hàm tập trung `bindEvents()` khi init trang.
- Dùng event delegation cho danh sách động hoặc node hay re-render.
- Handler phải đặt tên rõ ràng, tái sử dụng được.
- Gỡ listener khi teardown/unload ở trang sống lâu.
- Dùng `{ once: true }` cho sự kiện chỉ chạy một lần.
- Dùng throttle/debounce cho scroll, resize, search theo phím.
- Không bind trùng listener khi init lặp.
- Handler phải guard khi request đang in-flight.

## Anti-pattern cần tránh
- Gắn listener rải rác nhiều file không điểm kiểm soát.
- Dùng anonymous callback khiến khó remove listener.
- Bind listener trong render function làm tăng số lần đăng ký.

## Checklist review PR
- Có cơ chế chống bind trùng chưa.
- Có dùng delegation đúng nơi chưa.
- Có cleanup listener cho module dài hạn chưa.
