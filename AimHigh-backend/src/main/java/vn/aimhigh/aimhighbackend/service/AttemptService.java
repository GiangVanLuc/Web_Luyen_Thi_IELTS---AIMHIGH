package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.SaveProgressRequest;
import vn.aimhigh.aimhighbackend.dto.request.StartAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.request.SubmitAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ProgressResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;

import java.util.List;

public interface AttemptService {
    AttemptResponse startAttempt(StartAttemptRequest request, Long userId);

    void saveProgress(Long attemptId, SaveProgressRequest request, Long userId);

    List<ProgressResponse> getProgress(Long attemptId, Long userId);

    ResultResponse submitAttempt(Long attemptId, SubmitAttemptRequest request, Long userId);
}
