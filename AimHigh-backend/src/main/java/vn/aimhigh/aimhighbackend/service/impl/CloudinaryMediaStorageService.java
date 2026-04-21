package vn.aimhigh.aimhighbackend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.config.CloudinaryProperties;
import vn.aimhigh.aimhighbackend.dto.response.MediaUploadResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.service.MediaStorageService;

import java.io.IOException;
import java.text.Normalizer;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryMediaStorageService implements MediaStorageService {

    private static final Set<String> AUDIO_EXTENSIONS = Set.of(
            "mp3", "wav", "ogg", "m4a", "aac", "flac"
    );

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(
            "png", "jpg", "jpeg", "webp", "gif"
    );

    private final CloudinaryProperties properties;
    private final Cloudinary cloudinary;

    @Override
    public MediaUploadResponse upload(MultipartFile file, String type) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File tải lên không hợp lệ hoặc đang rỗng.");
        }

        String normalizedType = normalizeType(type);
        validateFile(file, normalizedType);

        if (!StringUtils.hasText(properties.getCloudName())) {
            throw new BadRequestException("Cloudinary chưa được cấu hình (thiếu cloud-name).");
        }

        String originalFileName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "media-file";
        String safeFileName = sanitizeFileName(originalFileName);
        
        // Remove file extension from safeFileName for Cloudinary public_id
        String nameWithoutExtension = getFileNameWithoutExtension(safeFileName);
        
        String prefixFolder = normalizedType.equals("audio") 
                ? properties.getListeningPrefix() 
                : properties.getAvatarPrefix();
        
        String resourceType = normalizedType.equals("audio") ? "video" : "image"; // Cloudinary treats audio as video resource_type

        try {
            Map<String, Object> uploadParams = ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", prefixFolder,
                    "public_id", UUID.randomUUID() + "-" + nameWithoutExtension
            );

            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
            
            String secureUrl = uploadResult.get("secure_url").toString();
            String publicId = uploadResult.get("public_id").toString();
            String resFormat = uploadResult.get("format").toString();
            
            String finalFileName = nameWithoutExtension + "." + resFormat;

            return MediaUploadResponse.builder()
                    .type(normalizedType)
                    .fileName(finalFileName)
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .key(publicId)
                    .url(secureUrl)
                    .build();

        } catch (IOException e) {
            throw new RuntimeException("Không thể tải dữ liệu lên Cloudinary.", e);
        }
    }

    private String normalizeType(String type) {
        if (!StringUtils.hasText(type)) {
            return "audio";
        }

        String normalized = type.trim().toLowerCase();
        if (!normalized.equals("audio") && !normalized.equals("image")) {
            throw new BadRequestException("Loại media không hợp lệ. Chỉ hỗ trợ 'audio' hoặc 'image'.");
        }
        return normalized;
    }

    private void validateFile(MultipartFile file, String type) {
        String extension = getFileExtension(file.getOriginalFilename());

        if (type.equals("audio")) {
            if (!AUDIO_EXTENSIONS.contains(extension)) {
                throw new BadRequestException("Định dạng audio không được hỗ trợ.");
            }

            if (file.getSize() > properties.getMaxAudioBytes()) {
                throw new BadRequestException("Kích thước file audio vượt quá giới hạn cho phép.");
            }
            return;
        }

        if (!IMAGE_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Định dạng hình ảnh không được hỗ trợ.");
        }
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "file";
        String normalized = Normalizer.normalize(fileName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-zA-Z0-9._-]", "-");
        return normalized;
    }

    private String getFileExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) return "";
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) return "";
        return fileName.substring(index + 1).toLowerCase();
    }
    
    private String getFileNameWithoutExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) return "file";
        int index = fileName.lastIndexOf('.');
        if (index < 0) return fileName;
        return fileName.substring(0, index);
    }
}
