package vn.aimhigh.aimhighbackend.service;

import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.dto.response.MediaUploadResponse;

public interface MediaStorageService {
    MediaUploadResponse upload(MultipartFile file, String type);
}