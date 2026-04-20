# Quy tắc JPA/Hibernate

## Mục tiêu
- Tối ưu truy vấn ORM để tránh chậm và khó debug.
- Giữ domain model rõ ràng, tránh phụ thuộc vào serialize entity trực tiếp.

## Quy tắc bắt buộc
- Mặc định quan hệ dùng `FetchType.LAZY`, chỉ eager khi có lý do hiệu năng rõ ràng.
- Không để phát sinh N+1 ở endpoint nặng; dùng `join fetch`, entity graph hoặc projection.
- Repository method phải thể hiện rõ ý đồ truy vấn, ví dụ `findByUserIdAndStatus`.
- Danh sách có khả năng lớn phải có phân trang (`page`, `size`, `sort`).
- Chỉ dùng native query khi JPQL/Specification không đáp ứng được hiệu năng.
- Biên transaction đặt ở service layer (`@Transactional`), không đặt ở controller.
- Không trả entity JPA trực tiếp ra API; luôn map sang DTO response.

## Quy tắc schema đi kèm
- Khóa nghiệp vụ quan trọng phải có unique constraint ở DB, không chỉ kiểm tra trong service.
- Truy vấn nóng phải có index tương ứng với mẫu truy vấn thực tế.
- Trường bắt buộc nghiệp vụ phải `nullable = false`.

## Anti-pattern cần tránh
- Dùng `findAll()` cho bảng lớn không phân trang.
- Serialize entity có quan hệ lồng nhau gây vòng lặp hoặc load dữ liệu ngoài ý muốn.
- Đẩy logic lọc/phân trang về Java collection thay vì query DB.

## Checklist review PR
- Endpoint mới có N+1 tiềm ẩn không.
- Có pagination cho list API chưa.
- Có map DTO thay vì trả entity chưa.
- Query nặng đã xem SQL thực thi chưa.
