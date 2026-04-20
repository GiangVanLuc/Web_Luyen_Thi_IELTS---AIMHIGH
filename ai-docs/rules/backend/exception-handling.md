# Quy tắc xử lý exception (Backend)

## Mục tiêu
- Thống nhất phản hồi lỗi cho toàn bộ API.
- Đảm bảo frontend đọc lỗi ổn định, không phụ thuộc nội dung message tự do.
- Giữ log đủ để truy vết production nhưng không rò rỉ dữ liệu nhạy cảm.

## Quy tắc bắt buộc
- Bắt buộc dùng xử lý lỗi tập trung qua `@ControllerAdvice` + `GlobalExceptionHandler`.
- Mọi exception nghiệp vụ phải map sang HTTP status + mã lỗi ổn định.
- Không trả stacktrace, class name, SQL, token, mật khẩu ra response.
- Không nuốt lỗi ở service layer. Nếu `catch` phải log theo ngữ cảnh và `throw` lại exception phù hợp.
- Lỗi validate DTO phải trả theo từng field để frontend map trực tiếp vào form.

## Envelope lỗi chuẩn
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" }
  ],
  "timestamp": "2026-04-18T09:30:00Z",
  "path": "/api/auth/register"
}
```

## Bảng map HTTP status
- `400`: sai cú pháp request hoặc tham số đầu vào.
- `401`: chưa xác thực hoặc token không hợp lệ/hết hạn.
- `403`: đã xác thực nhưng không đủ quyền.
- `404`: không tìm thấy tài nguyên.
- `409`: xung đột dữ liệu/trạng thái.
- `422`: validate nghiệp vụ không đạt.
- `500`: lỗi không mong muốn phía server.

## Logging và bảo mật
- Bắt buộc có `requestId` hoặc `traceId` trong log.
- Dùng `WARN` cho lỗi 4xx, `ERROR` cho lỗi 5xx.
- Không log JWT, refresh token, mật khẩu, dữ liệu cá nhân nhạy cảm.

## Anti-pattern cần tránh
- Trả trực tiếp `e.getMessage()` cho mọi lỗi hệ thống.
- Trộn nhiều định dạng lỗi giữa các controller.
- Vừa xử lý ở service vừa xử lý lại ở controller gây không nhất quán.

## Checklist review PR
- Có thêm exception nghiệp vụ mới không.
- Exception mới đã được map status + code chưa.
- API mới có trả envelope lỗi đúng format chưa.
- Có log quá mức hoặc log lộ dữ liệu nhạy cảm không.
