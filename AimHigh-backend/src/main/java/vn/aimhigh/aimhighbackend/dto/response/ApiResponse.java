package vn.aimhigh.aimhighbackend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private int status;
    private String message;
    private T data;
    private Object errors;
    private LocalDateTime timestamp;

    /**
     * Trả về response thành công với dữ liệu mặc định.
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .message("Thành công")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Trả về response thành công với dữ liệu và thông báo tùy chỉnh.
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Trả về response thành công với dữ liệu, thông báo và status code tùy chỉnh.
     */
    public static <T> ApiResponse<T> success(T data, String message, int status) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(status)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Trả về response thành công không có dữ liệu (có thể dùng cho DELETE hoặc cập nhật).
     */
    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Trả về response lỗi với thông báo và status code.
     */
    public static <T> ApiResponse<T> error(String message, int status) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(status)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Trả về response lỗi kèm chi tiết lỗi (ví dụ: validation errors).
     */
    public static <T> ApiResponse<T> error(String message, int status, Object errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(status)
                .message(message)
                .errors(errors)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
