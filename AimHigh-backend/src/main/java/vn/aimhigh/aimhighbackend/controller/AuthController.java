package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.LoginRequest;
import vn.aimhigh.aimhighbackend.dto.request.RefreshTokenRequest;
import vn.aimhigh.aimhighbackend.dto.request.RegisterRequest;
import vn.aimhigh.aimhighbackend.dto.response.AuthResponse;
import vn.aimhigh.aimhighbackend.dto.response.LoginResponse;
import vn.aimhigh.aimhighbackend.service.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AuthenticationService authenticationService;

    // Đăng ký
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody @Valid RegisterRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authenticationService.register(request));
    }

    // Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authenticationService.login(request));
    }

    // Refresh AccessToken
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @RequestBody @Valid RefreshTokenRequest request) {
        return ResponseEntity.ok(
                authenticationService.refreshToken(request.getRefreshToken()));
    }

    // Logout
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody @Valid RefreshTokenRequest request,
            @RequestHeader("Authorization") String authHeader) {
        String accessToken = authHeader.substring(7);
        authenticationService.logout(request.getRefreshToken(), accessToken);
        return ResponseEntity.noContent().build();
    }
}
