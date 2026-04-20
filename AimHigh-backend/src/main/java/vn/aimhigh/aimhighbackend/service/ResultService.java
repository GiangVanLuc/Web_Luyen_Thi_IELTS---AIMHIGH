package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;

import java.util.List;

public interface ResultService {
    ResultResponse getResult(Long attemptId, Long userId);

    List<AttemptResponse> getMyAttempts(Long userId);
}
