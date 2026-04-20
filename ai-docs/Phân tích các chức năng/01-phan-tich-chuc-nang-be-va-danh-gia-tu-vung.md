# Phân tích chức năng Backend cần xây cho module Từ vựng và đánh giá hiện trạng đã làm

## 1) Mục tiêu tài liệu
- Chốt rõ **backend đã có gì** cho module từ vựng.
- Đánh giá **phần từ vựng frontend đã làm được gì** và còn thiếu gì.
- Đề xuất danh sách chức năng backend cần xây để đồng bộ đa thiết bị và vận hành ổn định.

## 2) Hiện trạng Backend đang có (đã tồn tại trong code)

### 2.1 API hiện có
1. `GET /api/vocabulary/lookup?word=...`
- Tra từ theo `word`.
- Nếu từ chưa tồn tại trong bảng `vocabulary`, service hiện tại tự tạo bản ghi mới với thông tin tối thiểu (chủ yếu là `word`).
- Trả về `VocabularyResponse` có `isSaved`.

2. `POST /api/user-vocabulary`
- Lưu từ vào sổ của user qua `vocabId` + `note`.
- Request: `SaveVocabularyRequest { vocabId, note }`.

3. `GET /api/user-vocabulary?learned=true|false`
- Lấy danh sách từ user đã lưu.
- Có filter theo `learned` (boolean) ở mức cơ bản.

4. `DELETE /api/user-vocabulary/{id}`
- Xóa từ đã lưu.
- Service đang hỗ trợ xóa theo cả `vocabularyId` hoặc `userVocabularyId` (hành vi linh hoạt nhưng dễ gây mơ hồ contract).

### 2.2 Model hiện có
- `Vocabulary`: có các trường `word`, `ipa`, `partOfSpeech`, `meaning`, `viMeaning`, `audioUrl`, `imageUrl`, `related`, `examples`.
- `UserVocabulary`: có `user`, `vocabulary`, `learned`, `note`, `savedAt`.
- Ràng buộc unique trong `user_vocabulary` theo cặp `(user_id, vocab_id)` đã có.

## 3) Đánh giá phần Từ vựng đã làm được gì rồi

## 3.1 Phần đã hoàn thành tốt (FE)
1. Tách thành 2 trang độc lập:
- `Vocabulary.html`: Kho từ vựng AimHigh Pick.
- `Vocabulary-notebook.html`: Sổ từ vựng cá nhân + flashcard.

2. Quản lý danh sách từ ở mức giao diện:
- Tìm kiếm.
- Lọc nâng cao theo loại từ (`part of speech`), trạng thái, ngày thêm.
- Sắp xếp (mới nhất/cũ nhất/A-Z/trạng thái).

3. Quản lý nhóm trong sổ từ:
- Thêm nhóm, đổi tên, xóa nhóm.
- Thêm/sửa/xóa từ thủ công trong nhóm custom.
- Đổi trạng thái hàng loạt.

4. Flashcard và review:
- Chọn trạng thái cần ôn.
- Lật thẻ, chấm lại trạng thái từ sau mỗi thẻ.
- Có khu vực tổng kết phiên ôn.

5. Đồng bộ backend ở mức cơ bản:
- Lookup từ.
- Lưu từ vào sổ.
- Lấy danh sách đã lưu.
- Xóa từ đã lưu.

6. Header đăng nhập trên 2 trang từ vựng:
- Đã có logic hiển thị guest/user và đăng xuất.

## 3.2 Phần đang hoạt động nhưng mới ở mức local (chưa backend hóa đầy đủ)
1. Nhóm từ custom hiện chủ yếu lưu localStorage.
2. Trạng thái chi tiết 3 mức (`Chưa thuộc`, `Nhớ sơ sơ`, `Đã thuộc`) đang là local, backend mới có `learned` boolean.
3. Activity heatmap, streak, số liệu ôn tập là local.
4. Sửa từ thủ công (meaning/formula/example/pronunciation/type) chưa có API cập nhật tương ứng trên backend.

## 3.3 Các điểm lệch contract FE-BE cần xử lý
1. Xóa từ:
- FE đang có luồng gửi `vocabularyId`, trong khi endpoint đặt tên kiểu `DELETE /user-vocabulary/{id}` dễ hiểu là `userVocabularyId`.
- Cần chuẩn hóa để tránh lỗi về sau.

2. Lookup tự tạo từ mới:
- Khi user thêm từ mới thủ công, backend có thể tạo bản ghi từ với dữ liệu tối thiểu (thiếu nghĩa/IPA/loại từ...), làm chất lượng dữ liệu không đồng nhất.

3. Group đang truyền qua trường `note`:
- Đây là giải pháp tạm, nhưng không phù hợp khi cần quản trị nhóm bài bản (đổi tên nhóm, thống kê theo nhóm, quyền dữ liệu, sort theo nhóm...).

## 4) Chức năng Backend cần xây thêm (ưu tiên theo mức độ)

## 4.1 Ưu tiên P1 - Bắt buộc để module từ vựng chạy chuẩn đa thiết bị
1. Chuẩn hóa quản lý nhóm từ vựng cá nhân
- Tạo bảng `user_vocabulary_group`.
- API đề xuất:
  - `GET /api/user-vocabulary-groups`
  - `POST /api/user-vocabulary-groups`
  - `PATCH /api/user-vocabulary-groups/{groupId}`
  - `DELETE /api/user-vocabulary-groups/{groupId}`

2. Chuẩn hóa item đã lưu của user
- Thêm trường vào `user_vocabulary`:
  - `group_id` (FK)
  - `learn_level` (enum/int: 0-2 tương ứng 3 trạng thái)
  - `last_reviewed_at`
  - `review_count`
- API đề xuất:
  - `PATCH /api/user-vocabulary/{userVocabularyId}/status`
  - `PATCH /api/user-vocabulary/{userVocabularyId}` (đổi nhóm, ghi chú)
  - `DELETE /api/user-vocabulary/{userVocabularyId}` (chỉ nhận đúng `userVocabularyId`)

3. API danh sách có filter/sort/pagination
- `GET /api/user-vocabulary`
- Query đề xuất:
  - `groupId`, `partOfSpeech`, `learnLevel`, `fromDate`, `toDate`, `q`, `sort`, `page`, `size`.

4. API batch để giảm số lần gọi
- `POST /api/user-vocabulary/batch-save`
- `PATCH /api/user-vocabulary/batch-status`
- `DELETE /api/user-vocabulary/batch-delete`

## 4.2 Ưu tiên P2 - Hoàn thiện trải nghiệm ôn tập và analytics
1. Lưu lịch sử review để đồng bộ heatmap/streak
- Bảng `user_vocabulary_activity`.
- API:
  - `POST /api/user-vocabulary/review-events`
  - `GET /api/user-vocabulary/analytics?from=...&to=...`

2. Đồng bộ phiên flashcard giữa thiết bị
- Lưu progress hiện tại theo user (optional).

3. Đồng bộ đầy đủ dữ liệu từ tự thêm
- API tạo/cập nhật từ custom với đầy đủ field:
  - `word`, `ipa`, `partOfSpeech`, `meaning`, `viMeaning`, `formula`, `example`.

## 4.3 Ưu tiên P3 - Nâng chất lượng dữ liệu và vận hành
1. Cơ chế kiểm duyệt/từ điển chuẩn hóa cho từ mới do user tạo.
2. Chống trùng từ mạnh hơn theo `normalizedWord` + ngữ cảnh group/user.
3. Audit log cho thao tác sửa/xóa từ quan trọng.

## 5) Đề xuất contract API ngắn gọn

### 5.1 Cập nhật trạng thái từ
`PATCH /api/user-vocabulary/{userVocabularyId}/status`

Request:
```json
{
  "learnLevel": 2
}
```

Response:
```json
{
  "success": true,
  "data": {
    "userVocabularyId": 123,
    "learnLevel": 2,
    "updatedAt": "2026-04-20T10:00:00"
  }
}
```

### 5.2 Lấy danh sách từ có filter nâng cao
`GET /api/user-vocabulary?groupId=10&partOfSpeech=verb&learnLevel=0&fromDate=2026-04-01&toDate=2026-04-20&q=acq&sort=savedAt,desc&page=0&size=20`

## 6) Kế hoạch triển khai đề xuất

### Sprint 1 (khuyến nghị làm trước)
1. Chuẩn hóa ID xóa theo `userVocabularyId`.
2. Bổ sung API cập nhật trạng thái 3 mức.
3. Bổ sung bảng/CRUD group riêng.
4. Nâng cấp API list có filter cơ bản (group, status, ngày thêm).

### Sprint 2
1. Batch APIs (save/status/delete).
2. Review events + analytics cho heatmap/streak.
3. Đồng bộ dữ liệu từ custom đầy đủ.

### Sprint 3
1. Tối ưu hiệu năng truy vấn + index.
2. Audit log, kiểm duyệt dữ liệu từ mới.

## 7) Kết luận ngắn
- Module từ vựng phía frontend đã làm được khá nhiều về giao diện và trải nghiệm học.
- Backend hiện mới đáp ứng mức cơ bản (lookup/save/list/delete).
- Để chạy ổn định đa thiết bị và đúng nghiệp vụ “Sổ từ vựng”, cần ưu tiên xây thêm **group chuẩn hóa + status 3 mức + filter nâng cao + analytics review**.
