package vn.aimhigh.aimhighbackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.enums.NotificationType;
import vn.aimhigh.aimhighbackend.model.Notification;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.NotificationRepository;
import vn.aimhigh.aimhighbackend.repository.UserVocabularyRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class VocabularyScheduler {

    private final UserVocabularyRepository userVocabularyRepository;
    private final NotificationRepository notificationRepository;

    /**
     * Chạy mỗi ngày vào lúc 08:00 AM để nhắc nhở học từ vựng (Spaced Repetition cơ bản).
     * Cron: "giây phút giờ ngày tháng thứ"
     */
    @Scheduled(cron = "0 0 8 * * ?")
    @Transactional
    public void remindVocabularyReview() {
        log.info("Bắt đầu chạy Cron Job: Nhắc nhở ôn tập từ vựng (Spaced Repetition)...");

        // Tìm các user có từ vựng chưa thuộc (learnLevel < 2) và đã lưu quá 1 ngày (24h)
        LocalDateTime threshold = LocalDateTime.now().minusDays(1);
        List<User> usersNeedingReview = userVocabularyRepository.findUsersNeedingReview(threshold);

        int count = 0;
        for (User user : usersNeedingReview) {
            // Tạo Notification nhắc nhở
            Notification notification = Notification.builder()
                    .user(user)
                    .title("Đến giờ ôn tập từ vựng rồi!")
                    .message("Bạn có một số từ vựng cần ôn tập ngày hôm nay để tránh bị quên. Hãy vào mục Từ vựng để ôn tập ngay nhé!")
                    .type(NotificationType.SYSTEM)
                    .build();
            
            notificationRepository.save(notification);
            count++;
        }

        log.info("Đã gửi thông báo nhắc nhở ôn tập từ vựng cho {} users.", count);
    }
}
