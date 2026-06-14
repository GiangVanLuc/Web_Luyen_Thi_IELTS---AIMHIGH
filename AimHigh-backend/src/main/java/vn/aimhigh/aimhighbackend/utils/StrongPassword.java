package vn.aimhigh.aimhighbackend.utils;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom annotation kiểm tra mật khẩu mạnh.
 * Yêu cầu tối thiểu:
 * - 8 ký tự
 * - 1 chữ hoa
 * - 1 chữ thường
 * - 1 chữ số
 * - 1 ký tự đặc biệt (@#$%^&+=!*...)
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    String message() default "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
