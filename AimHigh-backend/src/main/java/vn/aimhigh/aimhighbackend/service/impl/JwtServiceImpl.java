package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.JwtService;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.model.User;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtServiceImpl implements JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    @Value("${app.jwt.secret-key}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms:1800000}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms:2592000000}")
    private long refreshTokenExpirationMs;

    public String generateAccessToken(User user) {
        try {
            Instant now = Instant.now();

            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getEmail())
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plusMillis(accessTokenExpirationMs)))
                    .claim("role", user.getRole().name())
                    .claim("name", user.getName())
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);
            signedJWT.sign(new MACSigner(secretKey.getBytes(StandardCharsets.UTF_8)));

            return signedJWT.serialize();
        } catch (JOSEException e) {
            logger.error("Error generating access token for user={}",
                    user != null ? user.getEmail() : "<null>", e);
            throw new JwtServiceException("Failed to generate access token", e);
        }
    }

    public String generateRefreshToken(User user) {
        try {
            Instant now = Instant.now();

            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getEmail())
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plusMillis(refreshTokenExpirationMs)))
                    .claim("role", user.getRole().name())
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);
            signedJWT.sign(new MACSigner(secretKey.getBytes(StandardCharsets.UTF_8)));

            return signedJWT.serialize();
        } catch (JOSEException e) {
            logger.error("Error generating refresh token for user={}",
                    user != null ? user.getEmail() : "<null>", e);
            throw new JwtServiceException("Failed to generate refresh token", e);
        }
    }

    public boolean verifyToken(String token) {
        if (token == null || token.isBlank()) return false;

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            MACVerifier verifier = new MACVerifier(secretKey.getBytes(StandardCharsets.UTF_8));
            if (!signedJWT.verify(verifier)) {
                logger.warn("JWT signature verification failed");
                return false;
            }

            Date exp = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (exp == null) {
                logger.warn("JWT contains no expiration claim");
                return false;
            }

            if (exp.before(new Date())) {
                logger.info("JWT is expired at {}", exp);
                return false;
            }

            return true;
        } catch (ParseException | JOSEException e) {
            logger.error("Failed to verify token", e);
            return false;
        }
    }

    public String extractEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtServiceException("Token is null or empty");
        }

        try {
            return SignedJWT.parse(token).getJWTClaimsSet().getSubject();
        } catch (ParseException e) {
            logger.error("Failed to parse token to extract email", e);
            throw new JwtServiceException("Failed to extract email from token", e);
        }
    }

    // âœ… ThÃªm method extractRole â€” dÃ¹ng trong SecurityConfig sau nÃ y
    public String extractRole(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtServiceException("Token is null or empty");
        }

        try {
            return SignedJWT.parse(token)
                    .getJWTClaimsSet()
                    .getStringClaim("role");
        } catch (ParseException e) {
            logger.error("Failed to parse token to extract role", e);
            throw new JwtServiceException("Failed to extract role from token", e);
        }
    }

    public static class JwtServiceException extends RuntimeException {
        public JwtServiceException(String message) { super(message); }
        public JwtServiceException(String message, Throwable cause) { super(message, cause); }
    }
}


