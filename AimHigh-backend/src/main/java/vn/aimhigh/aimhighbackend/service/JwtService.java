package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.model.User;

public interface JwtService {
    String generateAccessToken(User user);

    String generateRefreshToken(User user);

    boolean verifyToken(String token);

    String extractEmail(String token);

    String extractRole(String token);
}
