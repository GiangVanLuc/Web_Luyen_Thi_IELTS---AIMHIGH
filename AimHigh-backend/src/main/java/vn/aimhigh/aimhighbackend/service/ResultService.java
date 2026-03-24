package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResultService {
    public ResultResponse getResult(Long attemptId, Long userId) {
        log.info("Get Result Attempt: {}", attemptId);
        // TODO: Đọc Redis / Tính trực tiếp từ DB
        return ResultResponse.builder().attemptId(attemptId).build();
    }
}
