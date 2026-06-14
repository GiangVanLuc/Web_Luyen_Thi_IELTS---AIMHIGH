package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.AiChatMessage;
import vn.aimhigh.aimhighbackend.model.User;

import java.util.List;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {
    List<AiChatMessage> findTop30ByUserOrderByCreatedAtDesc(User user);

    void deleteByUser(User user);
}
