package vn.aimhigh.aimhighbackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.URI;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(resolveAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        String configured = allowedOrigins != null && !allowedOrigins.isBlank()
                ? allowedOrigins
                : frontendUrl;

        List<String> origins = Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .map(this::toOrigin)
                .filter(origin -> !origin.isBlank() && !"*".equals(origin))
                .distinct()
                .toList();

        return origins.isEmpty() ? List.of("http://localhost:5500") : origins;
    }

    private String toOrigin(String raw) {
        try {
            URI uri = URI.create(raw);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return raw;
            }
            int port = uri.getPort();
            return uri.getScheme() + "://" + uri.getHost() + (port >= 0 ? ":" + port : "");
        } catch (IllegalArgumentException ignored) {
            return raw;
        }
    }
}
