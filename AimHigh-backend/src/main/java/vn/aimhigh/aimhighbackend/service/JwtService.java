package vn.aimhigh.aimhighbackend.service;

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
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

    @Value("${jwt.secret-key}")
    private String secretKey;

    private static final long ACCESS_TOKEN_MINUTES = 30;
    private static final long REFRESH_TOKEN_DAYS = 30;

    /**
     * Generate access token (30 minutes) using HS512
     */
    public String generateAccessToken(User user) {
        try {
            Instant now = Instant.now();
            Date issuedAt = Date.from(now);
            Date expiresAt = Date.from(now.plus(ACCESS_TOKEN_MINUTES, ChronoUnit.MINUTES));

            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getEmail())
                    .issueTime(issuedAt)
                    .expirationTime(expiresAt)
                    .claim("role", user.getRole())
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);

            MACSigner signer = new MACSigner(secretKey.getBytes(StandardCharsets.UTF_8));
            signedJWT.sign(signer);

            return signedJWT.serialize();
        } catch (JOSEException e) {
            logger.error("Error generating access token for user={}", user != null ? user.getEmail() : "<null>", e);
            throw new JwtServiceException("Failed to generate access token", e);
        }
    }

    /**
     * Generate refresh token (30 days) using HS512
     */
    public String generateRefreshToken(User user) {
        try {
            Instant now = Instant.now();
            Date issuedAt = Date.from(now);
            Date expiresAt = Date.from(now.plus(REFRESH_TOKEN_DAYS, ChronoUnit.DAYS));

            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getEmail())
                    .issueTime(issuedAt)
                    .expirationTime(expiresAt)
                    .claim("role", user.getRole())
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);

            MACSigner signer = new MACSigner(secretKey.getBytes(StandardCharsets.UTF_8));
            signedJWT.sign(signer);

            return signedJWT.serialize();
        } catch (JOSEException e) {
            logger.error("Error generating refresh token for user={}", user != null ? user.getEmail() : "<null>", e);
            throw new JwtServiceException("Failed to generate refresh token", e);
        }
    }

    /**
     * Verify token signature and expiration. Returns true if valid, false otherwise.
     */
    public boolean verifyToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            // Verify signature using MACVerifier
            MACVerifier verifier = new MACVerifier(secretKey.getBytes(StandardCharsets.UTF_8));
            boolean signatureValid = signedJWT.verify(verifier);
            if (!signatureValid) {
                logger.warn("JWT signature verification failed");
                return false;
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date exp = claims.getExpirationTime();
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

    /**
     * Extract email (subject) from token. Throws JwtServiceException if parsing fails.
     */
    public String extractEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtServiceException("Token is null or empty");
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            return claims.getSubject();
        } catch (ParseException e) {
            logger.error("Failed to parse token to extract email", e);
            throw new JwtServiceException("Failed to extract email from token", e);
        }
    }

    /**
     * Custom runtime exception for JwtService failures
     */
    public static class JwtServiceException extends RuntimeException {
        public JwtServiceException(String message) {
            super(message);
        }

        public JwtServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}

