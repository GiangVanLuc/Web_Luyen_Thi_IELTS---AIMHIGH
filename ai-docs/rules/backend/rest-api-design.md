# REST API Design Rules (Spring Boot)

## Mục tiêu
- API dễ dự đoán, đồng nhất giữa các module.
- Tương thích ổn định với frontend hiện tại.

## URI and Resource Modeling
- Use plural resource nouns: `/api/exams`, `/api/attempts`, `/api/user-vocabulary`.
- Keep URI hierarchical for sub-resources: `/api/attempts/{attemptId}/notes`.
- Avoid action verbs in URI; express actions by HTTP method.
- Reserve admin namespace with role protection: `/api/admin/**`.

## HTTP Method Semantics
- `GET`: read-only, idempotent, no server state mutation.
- `POST`: create resource or start process (for example `POST /attempts/start`).
- `PUT`: full replacement update.
- `PATCH`: partial update (status toggle, note update).
- `DELETE`: remove resource and return clear confirmation payload.

## Response Contract
- Return a consistent envelope for responses that carry body:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "errors": [],
  "timestamp": "2026-04-13T10:15:30Z"
}
```
- Success codes: `200` (read/update), `201` (create), `204` (delete without body).
- Client errors: `400` (invalid request), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (conflict), `422` (validation).
- Server errors: `500` for unexpected failures with safe message.
- If dùng `204`, không trả body để tránh mơ hồ contract.

## Query, Filter, Pagination
- Use query params for filtering: `/api/admin/exams?skill=READING&status=published`.
- Standard pagination keys: `page`, `size`, `sort`.
- Return paging metadata in `data.meta` when list endpoints are paginated.

## Validation and Versioning
- Validate request DTO using Bean Validation (`@NotNull`, `@Size`, etc.).
- Return field-level validation errors in a predictable structure.
- If breaking change is unavoidable, introduce `/api/v2/...` and keep v1 stable during migration.

## Anti-pattern cần tránh
- Trả dữ liệu thành công mỗi endpoint một format khác nhau.
- Đổi tên key trong response mà không version hoặc không cập nhật frontend cùng lúc.
- Dùng `POST` cho thao tác chỉ đọc dữ liệu.

## Checklist review PR
- Endpoint mới có đúng method semantics chưa.
- Có mô tả auth requirement rõ ràng chưa.
- Có sample request/response cho endpoint mới chưa.
- Thay đổi contract đã cập nhật docs frontend/backend liên quan chưa.

## Frontend Integration Requirements
- Keep field names stable and documented for `js/api.js` consumers.
- Never rename/remove response keys without updating frontend modules and docs together.
- Document each new endpoint with sample request/response and auth requirement.
