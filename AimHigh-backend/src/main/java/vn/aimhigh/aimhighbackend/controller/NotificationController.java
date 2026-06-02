package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.model.Notification;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.NotificationRepository;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final UserService userService;
    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getNotifications(Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        
        List<NotificationDto> dtos = list.stream().map(n -> NotificationDto.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType() != null ? n.getType().name() : "SYSTEM")
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt().toString())
                .build()
        ).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        long count = notificationRepository.countByUserIdAndIsRead(currentUser.getId(), false);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long id,
            Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        Notification notification = notificationRepository.findById(id).orElse(null);
        
        if (notification != null && notification.getUser().getId().equals(currentUser.getId())) {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        }
        
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đọc"));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(Authentication authentication) {
        User currentUser = userService.requireUser(authentication);
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        
        boolean changed = false;
        for (Notification n : list) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
                changed = true;
            }
        }
        
        if (changed) {
            notificationRepository.saveAll(list);
        }
        
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đọc tất cả"));
    }

    @lombok.Data
    @lombok.Builder
    public static class NotificationDto {
        private Long id;
        private String title;
        private String message;
        private String type;
        private boolean isRead;
        private String createdAt;
    }
}
