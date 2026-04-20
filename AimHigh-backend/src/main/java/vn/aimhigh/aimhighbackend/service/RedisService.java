package vn.aimhigh.aimhighbackend.service;

import java.util.concurrent.TimeUnit;

public interface RedisService {
    void set(String key, Object value, long timeout, TimeUnit unit);

    Object get(String key);

    void delete(String key);

    boolean exists(String key);

    void saveRefreshToken(Long userId, String token);

    String getRefreshToken(Long userId);

    void deleteRefreshToken(Long userId);

    void blacklistToken(String token, long expirationMs);

    boolean isTokenBlacklisted(String token);

    boolean isRateLimited(String ip, int maxRequests, long windowSeconds);

    void cacheExam(Long examId, Object examData);

    Object getCachedExam(Long examId);

    void evictExamCache(Long examId);

    void saveExamProgress(Long userId, Long examId, Object answers);

    Object getExamProgress(Long userId, Long examId);

    void clearExamProgress(Long userId, Long examId);

    void startExamTimer(Long userId, Long examId, int durationMinutes);

    Long getExamStartTime(Long userId, Long examId);

    void cacheExamResult(Long attemptId, Object result);

    Object getCachedExamResult(Long attemptId);

    void updateLeaderboard(String examId, String userId, double score);

    Object getTopLeaderboard(String examId, int top);

    void userOnline(Long userId);

    boolean isUserOnline(Long userId);
}
