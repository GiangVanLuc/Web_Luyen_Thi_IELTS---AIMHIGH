# Design System Specification (AimHigh - HTML/CSS/JS)

## 1) Mục tiêu
- Đảm bảo giao diện nhất quán giữa các trang học viên và trang admin.
- Ưu tiên tính rõ ràng, dễ đọc, dễ thao tác trên desktop và mobile.
- Dễ bảo trì với frontend thuần (không phụ thuộc framework UI).

## 2) Phạm vi áp dụng
- Áp dụng cho toàn bộ file HTML trong thư mục gốc website và thư mục admin.
- Áp dụng cho CSS chính tại assets/css/style.css, assets/css/admin.css, assets/css/test.css.
- Áp dụng cho JS thao tác UI trong assets/js.

## 3) Nguyên tắc thiết kế
- Tính nhất quán: cùng một hành vi UI phải có cùng style và trạng thái.
- Tính phân cấp: người dùng nhìn thấy thông tin quan trọng trước.
- Tính an toàn: trạng thái nguy hiểm phải hiển thị rõ và cần xác nhận.
- Tính phản hồi: mọi thao tác có trạng thái loading, success hoặc error rõ ràng.

## 4) Màu sắc và token
Bắt buộc dùng CSS variables cho màu, spacing, radius, typography.

Ví dụ token nền tảng:
```css
:root {
  --color-primary: #1f4fa3;
  --color-primary-hover: #173c7c;
  --color-bg: #f7f9fc;
  --color-surface: #ffffff;
  --color-border: #dbe3ef;
  --color-text-primary: #1a2433;
  --color-text-secondary: #4b5b73;
  --color-success: #1f8a4d;
  --color-warning: #b97807;
  --color-danger: #c53030;
  --color-info: #2b6cb0;
}
```

Quy tắc dùng màu:
- Không hard-code màu trực tiếp trong component khi đã có token.
- Màu trạng thái chỉ dùng đúng ngữ nghĩa (success/warning/danger/info).
- Tỷ lệ tương phản chữ và nền phải đủ đọc tốt (đặc biệt ở mobile).

## 5) Typography
- Font chính: theo cấu hình hiện tại của dự án, thống nhất toàn trang.
- Tiêu đề trang: cỡ lớn hơn nội dung body, độ đậm cao hơn.
- Nội dung body: ưu tiên dễ đọc, line-height thoáng.
- Text phụ (hint, metadata): giảm nhấn bằng màu text-secondary, không giảm quá mức gây khó đọc.

## 6) Layout
- Mobile-first; mở rộng dần cho tablet và desktop.
- Không dùng chiều rộng cố định gây tràn ngang.
- Khối nội dung chính có max-width hợp lý và căn giữa ở desktop.
- Header/nav/footer giữ hành vi nhất quán giữa các trang.

## 7) Khoảng cách và kích thước
- Dùng hệ spacing theo bậc (4, 8, 12, 16, 24, 32).
- Không đặt margin/padding ngẫu nhiên ngoài hệ thống.
- Control form và button có chiều cao nhất quán theo nhóm.

## 8) Quy tắc component cốt lõi

### 8.1 Button
- Có tối thiểu các biến thể: primary, secondary, danger, ghost.
- Có đủ trạng thái: default, hover, active, disabled, loading.
- Không dùng màu danger cho hành động không phá hủy.

### 8.2 Input/Form
- Label rõ ràng, liên kết đúng với input.
- Error message đặt gần field bị lỗi.
- Trạng thái lỗi dùng màu và thông điệp rõ ràng, không chỉ dựa vào màu.

### 8.3 Card
- Card dùng nền surface, viền nhẹ.
- Header card có thứ bậc rõ với body.
- Không nhồi quá nhiều hành động ngang nhau trong một card.

### 8.4 Table/List
- Cột quan trọng đặt trước, cột hành động đặt cuối.
- Có trạng thái empty/loading/error rõ.
- Trên mobile, ưu tiên chuyển dạng card list hoặc cho cuộn ngang có kiểm soát.

### 8.5 Badge/Status
- Mapping trạng thái cố định: success/warning/danger/info/neutral.
- Tránh tạo quá nhiều biến thể màu không có quy tắc.

## 9) Motion và tương tác
- Animation ngắn, phục vụ nhận biết trạng thái; tránh lạm dụng.
- Hover/focus phải có phản hồi trực quan.
- Dùng transition nhất quán cho button, input, dropdown.

## 10) Accessibility (A11y)
- Keyboard-first: tab order đúng, focus ring nhìn rõ.
- Có aria-label cho icon button không có text.
- Không dùng màu làm kênh truyền đạt duy nhất.
- Kiểm tra đọc được với cỡ chữ hệ thống lớn.

## 11) Quy tắc responsive
- Breakpoint chuẩn do team thống nhất trong CSS.
- Không để overflow-x toàn trang.
- Menu/nav cần có phương án hiển thị tốt ở màn hình nhỏ.
- Bảng dữ liệu lớn phải có giải pháp đọc được trên mobile.

## 12) Quy tắc triển khai trong dự án hiện tại
- Không thêm framework CSS mới khi chưa có quyết định kiến trúc.
- Tái sử dụng class và token sẵn có trước khi tạo class mới.
- Khi tạo component mới, cập nhật tài liệu rule tương ứng.

## 13) Anti-pattern cần tránh
- Mỗi trang một style riêng, không theo token chung.
- Chỉnh UI bằng inline style rải rác trong JS.
- Dùng màu và spacing tùy hứng theo từng commit.
- Chỉ test desktop mà bỏ qua mobile.

## 14) Checklist review UI PR
- Có dùng token thay vì hard-code màu/spacing không.
- Có đủ trạng thái loading/empty/error/success không.
- Có kiểm tra mobile và keyboard focus chưa.
- Có phá vỡ nhất quán với các trang hiện có không.
- Có ảnh hưởng tới file CSS chung và đã ghi chú impact chưa.

## 15) Định nghĩa hoàn thành (DoD) cho thay đổi UI
- Pass checklist ở mục 14.
- Không phát sinh lỗi layout ở các trang liên quan.
- Không có thay đổi làm giảm khả năng đọc hoặc khả năng thao tác.
- Có cập nhật tài liệu nếu thêm pattern mới.
