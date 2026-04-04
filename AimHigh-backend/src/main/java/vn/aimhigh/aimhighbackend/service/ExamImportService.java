package vn.aimhigh.aimhighbackend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import vn.aimhigh.aimhighbackend.enums.ExamType;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamImportService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Exam importFromJson(JsonNode rootNode) {
        log.info("Tiến hành import JSON...");
        
        JsonNode examNode = rootNode.get("exam");
        if (examNode == null) {
            throw new BadRequestException("Thiếu object 'exam'");
        }
        
        // 1. Parse metadata
        String title = examNode.has("title") ? examNode.path("title").textValue() : "Unknown Exam";
        Integer duration = examNode.has("duration") ? examNode.path("duration").asInt() : 60;
        String skillStr = examNode.has("skill") ? examNode.path("skill").textValue() : "READING";
        
        Skill skill;
        try { skill = Skill.valueOf(skillStr.toUpperCase()); } 
        catch (Exception e) { skill = Skill.READING; }

        Exam exam = Exam.builder()
                .title(title)
                .duration(duration)
                .skill(skill)
                .isActive(true)
                .level(ExamLevel.MEDIUM)
                .type(ExamType.ACADEMIC)
                .build();
                
        exam = examRepository.save(exam);
        
        // 2. Extract Questions and strip correctAnswer
        List<Question> questions = new ArrayList<>();
        extractQuestionsAndStripAnswers(rootNode, questions, exam);
        
        if (questions.isEmpty()) {
            throw new BadRequestException("Không tìm thấy questionNumber hay correctAnswer nào trong JSON data!");
        }
        
        questionRepository.saveAll(questions);
        
        // 3. Save purely the stripped JSON as clientData
        try {
            String clientData = objectMapper.writeValueAsString(rootNode);
            exam.setExamData(clientData);
        } catch (Exception e) {
            log.error("Failed to serialize stripped JSON", e);
            throw new RuntimeException("Serialization failed");
        }
        
        return examRepository.save(exam);
    }

    private void extractQuestionsAndStripAnswers(JsonNode node, List<Question> outputList, Exam exam) {
        if (node.isObject()) {
            ObjectNode objNode = (ObjectNode) node;
            if (objNode.has("questionNumber") && objNode.has("correctAnswer")) {
                Integer questionNumber = objNode.path("questionNumber").asInt();
                String correctAnswer = objNode.path("correctAnswer").textValue();
                String questionText = objNode.has("questionText") ? objNode.path("questionText").textValue() : "";
                
                Question q = Question.builder()
                        .exam(exam)
                        .questionNumber(questionNumber)
                        .correctAnswer(correctAnswer)
                        .questionText(questionText)
                        .points(1.0)
                        .build();
                outputList.add(q);
                
                // Trọng tâm là đây: lột bỏ correctAnswer để phòng chống gian lận!
                objNode.remove("correctAnswer");
            }
            
            // Tiếp tục đệ quy cho các properties khác
            Iterator<Map.Entry<String, JsonNode>> properties = objNode.properties().iterator();
            while (properties.hasNext()) {
                extractQuestionsAndStripAnswers(properties.next().getValue(), outputList, exam);
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                extractQuestionsAndStripAnswers(child, outputList, exam);
            }
        }
    }

    public Exam importFromExcel(MultipartFile file) {
        log.info("Tiến hành import Excel bằng POI...");
        return new Exam();
    }

    public byte[] downloadTemplate(Skill skill) {
        return new byte[0];
    }
}
