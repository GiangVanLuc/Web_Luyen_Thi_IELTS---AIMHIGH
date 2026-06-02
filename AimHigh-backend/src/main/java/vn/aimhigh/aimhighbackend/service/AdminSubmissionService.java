package vn.aimhigh.aimhighbackend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.aimhigh.aimhighbackend.dto.request.AdminGradeRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminSubmissionResponse;

public interface AdminSubmissionService {
    Page<AdminSubmissionResponse> getSubmissions(String skillFilter, Pageable pageable);
    void gradeSubmission(Long attemptId, AdminGradeRequest request);
}
