package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.ExamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.response.*;
import vn.aimhigh.aimhighbackend.enums.*;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExamServiceImpl implements ExamService {
    private static final Pattern QUESTIONS_RANGE_PATTERN = Pattern.compile("(\\d+)\\s*[-â€“]\\s*(\\d+)");

    private final ExamRepository examRepository;
    private final ObjectMapper objectMapper;

    /**
     * Láº¥y danh sÃ¡ch Ä‘á» thi theo Ä‘iá»u kiá»‡n
     */
    public List<ExamSummaryResponse> getExams(Skill skill, ExamLevel level) {
        log.info("Láº¥y danh sÃ¡ch Ä‘á» thi. Skill: {}, Level: {}", skill, level);
        List<Exam> exams;
        if (skill != null && level != null) {
            exams = examRepository.findBySkillAndLevelAndStatus(skill, level, ExamStatus.PUBLISHED);
        } else if (skill != null) {
            exams = examRepository.findBySkillAndStatus(skill, ExamStatus.PUBLISHED);
        } else {
            exams = examRepository.findByStatus(ExamStatus.PUBLISHED);
        }

        return exams.stream().map(this::toSummary).collect(Collectors.toList());
    }

    public List<ExamSummaryResponse> getAdminExams(Skill skill, String status, String search) {
        String statusNorm = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        String searchNorm = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        return examRepository.findAll().stream()
                .filter(exam -> skill == null || exam.getSkill() == skill)
                .filter(exam -> {
                    if (statusNorm.isBlank()) return true;
                    return switch (statusNorm) {
                        case "published" -> exam.getStatus() == ExamStatus.PUBLISHED;
                        case "draft" -> exam.getStatus() == ExamStatus.DRAFT;
                        case "archived" -> exam.getStatus() == ExamStatus.ARCHIVED;
                        default -> true;
                    };
                })
                .filter(exam -> {
                    if (searchNorm.isBlank()) return true;
                    String title = exam.getTitle() == null ? "" : exam.getTitle().toLowerCase(Locale.ROOT);
                    return title.contains(searchNorm);
                })
                .sorted(Comparator
                        .comparing(Exam::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Exam::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExamSummaryResponse createAdminExam(JsonNode request) {
        Exam exam = new Exam();
        exam.setTitle(request.path("title").asText("Untitled Exam"));
        exam.setDuration(request.path("duration").asInt(60));
        exam.setDescription(request.path("description").asText(null));
        exam.setThumbnail(request.path("thumbnail").asText(null));
        exam.setSkill(parseEnumOrDefault(request.path("skill").asText("READING"), Skill.class, Skill.READING));
        exam.setLevel(parseEnumOrDefault(request.path("level").asText("MEDIUM"), ExamLevel.class, ExamLevel.MEDIUM));
        exam.setType(parseEnumOrDefault(request.path("type").asText("ACADEMIC"), ExamType.class, ExamType.ACADEMIC));
        applyStatus(exam, request.path("status").asText("published"));

        if (request.has("examData") && request.get("examData") != null && !request.get("examData").isNull()) {
            exam.setExamData(request.get("examData").toString());
        } else {
            ObjectNode root = objectMapper.createObjectNode();
            ObjectNode examNode = objectMapper.createObjectNode();
            examNode.put("title", exam.getTitle());
            examNode.put("skill", exam.getSkill().name());
            examNode.put("duration", exam.getDuration());
            examNode.put("totalQuestions", 0);
            root.set("exam", examNode);
            root.set("sections", objectMapper.createArrayNode());
            exam.setExamData(root.toString());
        }

        return toSummary(examRepository.save(exam));
    }

    @Transactional
    public ExamSummaryResponse updateAdminExam(Long id, JsonNode request) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y Ä‘á» thi"));

        if (request.hasNonNull("title")) {
            exam.setTitle(request.path("title").asText());
        }
        if (request.hasNonNull("duration")) {
            exam.setDuration(request.path("duration").asInt(exam.getDuration() == null ? 60 : exam.getDuration()));
        }
        if (request.has("description")) {
            exam.setDescription(request.path("description").asText(null));
        }
        if (request.has("thumbnail")) {
            exam.setThumbnail(request.path("thumbnail").asText(null));
        }
        if (request.hasNonNull("skill")) {
            exam.setSkill(parseEnumOrDefault(request.path("skill").asText(), Skill.class, exam.getSkill()));
        }
        if (request.hasNonNull("level")) {
            exam.setLevel(parseEnumOrDefault(request.path("level").asText(), ExamLevel.class, exam.getLevel()));
        }
        if (request.hasNonNull("type")) {
            exam.setType(parseEnumOrDefault(request.path("type").asText(), ExamType.class, exam.getType()));
        }
        if (request.has("status")) {
            applyStatus(exam, request.path("status").asText("published"));
        }

        return toSummary(examRepository.save(exam));
    }

    @Transactional
    public ExamSummaryResponse updateAdminExamStatus(Long id, String status) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y Ä‘á» thi"));
        applyStatus(exam, status);
        return toSummary(examRepository.save(exam));
    }

    @Transactional
    public void deleteAdminExam(Long id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y Ä‘á» thi"));
        examRepository.delete(exam);
    }

    private void applyStatus(Exam exam, String status) {
        String normalized = status == null ? "published" : status.trim().toLowerCase(Locale.ROOT);
        switch (normalized) {
            case "draft" -> exam.setStatus(ExamStatus.DRAFT);
            case "archived" -> exam.setStatus(ExamStatus.ARCHIVED);
            default -> exam.setStatus(ExamStatus.PUBLISHED);
        }
    }

    private <E extends Enum<E>> E parseEnumOrDefault(String raw, Class<E> enumType, E defaultValue) {
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            return Enum.valueOf(enumType, raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ignored) {
            return defaultValue;
        }
    }

    private ExamSummaryResponse toSummary(Exam exam) {
        return ExamSummaryResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .skill(exam.getSkill())
                .type(exam.getType())
                .level(exam.getLevel())
                .duration(exam.getDuration())
                .description(exam.getDescription())
                .thumbnail(exam.getThumbnail())
                .status(exam.getStatus() != null ? exam.getStatus().name().toLowerCase(Locale.ROOT) : "published")
                .createdAt(exam.getCreatedAt())
                .totalQuestions(inferExamTotalQuestions(exam))
                .sections(mapSectionsSummary(exam))
                .build();
    }

    private int inferExamTotalQuestions(Exam exam) {
        List<ExamSummaryResponse.SectionSummaryDto> sections = mapSectionsSummary(exam);
        int total = 0;
        for (ExamSummaryResponse.SectionSummaryDto sec : sections) {
            Integer from = sec.getQuestionFrom();
            Integer to = sec.getQuestionTo();
            if (from != null && to != null && from > 0 && to >= from) {
                total += (to - from + 1);
            }
        }
        return total > 0 ? total : 40;
    }

    @Cacheable(value = "exams", key = "#examId")
    public Object getExamDetail(Long examId) {
        log.info("Láº¥y chi tiáº¿t Ä‘á»  thi ID: {}", examId);
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y Ä‘á»  thi"));

        if (exam.getExamData() != null) {
            try {
                JsonNode root = objectMapper.readTree(exam.getExamData());
                return enrichExamDataIfNeeded(exam, root);
            } catch (Exception e) {
                log.error("Lá»—i parse examData", e);
            }
        }

        return ExamDetailResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .skill(exam.getSkill())
                .type(exam.getType())
                .level(exam.getLevel())
                .duration(exam.getDuration())
                .parts(exam.getListeningParts() == null ? null : exam.getListeningParts().stream().map(part -> 
                        ExamDetailResponse.PartDto.builder()
                                .id(part.getId())
                                .partNumber(part.getPartNumber())
                                .title(part.getTitle())
                                .audioUrl(part.getAudioUrl())
                                .audioDuration(part.getAudioDuration())
                                .questions(mapQuestions(part.getQuestions()))
                                .build()
                ).collect(Collectors.toList()))
                .passages(exam.getReadingPassages() == null ? null : exam.getReadingPassages().stream().map(passage ->
                        ExamDetailResponse.PassageDto.builder()
                                .id(passage.getId())
                                .title(passage.getTitle())
                                .content(passage.getContent())
                                .imageUrl(passage.getImageUrl())
                        .passageOrder(resolveReadingPassageOrderInSection(passage))
                                .questions(mapQuestions(passage.getQuestions()))
                                .build()
                ).collect(Collectors.toList()))
                .build();
    }

    private List<QuestionResponse> mapQuestions(List<vn.aimhigh.aimhighbackend.model.Question> questions) {
        if (questions == null) return null;
        return questions.stream().map(q -> QuestionResponse.builder()
                .id(q.getId())
                .questionNumber(q.getQuestionNumber())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType() != null ? q.getQuestionType().getName() : null)
                .audioStart(q.getAudioStart())
                .audioEnd(q.getAudioEnd())
                .points(q.getPoints() != null ? q.getPoints() : 1.0)
                .choices(q.getChoices() == null ? null : q.getChoices().stream().map(c -> 
                        QuestionResponse.ChoiceDto.builder()
                                .id(c.getId())
                                .label(c.getChoiceLabel())
                                .text(c.getChoiceText())
                                .build()
                ).collect(Collectors.toList()))
                // Cá»‘ tÃ¬nh KHÃ”NG MAP correctAnswer vÃ  explanation Ä‘á»ƒ chá»‘ng gian láº­n
                .build()
        ).collect(Collectors.toList());
    }

    private List<ExamSummaryResponse.SectionSummaryDto> mapSectionsSummary(Exam exam) {
        List<ExamSummaryResponse.SectionSummaryDto> sections = new ArrayList<>();
        if (exam.getExamData() == null || exam.getExamData().isBlank()) {
            return mapLegacySectionsSummary(exam);
        }

        try {
            JsonNode root = objectMapper.readTree(exam.getExamData());
            JsonNode sectionsNode = root.path("sections");
            if (!sectionsNode.isArray()) {
                return mapLegacySectionsSummary(exam);
            }

            for (JsonNode section : sectionsNode) {
                int sectionNumber = section.path("sectionNumber").asInt(0);
                if (sectionNumber <= 0) {
                    continue;
                }

                int[] range = inferQuestionRange(section);
                sections.add(ExamSummaryResponse.SectionSummaryDto.builder()
                        .sectionNumber(sectionNumber)
                        .label(section.path("label").asText("Section " + sectionNumber))
                        .description(exam.getSkill() == Skill.READING ? "Reading passage" : "Listening section")
                        .questionFrom(range[0])
                        .questionTo(range[1])
                        .build());
            }
        } catch (Exception e) {
            log.warn("KhÃ´ng parse Ä‘Æ°á»£c sections summary tá»« examData, examId={}", exam.getId(), e);
        }

        sections.sort(Comparator.comparingInt(s -> s.getSectionNumber() == null ? Integer.MAX_VALUE : s.getSectionNumber()));
        return sections.isEmpty() ? mapLegacySectionsSummary(exam) : sections;
    }

    private List<ExamSummaryResponse.SectionSummaryDto> mapLegacySectionsSummary(Exam exam) {
        if (exam.getSkill() == Skill.LISTENING && exam.getListeningParts() != null) {
            return exam.getListeningParts().stream()
                    .map(part -> {
                        Integer sectionNumber = part.getPartNumber() != null && part.getPartNumber() > 0
                                ? part.getPartNumber()
                                : part.getPartOrder();
                        int[] range = inferRangeFromQuestionList(part.getQuestions() == null ? List.of() : part.getQuestions());
                        return ExamSummaryResponse.SectionSummaryDto.builder()
                                .sectionNumber(sectionNumber)
                                .label(part.getTitle() == null || part.getTitle().isBlank()
                                        ? "Section " + (sectionNumber == null ? "" : sectionNumber)
                                        : part.getTitle())
                                .description("Listening section")
                                .questionFrom(range[0])
                                .questionTo(range[1])
                                .build();
                    })
                    .sorted(Comparator.comparingInt(s -> s.getSectionNumber() == null ? Integer.MAX_VALUE : s.getSectionNumber()))
                    .collect(Collectors.toList());
        }

        if (exam.getSkill() == Skill.READING && exam.getReadingPassages() != null) {
            Map<Integer, List<vn.aimhigh.aimhighbackend.model.ReadingPassage>> passagesBySection = new TreeMap<>();
            for (vn.aimhigh.aimhighbackend.model.ReadingPassage passage : exam.getReadingPassages()) {
                Integer sectionNumber = resolveReadingSectionNumber(passage);
                if (sectionNumber == null || sectionNumber <= 0) {
                    continue;
                }
                passagesBySection.computeIfAbsent(sectionNumber, ignored -> new ArrayList<>()).add(passage);
            }

            return passagesBySection.entrySet().stream()
                    .map(entry -> {
                        List<Question> questions = entry.getValue().stream()
                                .flatMap(passage -> passage.getQuestions() == null
                                        ? java.util.stream.Stream.empty()
                                        : passage.getQuestions().stream())
                                .collect(Collectors.toList());
                        int[] range = inferRangeFromQuestionList(questions);
                        return ExamSummaryResponse.SectionSummaryDto.builder()
                                .sectionNumber(entry.getKey())
                                .label("Passage " + entry.getKey())
                                .description("Reading passage")
                                .questionFrom(range[0])
                                .questionTo(range[1])
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return List.of();
    }

    private int[] inferQuestionRange(JsonNode section) {
        int from = section.path("questionFrom").asInt(0);
        int to = section.path("questionTo").asInt(0);
        if (from > 0 && to >= from) {
            return new int[]{from, to};
        }

        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;

        JsonNode groups = section.path("groups");
        if (groups.isArray()) {
            for (JsonNode group : groups) {
                JsonNode questions = group.path("questions");
                if (!questions.isArray()) {
                    continue;
                }
                for (JsonNode question : questions) {
                    int qn = question.path("questionNumber").asInt(0);
                    if (qn <= 0) {
                        continue;
                    }
                    min = Math.min(min, qn);
                    max = Math.max(max, qn);
                }
            }
        }

        if (min == Integer.MAX_VALUE || max == Integer.MIN_VALUE) {
            return new int[]{0, 0};
        }
        return new int[]{min, max};
    }

    private JsonNode enrichExamDataIfNeeded(Exam exam, JsonNode root) {
        if (!(root instanceof ObjectNode rootObj)) {
            return root;
        }

        JsonNode sectionsNode = rootObj.path("sections");
        if (!sectionsNode.isArray() || sectionsNode.isEmpty() || hasRenderableQuestions(sectionsNode)) {
            return root;
        }

        log.info("Enrich examData cho examId={} vÃ¬ payload thiáº¿u questions", exam.getId());

        ArrayNode enrichedSections = objectMapper.createArrayNode();
        for (JsonNode sectionNode : sectionsNode) {
            if (!(sectionNode instanceof ObjectNode sectionObj)) {
                enrichedSections.add(sectionNode);
                continue;
            }

            int sectionNumber = sectionObj.path("sectionNumber").asInt(0);
            List<Question> sectionQuestions = collectSectionQuestions(exam, sectionNumber);

            int[] sectionRange = inferRangeFromQuestionList(sectionQuestions);
            if (sectionObj.path("questionFrom").asInt(0) <= 0 && sectionRange[0] > 0) {
                sectionObj.put("questionFrom", sectionRange[0]);
            }
            if (sectionObj.path("questionTo").asInt(0) <= 0 && sectionRange[1] > 0) {
                sectionObj.put("questionTo", sectionRange[1]);
            }

            ensureSectionPassages(exam, sectionObj, sectionNumber);
            enrichGroupQuestions(sectionObj, sectionQuestions, sectionRange);
            enrichedSections.add(sectionObj);
        }

        rootObj.set("sections", enrichedSections);
        return rootObj;
    }

    private boolean hasRenderableQuestions(JsonNode sectionsNode) {
        for (JsonNode sectionNode : sectionsNode) {
            JsonNode groups = sectionNode.path("groups");
            if (!groups.isArray()) {
                continue;
            }
            for (JsonNode group : groups) {
                JsonNode questions = group.path("questions");
                if (questions.isArray() && !questions.isEmpty()) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<Question> collectSectionQuestions(Exam exam, int sectionNumber) {
        if (exam.getSkill() == Skill.READING && exam.getReadingPassages() != null) {
            return exam.getReadingPassages().stream()
                    .filter(p -> {
                        Integer resolvedSection = resolveReadingSectionNumber(p);
                        return resolvedSection != null && resolvedSection == sectionNumber;
                    })
                    .flatMap(p -> p.getQuestions() == null ? java.util.stream.Stream.empty() : p.getQuestions().stream())
                    .sorted(Comparator.comparingInt(q -> q.getQuestionNumber() == null ? Integer.MAX_VALUE : q.getQuestionNumber()))
                    .collect(Collectors.toList());
        }
        if (exam.getSkill() == Skill.LISTENING && exam.getListeningParts() != null) {
            return exam.getListeningParts().stream()
                    .filter(p -> p.getPartNumber() != null && p.getPartNumber() == sectionNumber)
                    .flatMap(p -> p.getQuestions() == null ? java.util.stream.Stream.empty() : p.getQuestions().stream())
                    .sorted(Comparator.comparingInt(q -> q.getQuestionNumber() == null ? Integer.MAX_VALUE : q.getQuestionNumber()))
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    private int[] inferRangeFromQuestionList(List<Question> questions) {
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (Question q : questions) {
            if (q.getQuestionNumber() == null || q.getQuestionNumber() <= 0) {
                continue;
            }
            min = Math.min(min, q.getQuestionNumber());
            max = Math.max(max, q.getQuestionNumber());
        }
        if (min == Integer.MAX_VALUE || max == Integer.MIN_VALUE) {
            return new int[]{0, 0};
        }
        return new int[]{min, max};
    }

    private void ensureSectionPassages(Exam exam, ObjectNode sectionObj, int sectionNumber) {
        if (exam.getSkill() != Skill.READING) {
            return;
        }
        JsonNode passagesNode = sectionObj.path("passages");
        if (passagesNode.isArray() && !passagesNode.isEmpty()) {
            return;
        }
        ArrayNode passages = objectMapper.createArrayNode();
        if (exam.getReadingPassages() != null) {
            exam.getReadingPassages().stream()
                    .filter(p -> {
                        Integer resolvedSection = resolveReadingSectionNumber(p);
                        return resolvedSection != null && resolvedSection == sectionNumber;
                    })
                    .sorted(Comparator.comparingInt(p -> {
                        Integer orderInSection = resolveReadingPassageOrderInSection(p);
                        return orderInSection == null ? Integer.MAX_VALUE : orderInSection;
                    }))
                    .forEach(p -> {
                        ObjectNode node = objectMapper.createObjectNode();
                        node.put("title", p.getTitle() == null ? "" : p.getTitle());
                        node.put("content", p.getContent() == null ? "" : p.getContent());
                        if (p.getImageUrl() != null) {
                            node.put("imageUrl", p.getImageUrl());
                        }
                        passages.add(node);
                    });
        }
        sectionObj.set("passages", passages);
    }

    private Integer resolveReadingSectionNumber(vn.aimhigh.aimhighbackend.model.ReadingPassage passage) {
        if (passage == null) {
            return null;
        }
        Integer section = passage.getEffectiveSectionNumber();
        if (section != null && section > 0) {
            return section;
        }
        if (passage.getPassageOrder() != null && passage.getPassageOrder() > 0) {
            return passage.getPassageOrder();
        }
        return null;
    }

    private Integer resolveReadingPassageOrderInSection(vn.aimhigh.aimhighbackend.model.ReadingPassage passage) {
        if (passage == null) {
            return null;
        }
        Integer orderInSection = passage.getEffectivePassageOrderInSection();
        if (orderInSection != null && orderInSection > 0) {
            return orderInSection;
        }
        return passage.getPassageOrder();
    }

    private void enrichGroupQuestions(ObjectNode sectionObj, List<Question> sectionQuestions, int[] sectionRange) {
        JsonNode groupsNode = sectionObj.path("groups");
        if (!groupsNode.isArray()) {
            return;
        }

        for (JsonNode groupNode : groupsNode) {
            if (!(groupNode instanceof ObjectNode groupObj)) {
                continue;
            }

            JsonNode existingQuestions = groupObj.path("questions");
            if (existingQuestions.isArray() && !existingQuestions.isEmpty()) {
                continue;
            }

            int[] groupRange = inferGroupRange(groupObj, sectionRange);
            ArrayNode questionsNode = objectMapper.createArrayNode();

            for (Question q : sectionQuestions) {
                Integer qn = q.getQuestionNumber();
                if (qn == null || qn <= 0) {
                    continue;
                }
                if (groupRange[0] > 0 && groupRange[1] >= groupRange[0]) {
                    if (qn < groupRange[0] || qn > groupRange[1]) {
                        continue;
                    }
                }
                questionsNode.add(toQuestionNode(q));
            }

            if (groupRange[0] > 0 && groupObj.path("questionFrom").asInt(0) <= 0) {
                groupObj.put("questionFrom", groupRange[0]);
            }
            if (groupRange[1] > 0 && groupObj.path("questionTo").asInt(0) <= 0) {
                groupObj.put("questionTo", groupRange[1]);
            }

            groupObj.set("questions", questionsNode);
        }
    }

    private int[] inferGroupRange(ObjectNode groupObj, int[] sectionRange) {
        int from = groupObj.path("questionFrom").asInt(0);
        int to = groupObj.path("questionTo").asInt(0);
        if (from > 0 && to >= from) {
            return new int[]{from, to};
        }

        String title = groupObj.path("groupTitle").asText("");
        Matcher matcher = QUESTIONS_RANGE_PATTERN.matcher(title);
        if (matcher.find()) {
            int parsedFrom = Integer.parseInt(matcher.group(1));
            int parsedTo = Integer.parseInt(matcher.group(2));
            if (parsedFrom > 0 && parsedTo >= parsedFrom) {
                return new int[]{parsedFrom, parsedTo};
            }
        }

        return sectionRange;
    }

    private ObjectNode toQuestionNode(Question q) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("questionNumber", q.getQuestionNumber() == null ? 0 : q.getQuestionNumber());
        node.put("questionText", q.getQuestionText() == null ? "" : q.getQuestionText());

        String questionType = q.getQuestionType() == null || q.getQuestionType().getName() == null
                ? ""
                : q.getQuestionType().getName().name();
        if (!questionType.isBlank()) {
            node.put("questionType", questionType);
        }

        String upperText = q.getQuestionText() == null ? "" : q.getQuestionText().toUpperCase(Locale.ROOT);
        if (questionType.contains("FILL") && upperText.contains("___")) {
            node.put("lineTemplate", q.getQuestionText());
        }

        ArrayNode choices = objectMapper.createArrayNode();
        if (q.getChoices() != null) {
            q.getChoices().stream()
                    .sorted(Comparator.comparing(c -> c.getChoiceLabel() == null ? "" : c.getChoiceLabel()))
                    .forEach(c -> {
                        ObjectNode choice = objectMapper.createObjectNode();
                        choice.put("label", c.getChoiceLabel() == null ? "" : c.getChoiceLabel());
                        choice.put("text", c.getChoiceText() == null ? "" : c.getChoiceText());
                        choices.add(choice);
                    });
        }
        node.set("choices", choices);
        return node;
    }
}



