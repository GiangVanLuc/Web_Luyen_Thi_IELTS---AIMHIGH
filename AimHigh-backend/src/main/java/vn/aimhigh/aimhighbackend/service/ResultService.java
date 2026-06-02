package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ResultService {
    ResultResponse getResult(Long attemptId, Long userId);

    List<AttemptResponse> getMyAttempts(Long userId);
    
    Page<AttemptResponse> getTestHistory(Long userId, Pageable pageable);
}
