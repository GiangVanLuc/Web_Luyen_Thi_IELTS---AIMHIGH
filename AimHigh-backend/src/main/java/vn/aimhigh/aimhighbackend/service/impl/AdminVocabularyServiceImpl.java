package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.aimhigh.aimhighbackend.dto.request.AdminVocabularyUpsertRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminVocabularyImportResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Folder;
import vn.aimhigh.aimhighbackend.model.Topic;
import vn.aimhigh.aimhighbackend.model.Vocabulary;
import vn.aimhigh.aimhighbackend.model.VocabularyExample;
import vn.aimhigh.aimhighbackend.repository.FolderRepository;
import vn.aimhigh.aimhighbackend.repository.TopicRepository;
import vn.aimhigh.aimhighbackend.repository.VocabularyExampleRepository;
import vn.aimhigh.aimhighbackend.repository.VocabularyRepository;
import vn.aimhigh.aimhighbackend.service.AdminVocabularyService;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AdminVocabularyServiceImpl implements AdminVocabularyService {

    private final VocabularyRepository vocabularyRepository;
    private final VocabularyExampleRepository vocabularyExampleRepository;
    private final TopicRepository topicRepository;
    private final FolderRepository folderRepository;
    private final ObjectMapper objectMapper;

    /** Thư mục/chủ đề mặc định khi import thiếu thông tin phân loại. */
    private static final String DEFAULT_FOLDER_NAME = "Khác";
    private static final String DEFAULT_TOPIC_NAME = "Chung";

    @Override
    @Transactional(readOnly = true)
    public List<VocabularyResponse> getVocabulary(String keyword, String partOfSpeech, Integer page, Integer size) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null ? 50 : Math.min(Math.max(size, 1), 200);

        String normalizedKeyword = trimToNull(keyword);
        String normalizedPos = trimToNull(partOfSpeech);
        if (normalizedPos != null) {
            normalizedPos = normalizedPos.toLowerCase(Locale.ROOT);
        }

        return vocabularyRepository.searchVocabulary(
                        normalizedKeyword,
                        normalizedPos,
                        null,
                        PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "word"))
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public VocabularyResponse upsertVocabulary(AdminVocabularyUpsertRequest request) {
        UpsertOutcome outcome = upsertInternal(request);
        return outcome.response();
    }

    @Override
    public void deleteVocabulary(Long vocabularyId) {
        Vocabulary vocab = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng"));
        vocabularyExampleRepository.deleteByVocabularyId(vocab.getId());
        vocabularyRepository.delete(vocab);
    }

    @Override
    public AdminVocabularyImportResponse importFromJson(JsonNode payload) {
        if (payload == null) {
            throw new BadRequestException("Payload JSON không hợp lệ");
        }

        List<JsonNode> rows = new ArrayList<>();
        if (payload.isArray()) {
            payload.forEach(rows::add);
        } else if (payload.isObject() && payload.path("items").isArray()) {
            payload.path("items").forEach(rows::add);
        } else if (payload.isObject()) {
            rows.add(payload);
        } else {
            throw new BadRequestException("JSON import phải là object hoặc array");
        }

        return importFromNodes(rows, "json");
    }

    @Override
    public AdminVocabularyImportResponse importFromExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File Excel rỗng hoặc không tồn tại");
        }

        try (InputStream input = file.getInputStream(); Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("Sheet dữ liệu từ vựng không tồn tại");
            }

            Map<String, Integer> headerMap = readHeaderIndex(sheet);
            List<JsonNode> rows = new ArrayList<>();

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                String word = getCell(row, headerMap, "word");
                if (trimToNull(word) == null) {
                    continue;
                }

                Map<String, Object> data = new LinkedHashMap<>();
                data.put("word", word);
                data.put("ipa", getCell(row, headerMap, "ipa"));
                data.put("pronunciation", getCell(row, headerMap, "pronunciation"));
                data.put("partOfSpeech", firstNonBlank(
                        getCell(row, headerMap, "partofspeech"),
                        getCell(row, headerMap, "part_of_speech"),
                        getCell(row, headerMap, "type")
                ));
                data.put("meaning", getCell(row, headerMap, "meaning"));
                data.put("viMeaning", firstNonBlank(
                        getCell(row, headerMap, "vimeaning"),
                        getCell(row, headerMap, "vi_meaning"),
                        getCell(row, headerMap, "translation")
                ));
                data.put("audioUrl", firstNonBlank(getCell(row, headerMap, "audiourl"), getCell(row, headerMap, "audio_url")));
                data.put("imageUrl", firstNonBlank(getCell(row, headerMap, "imageurl"), getCell(row, headerMap, "image_url")));
                data.put("related", getCell(row, headerMap, "related"));
                data.put("folder", firstNonBlank(getCell(row, headerMap, "folder"), getCell(row, headerMap, "thumuc"), getCell(row, headerMap, "thu_muc")));
                data.put("topic", firstNonBlank(getCell(row, headerMap, "topic"), getCell(row, headerMap, "chude"), getCell(row, headerMap, "chu_de")));

                String enExample = firstNonBlank(getCell(row, headerMap, "exampleen"), getCell(row, headerMap, "en_sentence"));
                String viExample = firstNonBlank(getCell(row, headerMap, "examplevi"), getCell(row, headerMap, "vi_sentence"));
                String source = firstNonBlank(getCell(row, headerMap, "examplesource"), getCell(row, headerMap, "source"));

                if (trimToNull(enExample) != null || trimToNull(viExample) != null) {
                    List<Map<String, String>> examples = new ArrayList<>();
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("enSentence", enExample);
                    item.put("viSentence", viExample);
                    item.put("source", source);
                    examples.add(item);
                    data.put("examples", examples);
                }

                rows.add(objectMapper.valueToTree(data));
            }

            return importFromNodes(rows, "excel");
        } catch (IOException e) {
            log.error("Không thể đọc file Excel vocabulary", e);
            throw new BadRequestException("Không thể đọc file Excel");
        }
    }

    private AdminVocabularyImportResponse importFromNodes(List<JsonNode> nodes, String source) {
        int totalRows = nodes.size();
        int createdCount = 0;
        int updatedCount = 0;
        int skippedCount = 0;
        List<String> errors = new ArrayList<>();

        int row = 0;
        for (JsonNode node : nodes) {
            row++;
            try {
                AdminVocabularyUpsertRequest request = objectMapper.treeToValue(node, AdminVocabularyUpsertRequest.class);
                if (trimToNull(request.getWord()) == null) {
                    skippedCount++;
                    errors.add("Dòng " + row + " bỏ qua: thiếu word");
                    continue;
                }

                UpsertOutcome outcome = upsertInternal(request);
                if (outcome.created()) {
                    createdCount++;
                } else {
                    updatedCount++;
                }
            } catch (BadRequestException ex) {
                skippedCount++;
                errors.add("Dòng " + row + " lỗi: " + ex.getMessage());
             } catch (Exception ex) {
                 skippedCount++;
                 String message = ex.getMessage() == null ? "Lỗi không xác định" : ex.getMessage();
                 errors.add("Dòng " + row + " lỗi: " + message);
                 log.warn("Import {} vocabulary row {} failed: {}", source, row, message);
             }
         }

         return AdminVocabularyImportResponse.builder()
                 .totalRows(totalRows)
                 .createdCount(createdCount)
                 .updatedCount(updatedCount)
                 .skippedCount(skippedCount)
                 .errors(errors)
                 .build();
     }

    private UpsertOutcome upsertInternal(AdminVocabularyUpsertRequest request) {
        String cleanedWord = trimToNull(request.getWord());
        if (cleanedWord == null) {
            throw new BadRequestException("word không được bỏ trống");
        }

        String normalized = cleanedWord.toLowerCase(Locale.ROOT);
        Optional<Vocabulary> existing = vocabularyRepository.findByNormalizedWord(normalized);
        Vocabulary vocab = existing.orElseGet(Vocabulary::new);

        vocab.setWord(cleanedWord);
        vocab.setIpa(trimToNull(request.getIpa()));
        vocab.setPronunciation(trimToNull(firstNonBlank(request.getPronunciation(), request.getIpa())));
        vocab.setPartOfSpeech(trimToNull(request.getPartOfSpeech()));
        vocab.setMeaning(trimToNull(request.getMeaning()));
        vocab.setViMeaning(trimToNull(request.getViMeaning()));
        vocab.setAudioUrl(trimToNull(request.getAudioUrl()));
        vocab.setImageUrl(trimToNull(request.getImageUrl()));
        vocab.setRelated(trimToNull(request.getRelated()));

        Topic resolvedTopic = resolveImportTopic(request.getTopicId(), request.getFolder(), request.getTopic());
        if (resolvedTopic != null) {
            // Chỉ gán khi dòng có khai báo phân loại; không khai báo thì giữ nguyên chủ đề cũ.
            vocab.setTopic(resolvedTopic);
        }

        Vocabulary saved = vocabularyRepository.save(vocab);

        if (request.getExamples() != null) {
            vocabularyExampleRepository.deleteByVocabularyId(saved.getId());
            List<VocabularyExample> examples = request.getExamples().stream()
                    .filter(example -> trimToNull(example.getEnSentence()) != null || trimToNull(example.getViSentence()) != null)
                    .map(example -> VocabularyExample.builder()
                            .vocabulary(saved)
                            .enSentence(trimToNull(example.getEnSentence()))
                            .viSentence(trimToNull(example.getViSentence()))
                            .source(trimToNull(example.getSource()))
                            .build())
                    .toList();
            if (!examples.isEmpty()) {
                vocabularyExampleRepository.saveAll(examples);
            }
        }

        return new UpsertOutcome(existing.isEmpty(), toResponse(saved));
    }

    /**
     * Quyết định chủ đề cho từ khi upsert/import:
     *  - Có topicId  -> dùng đúng chủ đề đó (ưu tiên cao nhất).
     *  - Có topic/folder theo tên -> tìm hoặc tạo (thiếu folder thì dùng "Khác", thiếu topic thì dùng "Chung").
     *  - Không có gì -> null (giữ nguyên / chưa phân chủ đề).
     */
    private Topic resolveImportTopic(Long topicId, String folderName, String topicName) {
        if (topicId != null) {
            return topicRepository.findById(topicId)
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy chủ đề id=" + topicId));
        }

        String folder = trimToNull(folderName);
        String topic = trimToNull(topicName);
        if (folder == null && topic == null) {
            return null;
        }

        Folder targetFolder = findOrCreateFolder(folder != null ? folder : DEFAULT_FOLDER_NAME);
        String topicToUse = topic != null ? topic : DEFAULT_TOPIC_NAME;
        return findOrCreateTopic(topicToUse, targetFolder);
    }

    private Folder findOrCreateFolder(String name) {
        String cleaned = name.trim();
        String normalized = cleaned.toLowerCase(Locale.ROOT);
        return folderRepository.findByNormalizedName(normalized)
                .orElseGet(() -> folderRepository.save(Folder.builder()
                        .name(cleaned)
                        .normalizedName(normalized)
                        .displayOrder(0)
                        .build()));
    }

    private Topic findOrCreateTopic(String name, Folder folder) {
        String cleaned = name.trim();
        String normalized = cleaned.toLowerCase(Locale.ROOT);
        return topicRepository.findByFolderIdAndNormalizedName(folder.getId(), normalized)
                .orElseGet(() -> topicRepository.save(Topic.builder()
                        .name(cleaned)
                        .normalizedName(normalized)
                        .folder(folder)
                        .displayOrder(0)
                        .build()));
    }

    private VocabularyResponse toResponse(Vocabulary vocabulary) {
        List<VocabularyResponse.ExampleDto> examples = vocabularyExampleRepository.findByVocabularyId(vocabulary.getId())
                .stream()
                .map(example -> VocabularyResponse.ExampleDto.builder()
                        .enSentence(example.getEnSentence())
                        .viSentence(example.getViSentence())
                        .source(example.getSource())
                        .build())
                .toList();

        Topic topic = vocabulary.getTopic();
        Folder folder = topic == null ? null : topic.getFolder();

        return VocabularyResponse.builder()
                .id(vocabulary.getId())
                .word(vocabulary.getWord())
                .ipa(vocabulary.getIpa())
                .partOfSpeech(vocabulary.getPartOfSpeech())
                .meaning(vocabulary.getMeaning())
                .viMeaning(vocabulary.getViMeaning())
                .audioUrl(vocabulary.getAudioUrl())
                .imageUrl(vocabulary.getImageUrl())
                .related(vocabulary.getRelated())
                .topicId(topic == null ? null : topic.getId())
                .topicName(topic == null ? null : topic.getName())
                .folderId(folder == null ? null : folder.getId())
                .folderName(folder == null ? null : folder.getName())
                .examples(examples)
                .isSaved(false)
                .build();
    }

    private Map<String, Integer> readHeaderIndex(Sheet sheet) {
        Row header = sheet.getRow(0);
        if (header == null) {
            throw new BadRequestException("Sheet Excel thiếu dòng header");
        }

        Map<String, Integer> indexMap = new HashMap<>();
        for (Cell cell : header) {
            String key = trimToNull(cell.getStringCellValue());
            if (key != null) {
                indexMap.put(key.toLowerCase(Locale.ROOT).replace(" ", "").replace("-", "_"), cell.getColumnIndex());
            }
        }

        if (!indexMap.containsKey("word")) {
            throw new BadRequestException("Header Excel phải có cột 'word'");
        }
        return indexMap;
    }

    private String getCell(Row row, Map<String, Integer> indexMap, String key) {
        Integer index = indexMap.get(key);
        if (index == null) {
            return null;
        }
        Cell cell = row.getCell(index);
        if (cell == null) {
            return null;
        }

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> null;
        };
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String cleaned = trimToNull(value);
            if (cleaned != null) {
                return cleaned;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private record UpsertOutcome(boolean created, VocabularyResponse response) {
    }
}
