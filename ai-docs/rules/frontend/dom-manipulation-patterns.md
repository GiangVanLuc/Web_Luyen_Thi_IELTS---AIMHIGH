# DOM Manipulation Patterns

## Mục tiêu
- Tối ưu hiệu năng render ở frontend thuần (HTML/CSS/JS).
- Giữ luồng cập nhật UI dễ hiểu và dễ debug.

## Quy tắc bắt buộc
- Cache các DOM node ổn định một lần trong init để tránh query lặp.
- Dùng `data-*` làm hook cho JS, không bám vào class phục vụ style.
- Quản lý state trang trong một object tập trung rồi render lại theo state.
- Ưu tiên render function nhỏ (`renderList`, `renderSummary`) thay vì một hàm quá lớn.
- Dùng `DocumentFragment` cho thao tác insert hàng loạt.
- Một hàm chỉ cập nhật vùng DOM liên quan trực tiếp.
- Không render HTML thô từ input người dùng nếu chưa sanitize.
- Side effect phải rõ thứ tự: fetch -> cập nhật state -> render -> thông báo.

## Anti-pattern cần tránh
- Vừa fetch vừa thao tác nhiều vùng DOM không liên quan trong cùng hàm.
- Gắn logic nghiệp vụ trực tiếp vào inline HTML event.
- Trộn state từ nhiều nguồn không đồng bộ (DOM, localStorage, biến global rời rạc).

## Checklist review PR
- Có cache node cho phần tử dùng lặp không.
- Có tách render function theo khối UI chưa.
- Có nguy cơ XSS khi render dữ liệu động không.
- Có thay đổi DOM thừa gây repaint/reflow nhiều không.
