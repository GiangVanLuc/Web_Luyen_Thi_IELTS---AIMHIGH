package vn.aimhigh.aimhighbackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.storage.cloudinary")
public class CloudinaryProperties {
    private String cloudName;
    private String apiKey;
    private String apiSecret;
    private String listeningPrefix = "aimhigh/listening";
    private String avatarPrefix = "aimhigh/avatars";
    private long maxAudioBytes = 52428800; // 50MB
}
