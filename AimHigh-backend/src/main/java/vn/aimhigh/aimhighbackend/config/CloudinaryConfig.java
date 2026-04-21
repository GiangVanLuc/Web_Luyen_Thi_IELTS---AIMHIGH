package vn.aimhigh.aimhighbackend.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@RequiredArgsConstructor
public class CloudinaryConfig {

    private final CloudinaryProperties properties;

    @Bean
    public Cloudinary cloudinary() {
        if (!StringUtils.hasText(properties.getCloudName()) || 
            !StringUtils.hasText(properties.getApiKey()) || 
            !StringUtils.hasText(properties.getApiSecret())) {
            // Trả về một đối tượng Cloudinary mặc định hoặc trống, 
            // nó sẽ quăng lỗi khi thực sự gọi để đảm bảo hệ thống start được nếu thiếu key.
            return new Cloudinary();
        }
        
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", properties.getCloudName(),
                "api_key", properties.getApiKey(),
                "api_secret", properties.getApiSecret(),
                "secure", true
        ));
    }
}
