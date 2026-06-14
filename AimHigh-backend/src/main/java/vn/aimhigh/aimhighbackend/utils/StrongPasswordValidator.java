package vn.aimhigh.aimhighbackend.utils;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator cho annotation @StrongPassword.
 * Kiểm tra mật khẩu theo các tiêu chí bảo mật:
 * - Tối thiểu 8 ký tự
 * - Có ít nhất 1 chữ hoa (A-Z)
 * - Có ít nhất 1 chữ thường (a-z)
 * - Có ít nhất 1 chữ số (0-9)
 * - Có ít nhất 1 ký tự đặc biệt
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    private static final int MIN_LENGTH = 8;

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        // Cho phép @NotBlank xử lý trường hợp null/blank
        if (password == null || password.isBlank()) {
            return true;
        }

        boolean hasMinLength = password.length() >= MIN_LENGTH;
        boolean hasUpperCase = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLowerCase = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecialChar = password.chars().anyMatch(ch ->
                !Character.isLetterOrDigit(ch) && !Character.isWhitespace(ch));

        if (hasMinLength && hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar) {
            return true;
        }

        // Tạo message chi tiết cho từng lỗi
        context.disableDefaultConstraintViolation();

        StringBuilder msg = new StringBuilder("Mật khẩu chưa đủ mạnh: ");
        if (!hasMinLength) msg.append("cần ít nhất 8 ký tự; ");
        if (!hasUpperCase) msg.append("cần ít nhất 1 chữ hoa; ");
        if (!hasLowerCase) msg.append("cần ít nhất 1 chữ thường; ");
        if (!hasDigit) msg.append("cần ít nhất 1 chữ số; ");
        if (!hasSpecialChar) msg.append("cần ít nhất 1 ký tự đặc biệt (@#$%^&+=!...); ");

        // Xóa "; " cuối cùng
        String finalMsg = msg.substring(0, msg.length() - 2);

        context.buildConstraintViolationWithTemplate(finalMsg)
                .addConstraintViolation();

        return false;
    }
}
