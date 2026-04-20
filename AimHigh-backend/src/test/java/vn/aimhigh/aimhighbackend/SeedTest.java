package vn.aimhigh.aimhighbackend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import vn.aimhigh.aimhighbackend.enums.ExamType;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.ListeningPart;
import vn.aimhigh.aimhighbackend.model.ReadingPassage;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.ListeningPartRepository;
import vn.aimhigh.aimhighbackend.repository.ReadingPassageRepository;

@SpringBootTest
class SeedTest {

    @Autowired
    ExamRepository examRepository;

    @Autowired
    ListeningPartRepository listeningPartRepository;

    @Autowired
    ReadingPassageRepository readingPassageRepository;

    @Test
    void seedMockData() {
        // Listening
        if(!examRepository.existsByTitleAndSkill("Listening Practice Test 1", Skill.LISTENING)) {
            Exam listening = Exam.builder()
                .title("Listening Practice Test 1")
                .skill(Skill.LISTENING)
                .duration(40)
                .isActive(true)
                .level(ExamLevel.MEDIUM)
                .type(ExamType.ACADEMIC)
                .description("Mock DB Seed")
                .build();
            listening = examRepository.save(listening);
            for(int i=1; i<=4; i++) {
                listeningPartRepository.save(ListeningPart.builder()
                    .exam(listening).title("Part "+i).partNumber(i).partOrder(i).build());
            }
        }

        // Reading
        if(!examRepository.existsByTitleAndSkill("Reading Practice Test 1", Skill.READING)) {
            Exam reading = Exam.builder()
                .title("Reading Practice Test 1")
                .skill(Skill.READING)
                .duration(60)
                .isActive(true)
                .level(ExamLevel.MEDIUM)
                .type(ExamType.ACADEMIC)
                .description("Mock DB Seed")
                .build();
            reading = examRepository.save(reading);
            for(int i=1; i<=3; i++) {
                readingPassageRepository.save(ReadingPassage.builder()
                    .exam(reading).title("Passage "+i).passageOrder(i)
                    .content("Here goes reading passage " + i + " content!").build());
            }
        }
    }
}
