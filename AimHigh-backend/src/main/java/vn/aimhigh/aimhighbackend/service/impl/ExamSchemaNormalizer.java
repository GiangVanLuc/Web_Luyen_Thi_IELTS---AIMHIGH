package vn.aimhigh.aimhighbackend.service.impl;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.Locale;
import java.util.Map;

/**
 * Chuẩn hoá payload đề thi khi import (Pha 0 — "1 schema cho mọi đề IELTS").
 *
 * Nhiệm vụ:
 *  1) Gom mọi nhãn dạng câu hỏi (type/displayType, nhiều biến thể) về MỘT bộ canonical
 *     và ghi kèm displayType tương thích front-end hiện tại.
 *  2) Chuẩn hoá correctAnswer: dùng '|' hay '/' đều được (đáp án Cambridge thường viết "30|thirty").
 *
 * Component này CHỈ biến đổi cây JSON tại chỗ; không đụng DB. Gọi ngay đầu importFromJson
 * trên bản deepCopy để cả entity lẫn examData lưu xuống đều ở dạng chuẩn.
 */
@Component
public class ExamSchemaNormalizer {

    // ----- Bộ type canonical -----
    public static final String NOTE_COMPLETION = "NOTE_COMPLETION";
    public static final String TABLE_COMPLETION = "TABLE_COMPLETION";
    public static final String FORM_COMPLETION = "FORM_COMPLETION";
    public static final String FLOWCHART_COMPLETION = "FLOWCHART_COMPLETION";
    public static final String SENTENCE_COMPLETION = "SENTENCE_COMPLETION";
    public static final String SUMMARY_COMPLETION = "SUMMARY_COMPLETION";
    public static final String SUMMARY_WORDBANK = "SUMMARY_WORDBANK";
    public static final String MULTIPLE_CHOICE = "MULTIPLE_CHOICE";
    public static final String MULTIPLE_CHOICE_MULTI = "MULTIPLE_CHOICE_MULTI";
    public static final String TRUE_FALSE_NOTGIVEN = "TRUE_FALSE_NOTGIVEN";
    public static final String YES_NO_NOTGIVEN = "YES_NO_NOTGIVEN";
    public static final String MATCHING = "MATCHING";
    public static final String MAP_LABELLING = "MAP_LABELLING";
    public static final String DIAGRAM_LABELLING = "DIAGRAM_LABELLING";
    public static final String WRITING_TASK = "WRITING_TASK";
    public static final String SPEAKING_PART = "SPEAKING_PART";

    /** Bản đồ đồng nghĩa (đã upper + bỏ ký tự lạ) -> canonical. */
    private static final Map<String, String> SYNONYMS = Map.ofEntries(
            // completion family
            Map.entry("NOTECOMPLETION", NOTE_COMPLETION),
            Map.entry("NOTE", NOTE_COMPLETION),
            Map.entry("NOTES", NOTE_COMPLETION),
            Map.entry("FILLINBLANK", NOTE_COMPLETION),
            Map.entry("FILLBLANK", NOTE_COMPLETION),
            Map.entry("FILLBLOCK", NOTE_COMPLETION),
            Map.entry("GAPFILL", NOTE_COMPLETION),
            Map.entry("COMPLETION", NOTE_COMPLETION),
            Map.entry("SHORTANSWER", NOTE_COMPLETION),
            Map.entry("TABLECOMPLETION", TABLE_COMPLETION),
            Map.entry("TABLE", TABLE_COMPLETION),
            Map.entry("FORMCOMPLETION", FORM_COMPLETION),
            Map.entry("FORM", FORM_COMPLETION),
            Map.entry("FLOWCHARTCOMPLETION", FLOWCHART_COMPLETION),
            Map.entry("FLOWCHART", FLOWCHART_COMPLETION),
            Map.entry("FLOWCHARTCOMPLETE", FLOWCHART_COMPLETION),
            Map.entry("SENTENCECOMPLETION", SENTENCE_COMPLETION),
            Map.entry("SENTENCE", SENTENCE_COMPLETION),
            Map.entry("SUMMARYCOMPLETION", SUMMARY_COMPLETION),
            Map.entry("SUMMARY", SUMMARY_COMPLETION),
            // summary with word bank
            Map.entry("SUMMARYWORDBANK", SUMMARY_WORDBANK),
            Map.entry("SUMMARYCOMPLETIONWORDBANK", SUMMARY_WORDBANK),
            Map.entry("WORDBANK", SUMMARY_WORDBANK),
            Map.entry("SUMMARYDRAG", SUMMARY_WORDBANK),
            // MCQ single
            Map.entry("MULTIPLECHOICE", MULTIPLE_CHOICE),
            Map.entry("MCQ", MULTIPLE_CHOICE),
            Map.entry("CHOICE", MULTIPLE_CHOICE),
            Map.entry("SINGLECHOICE", MULTIPLE_CHOICE),
            // MCQ multi
            Map.entry("MULTIPLECHOICEMULTI", MULTIPLE_CHOICE_MULTI),
            Map.entry("MCQMULTI", MULTIPLE_CHOICE_MULTI),
            Map.entry("MULTISELECT", MULTIPLE_CHOICE_MULTI),
            Map.entry("MULTIPLEANSWER", MULTIPLE_CHOICE_MULTI),
            Map.entry("CHOOSETWO", MULTIPLE_CHOICE_MULTI),
            // T/F/NG & Y/N/NG
            Map.entry("TRUEFALSENG", TRUE_FALSE_NOTGIVEN),
            Map.entry("TRUEFALSENOTGIVEN", TRUE_FALSE_NOTGIVEN),
            Map.entry("TFNG", TRUE_FALSE_NOTGIVEN),
            Map.entry("TRUEFALSE", TRUE_FALSE_NOTGIVEN),
            Map.entry("YESNONG", YES_NO_NOTGIVEN),
            Map.entry("YESNONOTGIVEN", YES_NO_NOTGIVEN),
            Map.entry("YNNG", YES_NO_NOTGIVEN),
            Map.entry("YESNO", YES_NO_NOTGIVEN),
            // matching variants
            Map.entry("MATCHING", MATCHING),
            Map.entry("MATCH", MATCHING),
            Map.entry("MATCHINGHEADINGS", MATCHING),
            Map.entry("MATCHINGINFORMATION", MATCHING),
            Map.entry("MATCHINGFEATURES", MATCHING),
            Map.entry("MATCHINGSENTENCEENDINGS", MATCHING),
            Map.entry("MATCHINGPARAGRAPHS", MATCHING),
            // map / diagram labelling
            Map.entry("MAPLABELING", MAP_LABELLING),
            Map.entry("MAPLABELLING", MAP_LABELLING),
            Map.entry("PLANLABELLING", MAP_LABELLING),
            Map.entry("MAP", MAP_LABELLING),
            Map.entry("DIAGRAMLABELING", DIAGRAM_LABELLING),
            Map.entry("DIAGRAMLABELLING", DIAGRAM_LABELLING),
            Map.entry("LABELDIAGRAM", DIAGRAM_LABELLING),
            // writing / speaking
            Map.entry("WRITINGTASK", WRITING_TASK),
            Map.entry("WRITING", WRITING_TASK),
            Map.entry("TASK", WRITING_TASK),
            Map.entry("SPEAKINGPART", SPEAKING_PART),
            Map.entry("SPEAKING", SPEAKING_PART),
            Map.entry("CUECARD", SPEAKING_PART)
    );

    /** Chuẩn hoá toàn bộ payload tại chỗ. */
    public void normalize(JsonNode root) {
        if (root == null || !root.isObject()) {
            return;
        }
        JsonNode sections = root.path("sections");
        if (!sections.isArray()) {
            return;
        }
        for (JsonNode section : sections) {
            JsonNode groups = section.path("groups");
            if (!groups.isArray()) {
                continue;
            }
            for (JsonNode group : groups) {
                if (group.isObject()) {
                    normalizeGroup((ObjectNode) group);
                }
            }
        }
    }

    private void normalizeGroup(ObjectNode group) {
        String canonical = resolveCanonicalType(group);
        group.put("type", canonical);
        group.put("displayType", toFrontendDisplay(canonical));

        normalizeQuestionsContainer(group);
        JsonNode subBlocks = group.path("subBlocks");
        if (subBlocks.isArray()) {
            for (JsonNode sb : subBlocks) {
                if (sb.isObject()) {
                    normalizeQuestionsContainer((ObjectNode) sb);
                }
            }
        }
    }

    private void normalizeQuestionsContainer(ObjectNode container) {
        JsonNode questions = container.path("questions");
        if (!questions.isArray()) {
            return;
        }
        for (JsonNode q : questions) {
            if (q.isObject()) {
                normalizeAnswer((ObjectNode) q);
            }
        }
    }

    /** "30|thirty" -> "30/thirty"; cắt khoảng trắng quanh dấu '/'. */
    private void normalizeAnswer(ObjectNode question) {
        JsonNode ans = question.get("correctAnswer");
        if (ans == null || !ans.isTextual()) {
            return;
        }
        String raw = ans.textValue();
        if (raw == null) {
            return;
        }
        String normalized = raw.replace('|', '/').trim();
        // gọn khoảng trắng quanh '/': "a / b" -> "a/b"
        normalized = normalized.replaceAll("\\s*/\\s*", "/");
        question.put("correctAnswer", normalized);
    }

    /**
     * Suy ra canonical type theo thứ tự ưu tiên:
     *  type/displayType khai báo -> instruction -> cấu trúc (choices/matchOptions/answer).
     */
    private String resolveCanonicalType(ObjectNode group) {
        String declared = firstNonBlank(text(group, "type"), text(group, "displayType"));
        String mapped = mapSynonym(declared);
        if (mapped != null) {
            // phân biệt MCQ đơn/đa theo maxSelect/đáp án nếu nhãn chỉ ghi chung MULTIPLE_CHOICE
            if (MULTIPLE_CHOICE.equals(mapped) && looksLikeMultiAnswer(group)) {
                return MULTIPLE_CHOICE_MULTI;
            }
            return mapped;
        }

        String instruction = lower(firstNonBlank(text(group, "instruction"), text(group, "instructions")));
        if (instruction != null) {
            if (instruction.contains("true") && instruction.contains("false")) return TRUE_FALSE_NOTGIVEN;
            if (instruction.contains("yes") && instruction.contains("no") && instruction.contains("given")) return YES_NO_NOTGIVEN;
            if (instruction.contains("which paragraph") || instruction.contains("correct letter")) return MATCHING;
            if (instruction.contains("label the map") || instruction.contains("label the plan")) return MAP_LABELLING;
            if (instruction.contains("label the diagram")) return DIAGRAM_LABELLING;
            if (instruction.contains("choose two") || instruction.contains("two letters")) return MULTIPLE_CHOICE_MULTI;
            if (instruction.contains("choose the correct letter")) return MULTIPLE_CHOICE;
            if (instruction.contains("complete the table")) return TABLE_COMPLETION;
            if (instruction.contains("complete the summary")) {
                return group.path("matchOptions").isArray() && !group.path("matchOptions").isEmpty()
                        ? SUMMARY_WORDBANK : SUMMARY_COMPLETION;
            }
            if (instruction.contains("complete the notes")) return NOTE_COMPLETION;
            if (instruction.contains("complete the flow")) return FLOWCHART_COMPLETION;
            if (instruction.contains("complete the sentences")) return SENTENCE_COMPLETION;
        }

        // suy theo cấu trúc
        if (hasChoices(group)) {
            return looksLikeMultiAnswer(group) ? MULTIPLE_CHOICE_MULTI : MULTIPLE_CHOICE;
        }
        if (group.path("matchOptions").isArray() && !group.path("matchOptions").isEmpty()) {
            return MATCHING;
        }
        if (group.path("dropZones").isArray() && !group.path("dropZones").isEmpty()) {
            return MAP_LABELLING;
        }
        return NOTE_COMPLETION;
    }

    private boolean hasChoices(ObjectNode group) {
        JsonNode questions = group.path("questions");
        if (questions.isArray()) {
            for (JsonNode q : questions) {
                if (q.path("choices").isArray() && !q.path("choices").isEmpty()) {
                    return true;
                }
            }
        }
        return group.path("choices").isArray() && !group.path("choices").isEmpty();
    }

    private boolean looksLikeMultiAnswer(ObjectNode group) {
        if (group.path("maxSelect").asInt(0) >= 2) {
            return true;
        }
        JsonNode questions = group.path("questions");
        if (questions.isArray()) {
            for (JsonNode q : questions) {
                if (q.path("maxSelect").asInt(0) >= 2) {
                    return true;
                }
                String ans = q.path("correctAnswer").asText("");
                // đáp án dạng 2 chữ cái: "AE", "A,E", "A E"
                if (ans.replaceAll("[^A-Za-z]", "").length() >= 2 && ans.matches("(?i)[a-e][,\\s]*[a-e]")) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Canonical -> display token mà renderer front-end hiện tại đang hiểu. */
    private String toFrontendDisplay(String canonical) {
        return switch (canonical) {
            case MULTIPLE_CHOICE, MULTIPLE_CHOICE_MULTI -> "MULTIPLE_CHOICE";
            case TRUE_FALSE_NOTGIVEN, YES_NO_NOTGIVEN -> "TRUE_FALSE_NG";
            case MATCHING, MAP_LABELLING, DIAGRAM_LABELLING -> "MATCHING";
            case TABLE_COMPLETION -> "TABLE_COMPLETION";
            case SUMMARY_COMPLETION, SUMMARY_WORDBANK -> "SUMMARY_COMPLETION";
            case WRITING_TASK, SPEAKING_PART -> canonical;
            default -> "FILL_BLOCK";
        };
    }

    // ----- helpers -----
    private String mapSynonym(String declared) {
        if (declared == null) {
            return null;
        }
        String key = declared.toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
        if (key.isEmpty()) {
            return null;
        }
        return SYNONYMS.get(key);
    }

    private String text(ObjectNode node, String field) {
        JsonNode v = node.get(field);
        return v != null && v.isTextual() ? v.textValue() : null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private String lower(String v) {
        return v == null ? null : v.toLowerCase(Locale.ROOT);
    }
}
