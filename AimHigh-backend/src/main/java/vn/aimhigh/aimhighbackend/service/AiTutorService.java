package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.AiChatRequest;
import vn.aimhigh.aimhighbackend.dto.response.AiChatMessageResponse;
import vn.aimhigh.aimhighbackend.dto.response.AiChatResponse;
import vn.aimhigh.aimhighbackend.model.User;

import java.util.List;

public interface AiTutorService {
    AiChatResponse chat(User user, AiChatRequest request);

    List<AiChatMessageResponse> getHistory(User user);

    void clearHistory(User user);
}
