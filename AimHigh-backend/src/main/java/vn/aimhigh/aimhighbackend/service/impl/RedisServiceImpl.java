package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.RedisService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisServiceImpl implements RedisService {

    private final RedisTemplate<String, Object> redisTemplate;

    // ===== BASIC =====

    public void set(String key, Object value, long timeout, TimeUnit unit) {
        redisTemplate.opsForValue().set(key, value, timeout, unit);
    }

    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    // ===== REFRESH TOKEN =====

    public void saveRefreshToken(Long userId, String token) {
        set("refresh_token:" + userId, token, 30, TimeUnit.DAYS);
    }

    public String getRefreshToken(Long userId) {
        Object token = get("refresh_token:" + userId);
        return token != null ? token.toString() : null;
    }

    public void deleteRefreshToken(Long userId) {
        delete("refresh_token:" + userId);
    }

    // ===== BLACKLIST ACCESS TOKEN =====

    public void blacklistToken(String token, long expirationMs) {
        set("blacklist:" + token, "revoked", expirationMs, TimeUnit.MILLISECONDS);
    }

    public boolean isTokenBlacklisted(String token) {
        return exists("blacklist:" + token);
    }

    // ===== RATE LIMITING =====

    public boolean isRateLimited(String ip, int maxRequests, long windowSeconds) {
        String key = "rate_limit:" + ip;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == 1) {
            redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS);
        }
        return count > maxRequests;
    }

    // ===== CACHE Äá»€ THI =====

    public void cacheExam(Long examId, Object examData) {
        set("exam:" + examId, examData, 1, TimeUnit.HOURS);
    }

    public Object getCachedExam(Long examId) {
        return get("exam:" + examId);
    }

    public void evictExamCache(Long examId) {
        delete("exam:" + examId);
    }

    // ===== TRáº NG THÃI LÃ€M BÃ€I =====

    public void saveExamProgress(Long userId, Long examId, Object answers) {
        set("exam_progress:" + userId + ":" + examId, answers, 2, TimeUnit.HOURS);
    }

    public Object getExamProgress(Long userId, Long examId) {
        return get("exam_progress:" + userId + ":" + examId);
    }

    public void clearExamProgress(Long userId, Long examId) {
        delete("exam_progress:" + userId + ":" + examId);
    }

    // ===== Äáº¾M NGÆ¯á»¢C THá»œI GIAN THI =====

    public void startExamTimer(Long userId, Long examId, int durationMinutes) {
        set("exam_timer:" + userId + ":" + examId,
                System.currentTimeMillis(),
                durationMinutes + 5,
                TimeUnit.MINUTES);
    }

    public Long getExamStartTime(Long userId, Long examId) {
        Object time = get("exam_timer:" + userId + ":" + examId);
        return time != null ? Long.parseLong(time.toString()) : null;
    }

    // ===== CACHE Káº¾T QUáº¢ BÃ€I THI =====

    public void cacheExamResult(Long attemptId, Object result) {
        set("exam_result:" + attemptId, result, 24, TimeUnit.HOURS);
    }

    public Object getCachedExamResult(Long attemptId) {
        return get("exam_result:" + attemptId);
    }

    // ===== LEADERBOARD =====

    public void updateLeaderboard(String examId, String userId, double score) {
        redisTemplate.opsForZSet().add("leaderboard:" + examId, userId, score);
    }

    public Object getTopLeaderboard(String examId, int top) {
        return redisTemplate.opsForZSet()
                .reverseRangeWithScores("leaderboard:" + examId, 0, top - 1);
    }

    // ===== ONLINE USERS =====

    public void userOnline(Long userId) {
        set("online:" + userId, "true", 5, TimeUnit.MINUTES);
    }

    public boolean isUserOnline(Long userId) {
        return exists("online:" + userId);
    }
}



