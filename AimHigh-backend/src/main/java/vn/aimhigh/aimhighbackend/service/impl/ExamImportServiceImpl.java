package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.ExamImportService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import vn.aimhigh.aimhighbackend.enums.ExamType;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.model.Choice;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.ListeningPart;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.model.ReadingPassage;
import vn.aimhigh.aimhighbackend.repository.ChoiceRepository;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.ListeningPartRepository;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;
import vn.aimhigh.aimhighbackend.repository.ReadingPassageRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamImportServiceImpl implements ExamImportService {

    private final ExamRepository examRepository;
    private final ListeningPartRepository listeningPartRepository;
    private final ReadingPassageRepository readingPassageRepository;
    private final QuestionRepository questionRepository;
    private final ChoiceRepository choiceRepository;
    private final ObjectMapper objectMapper;
    private final ExamSchemaNormalizer schemaNormalizer;

    @Transactional
    public Exam importFromJson(JsonNode rootNode) {
        log.info("Tiến hành import JSON...");

        if (rootNode == null || !rootNode.isObject()) {
            throw new BadRequestException("Payload JSON không hợp lệ");
        }

        JsonNode workingNode = rootNode.deepCopy();
        // Pha 0: chuẩn hoá type nhóm câu + correctAnswer (| -> /) trước khi persist
        schemaNormalizer.normalize(workingNode);
        JsonNode examNode = workingNode.get("exam");
        if (examNode == null) {
            throw new BadRequestException("Thiếu object 'exam'");
        }

        // 1. Parse metadata
        String title = examNode.has("title") ? examNode.path("title").textValue() : "Unknown Exam";
        Integer duration = examNode.has("duration") ? examNode.path("duration").asInt() : 60;
        String skillStr = examNode.has("skill") ? examNode.path("skill").textValue() : "READING";

        Skill skill;
        try {
            skill = Skill.valueOf(skillStr.toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            skill = Skill.READING;
        }

        JsonNode sectionsNode = workingNode.path("sections");
        if (!sectionsNode.isArray() || sectionsNode.isEmpty()) {
            throw new BadRequestException("Thiếu mảng 'sections' hoặc sections rỗng");
        }

        Exam exam = Exam.builder()
                .title(title)
                .duration(duration)
                .skill(skill)
                .status(vn.aimhigh.aimhighbackend.enums.ExamStatus.PUBLISHED)
                .level(ExamLevel.MEDIUM)
                .type(ExamType.ACADEMIC)
                .description(examNode.path("description").asText(null))
                .thumbnail(examNode.path("thumbnail").asText(null))
                .build();

        exam = examRepository.save(exam);

        int createdQuestionCount = 0;
        Set<Integer> uniqueQuestionNumbers = new HashSet<>();

        if (skill == Skill.LISTENING) {
            createdQuestionCount = persistListeningStructure(exam, sectionsNode, uniqueQuestionNumbers);
        } else if (skill == Skill.READING) {
            createdQuestionCount = persistReadingStructure(exam, sectionsNode, uniqueQuestionNumbers);
        } else {
            createdQuestionCount = persistSubjectiveStructure(exam, sectionsNode, uniqueQuestionNumbers);
        }

        sanitizeExamDataForClient(workingNode);
        injectExamMetadata(workingNode, exam, createdQuestionCount);

        if (createdQuestionCount <= 0) {
            throw new BadRequestException("Không tìm thấy questionNumber hay correctAnswer nào trong JSON data!");
        }

        // 3. Save purely the stripped JSON as clientData
        try {
            String clientData = objectMapper.writeValueAsString(workingNode);
            exam.setExamData(clientData);
        } catch (Exception e) {
            log.error("Failed to serialize stripped JSON", e);
            throw new RuntimeException("Serialization failed");
        }

        return examRepository.save(exam);
    }

    private int persistListeningStructure(Exam exam, JsonNode sectionsNode, Set<Integer> uniqueQuestionNumbers) {
        int created = 0;

        for (JsonNode sectionNode : sectionsNode) {
            int sectionNumber = sectionNode.path("sectionNumber").asInt(0);
            if (sectionNumber <= 0) {
                throw new BadRequestException("Listening section thiếu sectionNumber hợp lệ");
            }

            ListeningPart part = ListeningPart.builder()
                    .exam(exam)
                    .partNumber(sectionNumber)
                    .partOrder(sectionNumber)
                    .title(sectionNode.path("label").asText("Section " + sectionNumber))
                    .audioUrl(sectionNode.path("audioUrl").asText(null))
                    .audioDuration(sectionNode.path("audioDuration").asInt(0))
                    .transcript(sectionNode.path("transcript").asText(null))
                    .build();
            part = listeningPartRepository.save(part);
            ((ObjectNode) sectionNode).put("id", part.getId());

            List<JsonNode> questionNodes = collectQuestionNodesInSection(sectionNode);
            ensureSectionHasQuestions(questionNodes, sectionNumber);
            validateSectionRange(sectionNode, questionNodes, sectionNumber);

            created += persistQuestionsForContainer(exam, null, part, questionNodes, uniqueQuestionNumbers);
        }

        return created;
    }

    private int persistReadingStructure(Exam exam, JsonNode sectionsNode, Set<Integer> uniqueQuestionNumbers) {
        int created = 0;

        for (JsonNode sectionNode : sectionsNode) {
            int sectionNumber = sectionNode.path("sectionNumber").asInt(0);
            if (sectionNumber <= 0) {
                throw new BadRequestException("Reading section thiếu sectionNumber hợp lệ");
            }

            JsonNode passagesNode = sectionNode.path("passages");
            if (!passagesNode.isArray() || passagesNode.isEmpty()) {
                throw new BadRequestException("Reading section " + sectionNumber + " phải có passages");
            }

            List<ReadingPassage> passageEntities = new ArrayList<>();
            int idx = 0;
            for (JsonNode passageNode : passagesNode) {
                idx++;
                ReadingPassage passage = ReadingPassage.builder()
                        .exam(exam)
                    .sectionNumber(sectionNumber)
                    .passageOrderInSection(idx)
                        .passageOrder(sectionNumber * 10 + idx)
                        .title(passageNode.path("title").asText("Passage " + sectionNumber))
                        .content(passageNode.path("content").asText(""))
                        .wordCount(countWords(passageNode.path("content").asText("")))
                        .imageUrl(passageNode.path("imageUrl").asText(null))
                        .build();
                passage = readingPassageRepository.save(passage);
                passageEntities.add(passage);
                ((ObjectNode) passageNode).put("id", passage.getId());
            }

            ReadingPassage primaryPassage = passageEntities.getFirst();

            List<JsonNode> questionNodes = collectQuestionNodesInSection(sectionNode);
            ensureSectionHasQuestions(questionNodes, sectionNumber);
            validateSectionRange(sectionNode, questionNodes, sectionNumber);

            created += persistQuestionsForContainer(exam, primaryPassage, null, questionNodes, uniqueQuestionNumbers);
        }

        return created;
    }

    private int persistSubjectiveStructure(Exam exam, JsonNode sectionsNode, Set<Integer> uniqueQuestionNumbers) {
        int created = 0;

        for (JsonNode sectionNode : sectionsNode) {
            int sectionNumber = sectionNode.path("sectionNumber").asInt(0);
            if (sectionNumber <= 0) {
                throw new BadRequestException("Subjective section thieu sectionNumber hop le");
            }

            List<JsonNode> questionNodes = collectQuestionNodesInSection(sectionNode);
            ensureSectionHasQuestions(questionNodes, sectionNumber);
            validateSectionRange(sectionNode, questionNodes, sectionNumber);

            created += persistSubjectiveQuestions(exam, questionNodes, uniqueQuestionNumbers);
        }

        return created;
    }

    private int persistSubjectiveQuestions(
            Exam exam,
            List<JsonNode> questionNodes,
            Set<Integer> uniqueQuestionNumbers
    ) {
        int created = 0;

        questionNodes.sort(Comparator.comparingInt(node -> node.path("questionNumber").asInt()));
        int order = 0;

        for (JsonNode questionNode : questionNodes) {
            int questionNumber = questionNode.path("questionNumber").asInt(0);
            if (questionNumber <= 0) {
                throw new BadRequestException("Cau hoi thieu questionNumber hop le");
            }

            if (!uniqueQuestionNumbers.add(questionNumber)) {
                throw new BadRequestException("Trung questionNumber: " + questionNumber);
            }

            order++;
            Question question = Question.builder()
                    .exam(exam)
                    .questionNumber(questionNumber)
                    .questionOrder(order)
                    .questionText(resolveQuestionText(questionNode))
                    .correctAnswer(null)
                    .explanation(questionNode.path("explanation").asText(null))
                    .points(questionNode.path("points").asDouble(1.0))
                    .build();

            question = questionRepository.save(question);
            created++;
            ((ObjectNode) questionNode).put("id", question.getId());
        }

        return created;
    }

    private int persistQuestionsForContainer(
            Exam exam,
            ReadingPassage readingPassage,
            ListeningPart listeningPart,
            List<JsonNode> questionNodes,
            Set<Integer> uniqueQuestionNumbers
    ) {
        int created = 0;

        questionNodes.sort(Comparator.comparingInt(node -> node.path("questionNumber").asInt()));
        int order = 0;

        for (JsonNode questionNode : questionNodes) {
            int questionNumber = questionNode.path("questionNumber").asInt(0);
            if (questionNumber <= 0) {
                throw new BadRequestException("Có câu hỏi thiếu questionNumber hợp lệ");
            }

            if (!uniqueQuestionNumbers.add(questionNumber)) {
                throw new BadRequestException("Trùng questionNumber: " + questionNumber);
            }

            String correctAnswer = questionNode.path("correctAnswer").asText(null);
            if (correctAnswer == null || correctAnswer.isBlank()) {
                throw new BadRequestException("Câu " + questionNumber + " thiếu correctAnswer");
            }

            order++;
            Question question = Question.builder()
                    .exam(exam)
                    .readingPassage(readingPassage)
                    .listeningPart(listeningPart)
                    .questionNumber(questionNumber)
                    .questionOrder(order)
                    .questionText(resolveQuestionText(questionNode))
                    .correctAnswer(correctAnswer)
                    .explanation(questionNode.path("explanation").asText(null))
                    .audioStart(questionNode.path("audioStart").asInt(0))
                    .audioEnd(questionNode.path("audioEnd").asInt(0))
                    .points(questionNode.path("points").asDouble(1.0))
                    .build();

            question = questionRepository.save(question);
            created++;
            ((ObjectNode) questionNode).put("id", question.getId());

            JsonNode choicesNode = questionNode.path("choices");
            if (choicesNode.isArray()) {
                for (JsonNode choiceNode : choicesNode) {
                    Choice choice = Choice.builder()
                            .question(question)
                            .choiceLabel(choiceNode.path("label").asText(null))
                            .choiceText(choiceNode.path("text").asText(""))
                            .isCorrect(choiceNode.path("isCorrect").asBoolean(false))
                            .build();
                    choice = choiceRepository.save(choice);
                    ((ObjectNode) choiceNode).put("id", choice.getId());
                }
            }
        }

        return created;
    }

    private List<JsonNode> collectQuestionNodesInSection(JsonNode sectionNode) {
        List<JsonNode> questionNodes = new ArrayList<>();
        JsonNode groups = sectionNode.path("groups");
        if (!groups.isArray()) {
            return questionNodes;
        }

        for (JsonNode groupNode : groups) {
            addQuestionNodes(questionNodes, groupNode.path("questions"));

            JsonNode subBlocks = groupNode.path("subBlocks");
            if (subBlocks.isArray()) {
                for (JsonNode subBlock : subBlocks) {
                    addQuestionNodes(questionNodes, subBlock.path("questions"));
                }
            }

            JsonNode tableRows = groupNode.path("tableRows");
            if (tableRows.isArray()) {
                for (JsonNode row : tableRows) {
                    JsonNode cells = row.path("cells");
                    if (!cells.isArray()) {
                        continue;
                    }
                    for (JsonNode cell : cells) {
                        if (cell.isObject() && cell.has("questionNumber")) {
                            questionNodes.add(cell);
                        }
                    }
                }
            }
        }

        return questionNodes;
    }

    private void addQuestionNodes(List<JsonNode> target, JsonNode node) {
        if (!node.isArray()) {
            return;
        }
        for (JsonNode q : node) {
            if (q.isObject() && q.has("questionNumber")) {
                target.add(q);
            }
        }
    }

    private void ensureSectionHasQuestions(List<JsonNode> questionNodes, int sectionNumber) {
        if (questionNodes.isEmpty()) {
            throw new BadRequestException("Section " + sectionNumber + " không có câu hỏi hợp lệ");
        }
    }

    private void validateSectionRange(JsonNode sectionNode, List<JsonNode> questionNodes, int sectionNumber) {
        int minInQuestions = Integer.MAX_VALUE;
        int maxInQuestions = Integer.MIN_VALUE;
        for (JsonNode questionNode : questionNodes) {
            int number = questionNode.path("questionNumber").asInt(0);
            if (number <= 0) continue;
            minInQuestions = Math.min(minInQuestions, number);
            maxInQuestions = Math.max(maxInQuestions, number);
        }

        int from = sectionNode.path("questionFrom").asInt(0);
        int to = sectionNode.path("questionTo").asInt(0);

        // Auto-infer if missing or invalid
        if (from <= 0 || to <= 0 || from > to) {
            if (minInQuestions == Integer.MAX_VALUE) {
                throw new BadRequestException("Section " + sectionNumber + " không có câu hỏi hợp lệ");
            }
            from = minInQuestions;
            to = maxInQuestions;
            // Update node so it gets saved correctly in clientData
            ((ObjectNode) sectionNode).put("questionFrom", from);
            ((ObjectNode) sectionNode).put("questionTo", to);
        }

        if (minInQuestions < from || maxInQuestions > to) {
            throw new BadRequestException(
                    "Question range của section " + sectionNumber + " không khớp: expected " + from + "-" + to + ", found " + minInQuestions + "-" + maxInQuestions
            );
        }
    }

    private void sanitizeExamDataForClient(JsonNode node) {
        if (node == null) {
            return;
        }

        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            objectNode.remove("correctAnswer");

            if (objectNode.has("choices") && objectNode.get("choices").isArray()) {
                for (JsonNode choiceNode : objectNode.get("choices")) {
                    if (choiceNode.isObject()) {
                        ((ObjectNode) choiceNode).remove("isCorrect");
                    }
                }
            }

            Iterator<Map.Entry<String, JsonNode>> properties = objectNode.properties().iterator();
            while (properties.hasNext()) {
                sanitizeExamDataForClient(properties.next().getValue());
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                sanitizeExamDataForClient(child);
            }
        }
    }

    private void injectExamMetadata(JsonNode workingNode, Exam exam, int totalQuestions) {
        JsonNode examNode = workingNode.path("exam");
        if (examNode.isObject()) {
            ObjectNode examObject = (ObjectNode) examNode;
            examObject.put("id", exam.getId());
            examObject.put("title", exam.getTitle());
            examObject.put("skill", String.valueOf(exam.getSkill()));
            examObject.put("duration", exam.getDuration() == null ? 0 : exam.getDuration());
            examObject.put("totalQuestions", totalQuestions);
        }

        if (!workingNode.has("sections") || !workingNode.get("sections").isArray()) {
            ((ObjectNode) workingNode).set("sections", objectMapper.createArrayNode());
        }
    }

    private String resolveQuestionText(JsonNode questionNode) {
        if (questionNode.hasNonNull("questionText") && !questionNode.path("questionText").asText().isBlank()) {
            return questionNode.path("questionText").asText();
        }
        if (questionNode.hasNonNull("prompt") && !questionNode.path("prompt").asText().isBlank()) {
            return questionNode.path("prompt").asText();
        }
        if (questionNode.hasNonNull("topic") && !questionNode.path("topic").asText().isBlank()) {
            return questionNode.path("topic").asText();
        }
        if (questionNode.hasNonNull("cueCard") && !questionNode.path("cueCard").asText().isBlank()) {
            return questionNode.path("cueCard").asText();
        }
        if (questionNode.hasNonNull("lineTemplate") && !questionNode.path("lineTemplate").asText().isBlank()) {
            return questionNode.path("lineTemplate").asText();
        }
        if (questionNode.hasNonNull("cellText") && !questionNode.path("cellText").asText().isBlank()) {
            return questionNode.path("cellText").asText();
        }
        return "Question " + questionNode.path("questionNumber").asInt();
    }

    private int countWords(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }
        return content.trim().split("\\s+").length;
    }

    public Exam importFromExcel(MultipartFile file) {
        log.info("Tiến hành import Excel bằng POI...");

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File Excel rỗng hoặc không tồn tại");
        }

        try (InputStream in = file.getInputStream(); Workbook workbook = new XSSFWorkbook(in)) {
            JsonNode payload = buildJsonPayloadFromWorkbook(workbook);
            return importFromJson(payload);
        } catch (IOException e) {
            log.error("Không thể đọc file Excel", e);
            throw new BadRequestException("Không thể đọc file Excel");
        }
    }

    public byte[] downloadTemplate(Skill skill) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            createExamSheet(workbook, skill, false);
            createSectionsSheet(workbook, skill, false);
            createPassagesSheet(workbook, skill, false);
            createQuestionsSheet(workbook, skill, false);
            createChoicesSheet(workbook, false);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Không thể tạo template Excel", e);
            throw new BadRequestException("Không thể tạo template Excel");
        }
    }

    public byte[] downloadFullSampleTemplate(Skill skill) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            createExamSheet(workbook, skill, true);
            createSectionsSheet(workbook, skill, true);
            createPassagesSheet(workbook, skill, true);
            createQuestionsSheet(workbook, skill, true);
            createChoicesSheet(workbook, true);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Không thể tạo full sample Excel", e);
            throw new BadRequestException("Không thể tạo full sample Excel");
        }
    }

    private JsonNode buildJsonPayloadFromWorkbook(Workbook workbook) {
        Map<String, String> examMeta = readKeyValueSheet(workbook.getSheet("Exam"));
        Skill skill = parseSkill(examMeta.getOrDefault("skill", "READING"));

        ArrayNode sectionsArray = objectMapper.createArrayNode();
        Map<Integer, ObjectNode> sectionMap = new LinkedHashMap<>();

        Sheet sectionsSheet = workbook.getSheet("Sections");
        if (sectionsSheet == null) {
            throw new BadRequestException("Thiếu sheet Sections");
        }
        forEachDataRow(sectionsSheet, row -> {
            int sectionNumber = parseInt(getCellString(row, 0), 0);
            if (sectionNumber <= 0) {
                return;
            }
            ObjectNode section = objectMapper.createObjectNode();
            section.put("sectionNumber", sectionNumber);
            section.put("label", getCellString(row, 1));
            section.put("questionFrom", parseInt(getCellString(row, 2), 0));
            section.put("questionTo", parseInt(getCellString(row, 3), 0));
            section.put("audioUrl", getCellString(row, 4));
            section.put("audioDuration", parseInt(getCellString(row, 5), 0));
            section.put("transcript", getCellString(row, 6));
            section.set("groups", objectMapper.createArrayNode());
            if (skill == Skill.READING) {
                section.set("passages", objectMapper.createArrayNode());
            }
            sectionMap.put(sectionNumber, section);
            sectionsArray.add(section);
        });

        if (sectionMap.isEmpty()) {
            throw new BadRequestException("Sheet Sections không có dữ liệu hợp lệ");
        }

        if (skill == Skill.READING) {
            Sheet passagesSheet = workbook.getSheet("Passages");
            if (passagesSheet == null) {
                throw new BadRequestException("Thiếu sheet Passages cho đề Reading");
            }
            forEachDataRow(passagesSheet, row -> {
                int sectionNumber = parseInt(getCellString(row, 0), 0);
                ObjectNode section = sectionMap.get(sectionNumber);
                if (section == null) {
                    return;
                }
                ObjectNode passage = objectMapper.createObjectNode();
                passage.put("title", getCellString(row, 2));
                passage.put("content", getCellString(row, 3));
                passage.put("imageUrl", getCellString(row, 4));
                ((ArrayNode) section.get("passages")).add(passage);
            });
        }

        Map<Integer, ObjectNode> groupMap = new LinkedHashMap<>();
        Sheet questionsSheet = workbook.getSheet("Questions");
        if (questionsSheet == null) {
            throw new BadRequestException("Thiếu sheet Questions");
        }
        forEachDataRow(questionsSheet, row -> {
            int sectionNumber = parseInt(getCellString(row, 0), 0);
            int questionNumber = parseInt(getCellString(row, 1), 0);
            if (sectionNumber <= 0 || questionNumber <= 0) {
                return;
            }

            ObjectNode section = sectionMap.get(sectionNumber);
            if (section == null) {
                return;
            }

            int groupKey = sectionNumber;
            ObjectNode group = groupMap.get(groupKey);
            if (group == null) {
                group = objectMapper.createObjectNode();
                group.put("title", "Group Section " + sectionNumber);
                group.put("type", "GENERAL");
                group.put("questionFrom", parseInt(section.path("questionFrom").asText("0"), 0));
                group.put("questionTo", parseInt(section.path("questionTo").asText("0"), 0));
                group.set("questions", objectMapper.createArrayNode());
                ((ArrayNode) section.get("groups")).add(group);
                groupMap.put(groupKey, group);
            }

            ObjectNode question = objectMapper.createObjectNode();
            question.put("questionNumber", questionNumber);
            question.put("questionText", getCellString(row, 2));
            question.put("correctAnswer", getCellString(row, 3));
            question.put("explanation", getCellString(row, 4));
            question.put("points", parseDouble(getCellString(row, 5), 1.0));
            question.put("audioStart", parseInt(getCellString(row, 6), 0));
            question.put("audioEnd", parseInt(getCellString(row, 7), 0));
            question.set("choices", objectMapper.createArrayNode());
            ((ArrayNode) group.get("questions")).add(question);
        });

        Map<Integer, ObjectNode> questionMap = indexQuestionsByNumber(sectionMap);

        Sheet choicesSheet = workbook.getSheet("Choices");
        if (choicesSheet != null) {
            forEachDataRow(choicesSheet, row -> {
                int questionNumber = parseInt(getCellString(row, 0), 0);
                ObjectNode question = questionMap.get(questionNumber);
                if (question == null) {
                    return;
                }

                String choiceText = getCellString(row, 2);
                if (choiceText.isBlank()) {
                    return;
                }

                ObjectNode choice = objectMapper.createObjectNode();
                choice.put("label", getCellString(row, 1));
                choice.put("text", choiceText);
                choice.put("isCorrect", parseBoolean(getCellString(row, 3)));
                ((ArrayNode) question.get("choices")).add(choice);
            });
        }

        ObjectNode examNode = objectMapper.createObjectNode();
        examNode.put("title", examMeta.getOrDefault("title", "Excel Imported Exam"));
        examNode.put("skill", skill.name());
        examNode.put("duration", parseInt(examMeta.getOrDefault("duration", "60"), 60));
        examNode.put("description", examMeta.getOrDefault("description", ""));

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("exam", examNode);
        payload.set("sections", sectionsArray);

        validateExcelPayload(payload, skill, examMeta);
        return payload;
    }

    private Map<Integer, ObjectNode> indexQuestionsByNumber(Map<Integer, ObjectNode> sectionMap) {
        Map<Integer, ObjectNode> result = new LinkedHashMap<>();
        for (ObjectNode section : sectionMap.values()) {
            JsonNode groupsNode = section.path("groups");
            if (!groupsNode.isArray()) {
                continue;
            }
            for (JsonNode group : groupsNode) {
                JsonNode questions = group.path("questions");
                if (!questions.isArray()) {
                    continue;
                }
                for (JsonNode question : questions) {
                    int number = question.path("questionNumber").asInt(0);
                    if (number > 0 && question instanceof ObjectNode objectNode) {
                        result.put(number, objectNode);
                    }
                }
            }
        }
        return result;
    }

    private void validateExcelPayload(JsonNode payload, Skill skill, Map<String, String> examMeta) {
        JsonNode sections = payload.path("sections");
        if (!sections.isArray() || sections.isEmpty()) {
            throw new BadRequestException("Excel không có section hợp lệ");
        }

        Set<Integer> sectionNumbers = new HashSet<>();
        Set<Integer> globalQuestions = new HashSet<>();
        int previousTo = 0;
        int totalQuestions = 0;

        for (JsonNode section : sections) {
            int sectionNumber = section.path("sectionNumber").asInt(0);
            int from = section.path("questionFrom").asInt(0);
            int to = section.path("questionTo").asInt(0);

            if (sectionNumber <= 0 || !sectionNumbers.add(sectionNumber)) {
                throw new BadRequestException("SectionNumber không hợp lệ hoặc bị trùng: " + sectionNumber);
            }
            if (from <= 0 || to <= 0 || from > to) {
                throw new BadRequestException("Section " + sectionNumber + " có range không hợp lệ");
            }
            if (previousTo > 0 && from != previousTo + 1) {
                throw new BadRequestException("Range section không liên tục tại section " + sectionNumber + ": expected " + (previousTo + 1) + " nhưng nhận " + from);
            }

            previousTo = to;

            JsonNode groups = section.path("groups");
            if (!groups.isArray() || groups.isEmpty()) {
                throw new BadRequestException("Section " + sectionNumber + " không có groups/questions");
            }

            if (skill == Skill.READING) {
                JsonNode passages = section.path("passages");
                if (!passages.isArray() || passages.isEmpty()) {
                    throw new BadRequestException("Reading section " + sectionNumber + " phải có ít nhất 1 passage");
                }
                for (JsonNode passage : passages) {
                    if (passage.path("content").asText("").isBlank()) {
                        throw new BadRequestException("Reading section " + sectionNumber + " có passage rỗng nội dung");
                    }
                }
            }

            int questionCountInSection = 0;
            for (JsonNode group : groups) {
                JsonNode questions = group.path("questions");
                if (!questions.isArray()) {
                    continue;
                }

                for (JsonNode question : questions) {
                    int qn = question.path("questionNumber").asInt(0);
                    String correctAnswer = question.path("correctAnswer").asText("").trim();

                    if (qn <= 0 || qn < from || qn > to) {
                        throw new BadRequestException("Câu hỏi " + qn + " nằm ngoài range của section " + sectionNumber);
                    }
                    if (!globalQuestions.add(qn)) {
                        throw new BadRequestException("Trùng questionNumber trong Excel: " + qn);
                    }
                    if ((skill == Skill.READING || skill == Skill.LISTENING) && correctAnswer.isBlank()) {
                        throw new BadRequestException("Câu " + qn + " thiếu correctAnswer");
                    }

                    if (skill == Skill.READING || skill == Skill.LISTENING) {
                        validateChoiceIntegrity(question, qn, correctAnswer);
                    }
                    questionCountInSection++;
                    totalQuestions++;
                }
            }

            int expected = (to - from + 1);
            if (questionCountInSection != expected) {
                throw new BadRequestException("Section " + sectionNumber + " thiếu/thừa câu hỏi: expected " + expected + ", actual " + questionCountInSection);
            }
        }

        String mode = examMeta.getOrDefault("mode", "PARTIAL").trim().toUpperCase(Locale.ROOT);
        if ("FULL".equals(mode) && (skill == Skill.READING || skill == Skill.LISTENING)) {
            if (totalQuestions != 40) {
                throw new BadRequestException("FULL exam bắt buộc có 40 câu, hiện tại: " + totalQuestions);
            }
            int expectedSections = (skill == Skill.LISTENING) ? 4 : 3;
            if (sectionNumbers.size() != expectedSections) {
                throw new BadRequestException("FULL " + skill.name() + " cần " + expectedSections + " sections");
            }
        }
    }

    private void validateChoiceIntegrity(JsonNode question, int questionNumber, String correctAnswer) {
        JsonNode choices = question.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            return;
        }

        Set<String> labels = new HashSet<>();
        int markedCorrectCount = 0;
        boolean correctAnswerFound = false;

        for (JsonNode choice : choices) {
            String label = choice.path("label").asText("").trim().toUpperCase(Locale.ROOT);
            String text = choice.path("text").asText("").trim();
            boolean isCorrect = choice.path("isCorrect").asBoolean(false);

            if (text.isBlank()) {
                throw new BadRequestException("Choice text bị rỗng ở câu " + questionNumber);
            }
            if (!label.isBlank() && !labels.add(label)) {
                throw new BadRequestException("Choice label bị trùng ở câu " + questionNumber + ": " + label);
            }
            if (isCorrect) {
                markedCorrectCount++;
            }

            if (correctAnswer.equalsIgnoreCase(label) || correctAnswer.equalsIgnoreCase(text)) {
                correctAnswerFound = true;
            }
        }

        if (choices.size() < 2) {
            throw new BadRequestException("Câu " + questionNumber + " phải có ít nhất 2 choices");
        }
        if (markedCorrectCount == 0) {
            throw new BadRequestException("Câu " + questionNumber + " chưa có choice nào được đánh dấu isCorrect=true");
        }
        if (!correctAnswerFound) {
            throw new BadRequestException("correctAnswer của câu " + questionNumber + " không khớp label/text trong Choices");
        }
    }

    private Map<String, String> readKeyValueSheet(Sheet sheet) {
        if (sheet == null) {
            throw new BadRequestException("Thiếu sheet Exam");
        }
        Map<String, String> result = new LinkedHashMap<>();
        forEachDataRow(sheet, row -> {
            String key = getCellString(row, 0).trim().toLowerCase(Locale.ROOT);
            String value = getCellString(row, 1).trim();
            if (!key.isBlank()) {
                result.put(key, value);
            }
        });
        return result;
    }

    private void forEachDataRow(Sheet sheet, java.util.function.Consumer<Row> consumer) {
        if (sheet == null) {
            return;
        }
        int first = sheet.getFirstRowNum() + 1;
        int last = sheet.getLastRowNum();
        for (int i = first; i <= last; i++) {
            Row row = sheet.getRow(i);
            if (row == null || isEmptyRow(row)) {
                continue;
            }
            consumer.accept(row);
        }
    }

    private boolean isEmptyRow(Row row) {
        short first = row.getFirstCellNum();
        short last = row.getLastCellNum();
        for (int i = first; i < last; i++) {
            if (i < 0) {
                continue;
            }
            String value = getCellString(row, i);
            if (!value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String getCellString(Row row, int index) {
        Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.STRING) {
            return cell.getStringCellValue().trim();
        }
        if (type == CellType.NUMERIC) {
            double value = cell.getNumericCellValue();
            if (Math.floor(value) == value) {
                return String.valueOf((long) value);
            }
            return String.valueOf(value);
        }
        if (type == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        if (type == CellType.FORMULA) {
            return cell.getCellFormula();
        }
        return "";
    }

    private int parseInt(String value, int defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private double parseDouble(String value, double defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private boolean parseBoolean(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return "true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized) || "y".equals(normalized);
    }

    private Skill parseSkill(String raw) {
        if (raw == null || raw.isBlank()) {
            return Skill.READING;
        }
        try {
            Skill skill = Skill.valueOf(raw.trim().toUpperCase(Locale.ROOT));
            return skill;
        } catch (IllegalArgumentException ignored) {
        }
        return Skill.READING;
    }

    private void createExamSheet(Workbook workbook, Skill skill, boolean fullSample) {
        Sheet sheet = workbook.createSheet("Exam");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("key");
        header.createCell(1).setCellValue("value");

        writeKeyValueRow(sheet, 1, "title", (fullSample ? "Full Sample IELTS " : "Sample IELTS ") + skill.name() + " Test");
        writeKeyValueRow(sheet, 2, "skill", skill.name());
        writeKeyValueRow(sheet, 3, "duration", skill == Skill.LISTENING ? "30" : (skill == Skill.SPEAKING ? "15" : "60"));
        writeKeyValueRow(sheet, 4, "description", "Imported from Excel template");
        writeKeyValueRow(sheet, 5, "mode", fullSample ? "FULL" : "PARTIAL");

        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
    }

    private void createSectionsSheet(Workbook workbook, Skill skill, boolean fullSample) {
        Sheet sheet = workbook.createSheet("Sections");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("sectionNumber");
        header.createCell(1).setCellValue("label");
        header.createCell(2).setCellValue("questionFrom");
        header.createCell(3).setCellValue("questionTo");
        header.createCell(4).setCellValue("audioUrl");
        header.createCell(5).setCellValue("audioDuration");
        header.createCell(6).setCellValue("transcript");

        if (skill == Skill.LISTENING && fullSample) {
            writeSectionRow(sheet, 1, 1, "Section 1", 1, 10, "https://cdn.aimhigh.vn/audio/listening-sec1.mp3", 420, "Transcript section 1");
            writeSectionRow(sheet, 2, 2, "Section 2", 11, 20, "https://cdn.aimhigh.vn/audio/listening-sec2.mp3", 450, "Transcript section 2");
            writeSectionRow(sheet, 3, 3, "Section 3", 21, 30, "https://cdn.aimhigh.vn/audio/listening-sec3.mp3", 470, "Transcript section 3");
            writeSectionRow(sheet, 4, 4, "Section 4", 31, 40, "https://cdn.aimhigh.vn/audio/listening-sec4.mp3", 490, "Transcript section 4");
        } else if (skill == Skill.LISTENING) {
            writeSectionRow(sheet, 1, 1, "Section 1", 1, 10, "https://cdn.example.com/listening-sec1.mp3", 420, "Transcript section 1");
            writeSectionRow(sheet, 2, 2, "Section 2", 11, 20, "https://cdn.example.com/listening-sec2.mp3", 450, "Transcript section 2");
        } else if (skill == Skill.WRITING) {
            writeSectionRow(sheet, 1, 1, "Writing Task 1", 1, 1, "", 0, "");
            writeSectionRow(sheet, 2, 2, "Writing Task 2", 2, 2, "", 0, "");
        } else if (skill == Skill.SPEAKING) {
            writeSectionRow(sheet, 1, 1, "Speaking Part 1", 1, 4, "", 0, "");
            writeSectionRow(sheet, 2, 2, "Speaking Part 2", 5, 5, "", 0, "");
            writeSectionRow(sheet, 3, 3, "Speaking Part 3", 6, 9, "", 0, "");
        } else if (fullSample) {
            writeSectionRow(sheet, 1, 1, "Section 1", 1, 13, "", 0, "");
            writeSectionRow(sheet, 2, 2, "Section 2", 14, 26, "", 0, "");
            writeSectionRow(sheet, 3, 3, "Section 3", 27, 40, "", 0, "");
        } else {
            writeSectionRow(sheet, 1, 1, "Section 1", 1, 13, "", 0, "");
            writeSectionRow(sheet, 2, 2, "Section 2", 14, 26, "", 0, "");
        }

        for (int i = 0; i <= 6; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createPassagesSheet(Workbook workbook, Skill skill, boolean fullSample) {
        Sheet sheet = workbook.createSheet("Passages");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("sectionNumber");
        header.createCell(1).setCellValue("passageOrder");
        header.createCell(2).setCellValue("title");
        header.createCell(3).setCellValue("content");
        header.createCell(4).setCellValue("imageUrl");

        if (skill == Skill.READING && fullSample) {
            for (int s = 1; s <= 3; s++) {
                Row row = sheet.createRow(s);
                row.createCell(0).setCellValue(s);
                row.createCell(1).setCellValue(1);
                row.createCell(2).setCellValue("Reading Passage " + s);
                row.createCell(3).setCellValue("This is a full sample reading passage for section " + s + ". It contains enough text for admin import testing and real practice rendering.");
                row.createCell(4).setCellValue("");
            }
        } else if (skill == Skill.READING) {
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1);
            row.createCell(1).setCellValue(1);
            row.createCell(2).setCellValue("Passage 1");
            row.createCell(3).setCellValue("Sample passage content for reading section 1");
            row.createCell(4).setCellValue("");
        }

        for (int i = 0; i <= 4; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createQuestionsSheet(Workbook workbook, Skill skill, boolean fullSample) {
        Sheet sheet = workbook.createSheet("Questions");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("sectionNumber");
        header.createCell(1).setCellValue("questionNumber");
        header.createCell(2).setCellValue("questionText");
        header.createCell(3).setCellValue("correctAnswer");
        header.createCell(4).setCellValue("explanation");
        header.createCell(5).setCellValue("points");
        header.createCell(6).setCellValue("audioStart");
        header.createCell(7).setCellValue("audioEnd");

        if (skill == Skill.WRITING) {
            Row task1 = sheet.createRow(1);
            task1.createCell(0).setCellValue(1);
            task1.createCell(1).setCellValue(1);
            task1.createCell(2).setCellValue("The chart below shows sample IELTS Writing Task 1 data. Summarise the information and make comparisons where relevant.");
            task1.createCell(3).setCellValue("");
            task1.createCell(4).setCellValue("Assess task achievement, coherence, lexical resource, grammar.");
            task1.createCell(5).setCellValue(1);
            task1.createCell(6).setCellValue(0);
            task1.createCell(7).setCellValue(0);

            Row task2 = sheet.createRow(2);
            task2.createCell(0).setCellValue(2);
            task2.createCell(1).setCellValue(2);
            task2.createCell(2).setCellValue("Some people believe online learning is more effective than classroom learning. Discuss both views and give your opinion.");
            task2.createCell(3).setCellValue("");
            task2.createCell(4).setCellValue("Assess task response, coherence, lexical resource, grammar.");
            task2.createCell(5).setCellValue(1);
            task2.createCell(6).setCellValue(0);
            task2.createCell(7).setCellValue(0);
        } else if (skill == Skill.SPEAKING) {
            String[] prompts = {
                    "Part 1: What do you usually do in your free time?",
                    "Part 1: Do you prefer studying alone or with others?",
                    "Part 1: How often do you use public transport?",
                    "Part 1: What kind of music do you enjoy?",
                    "Part 2 cue card: Describe a goal you achieved. You should say what it was, how you achieved it, and why it was important.",
                    "Part 3: Why do people set personal goals?",
                    "Part 3: Are young people under more pressure today?",
                    "Part 3: How can schools help students plan their future?",
                    "Part 3: Is success always measurable?"
            };
            for (int i = 0; i < prompts.length; i++) {
                Row row = sheet.createRow(i + 1);
                int q = i + 1;
                row.createCell(0).setCellValue(q <= 4 ? 1 : (q == 5 ? 2 : 3));
                row.createCell(1).setCellValue(q);
                row.createCell(2).setCellValue(prompts[i]);
                row.createCell(3).setCellValue("");
                row.createCell(4).setCellValue("Assess fluency, lexical resource, grammar, pronunciation.");
                row.createCell(5).setCellValue(1);
                row.createCell(6).setCellValue(0);
                row.createCell(7).setCellValue(0);
            }
        } else if (fullSample) {
            int rowIndex = 1;
            int totalQuestions = 40;
            for (int q = 1; q <= totalQuestions; q++) {
                int sectionNumber = skill == Skill.LISTENING
                        ? ((q - 1) / 10) + 1
                        : (q <= 13 ? 1 : (q <= 26 ? 2 : 3));

                String correct = switch (q % 4) {
                    case 1 -> "A";
                    case 2 -> "B";
                    case 3 -> "C";
                    default -> "D";
                };

                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(sectionNumber);
                row.createCell(1).setCellValue(q);
                row.createCell(2).setCellValue(skill == Skill.LISTENING
                        ? "Listening question " + q + ": choose the best option."
                        : "Reading question " + q + ": choose the best statement.");
                row.createCell(3).setCellValue(correct);
                row.createCell(4).setCellValue("Explanation for question " + q);
                row.createCell(5).setCellValue(1);
                row.createCell(6).setCellValue(skill == Skill.LISTENING ? q * 5 : 0);
                row.createCell(7).setCellValue(skill == Skill.LISTENING ? q * 5 + 8 : 0);
            }
        } else {
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1);
            row.createCell(1).setCellValue(1);
            row.createCell(2).setCellValue(skill == Skill.LISTENING ? "Where is the meeting?" : "What is the main idea of paragraph 1?");
            row.createCell(3).setCellValue("A");
            row.createCell(4).setCellValue("Rule-based explanation sample");
            row.createCell(5).setCellValue(1);
            row.createCell(6).setCellValue(skill == Skill.LISTENING ? 10 : 0);
            row.createCell(7).setCellValue(skill == Skill.LISTENING ? 22 : 0);
        }

        for (int i = 0; i <= 7; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createChoicesSheet(Workbook workbook, boolean fullSample) {
        Sheet sheet = workbook.createSheet("Choices");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("questionNumber");
        header.createCell(1).setCellValue("label");
        header.createCell(2).setCellValue("text");
        header.createCell(3).setCellValue("isCorrect");

        if (fullSample) {
            int rowIndex = 1;
            for (int q = 1; q <= 40; q++) {
                String correct = switch (q % 4) {
                    case 1 -> "A";
                    case 2 -> "B";
                    case 3 -> "C";
                    default -> "D";
                };
                for (String label : List.of("A", "B", "C", "D")) {
                    Row row = sheet.createRow(rowIndex++);
                    row.createCell(0).setCellValue(q);
                    row.createCell(1).setCellValue(label);
                    row.createCell(2).setCellValue("Question " + q + " option " + label);
                    row.createCell(3).setCellValue(Objects.equals(label, correct));
                }
            }
        } else {
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);
            r1.createCell(1).setCellValue("A");
            r1.createCell(2).setCellValue("Option A sample");
            r1.createCell(3).setCellValue(true);

            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue(1);
            r2.createCell(1).setCellValue("B");
            r2.createCell(2).setCellValue("Option B sample");
            r2.createCell(3).setCellValue(false);
        }

        for (int i = 0; i <= 3; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void writeKeyValueRow(Sheet sheet, int rowIndex, String key, String value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(value);
    }

    private void writeSectionRow(Sheet sheet, int rowIndex, int sectionNumber, String label, int from, int to, String audioUrl, int audioDuration, String transcript) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(sectionNumber);
        row.createCell(1).setCellValue(label);
        row.createCell(2).setCellValue(from);
        row.createCell(3).setCellValue(to);
        row.createCell(4).setCellValue(audioUrl);
        row.createCell(5).setCellValue(audioDuration);
        row.createCell(6).setCellValue(transcript);
    }
}
