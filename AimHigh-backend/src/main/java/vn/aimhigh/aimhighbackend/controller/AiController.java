package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.request.AiChatRequest;
import vn.aimhigh.aimhighbackend.dto.response.AiChatMessageResponse;
import vn.aimhigh.aimhighbackend.dto.response.AiChatResponse;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.service.AiTutorService;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final UserService userService;
    private final AiTutorService aiTutorService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(aiTutorService.chat(currentUser, request)));
    }

    @GetMapping("/chat/history")
    public ResponseEntity<ApiResponse<List<AiChatMessageResponse>>> getHistory(Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(aiTutorService.getHistory(currentUser)));
    }

    @DeleteMapping("/chat/history")
    public ResponseEntity<ApiResponse<String>> clearHistory(Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        aiTutorService.clearHistory(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa lịch sử trò chuyện"));
    }
}
