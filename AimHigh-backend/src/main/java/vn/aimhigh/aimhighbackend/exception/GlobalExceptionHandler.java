package vn.aimhigh.aimhighbackend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý lỗi validation (ví dụ: @Valid trong Request) - HTTP 400
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.error("Validation error: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Dữ liệu không hợp lệ", HttpStatus.BAD_REQUEST.value(), errors));
    }

    /**
     * Xử lý lỗi không tìm thấy (HTTP 404)
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage(), HttpStatus.NOT_FOUND.value()));
    }

    /**
     * Xử lý lỗi chưa xác thực (HTTP 401)
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnauthorizedException(UnauthorizedException ex) {
        log.error("Unauthorized: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage(), HttpStatus.UNAUTHORIZED.value()));
    }

    /**
     * Xử lý lỗi không có quyền truy cập (HTTP 403)
     */
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Object>> handleForbiddenException(ForbiddenException ex) {
        log.error("Forbidden: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ex.getMessage(), HttpStatus.FORBIDDEN.value()));
    }

    /**
     * Xử lý lỗi request không hợp lệ (HTTP 400)
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequestException(BadRequestException ex) {
        log.error("Bad request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage(), HttpStatus.BAD_REQUEST.value()));
    }

    /**
     * Xử lý các RuntimeException khác - trả về HTTP 400 như yêu cầu
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Object>> handleRuntimeException(RuntimeException ex) {
        log.error("Runtime exception: ", ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Lỗi thực thi (Runtime Error)", HttpStatus.BAD_REQUEST.value()));
    }

    /**
     * Xử lý tất cả các Exception khác không nắm bắt được - trả về HTTP 500
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi hệ thống nội bộ", HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }
}
