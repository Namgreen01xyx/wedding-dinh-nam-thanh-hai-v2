# Kết nối Google Sheets

Giữ link Sheet và dự án Apps Script trong ghi chú riêng của chủ thiệp.

## Thiết lập
1. Thay YOUR_SPREADSHEET_ID trong Code.gs bằng ID Sheet của chủ thiệp, rồi lưu vào dự án Apps Script. Bản trong kho chỉ là mẫu, không chứa ID Sheet thật.
2. Chủ tài khoản chạy setupWeddingSheet và cấp quyền Google Sheets. Hàm chỉ tạo/định dạng tab Khách mời và Tổng hợp; không xóa dữ liệu đã có.
3. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone. Chủ tài khoản duyệt quyền triển khai. Chỉ endpoint nhận form và đọc lời chúc công khai được đưa lên web, không xuất cả Sheet qua API.
4. Dán URL kết thúc bằng /exec vào wish-config.js, trường endpoint. Không đưa token OAuth hay khóa Google lên trang.
5. npm run build. Kiểm tra gửi thử từ trình duyệt, đối chiếu dòng Sheet, kiểm tra lời nhắn riêng không xuất hiện ở GET, gửi lại cùng mã không thêm dòng, thu hồi chỉ ẩn lời chúc.

## Cách lưu
Mỗi lượt gửi là một dòng trong Khách mời. Số người áp dụng cho từng buổi được đánh dấu. Tổng hợp cộng số người theo từng buổi, không cộng các buổi thành số khách duy nhất.
Chỉ tên, lời chúc, thời gian, mã gửi của dòng cho phép công khai và chưa thu hồi được endpoint GET trả về (toàn bộ lời chúc đáp ứng điều kiện, mới nhất trước).
POST dùng JSON trong Content-Type text/plain để tránh preflight; phải đọc được JSON ok:true mới thông báo gửi thành công. Không dùng no-cors để giả định đã lưu.
Mã gửi và mã thu hồi được giữ trong phiên để thử lại an toàn khi mất phản hồi. Sau thành công, mã thu hồi được giữ trên trình duyệt đã gửi. Đổi thiết bị/xóa dữ liệu trình duyệt sẽ mất quyền thu hồi; dâu rể vẫn có thể sửa cột Đã thu hồi lời chúc trong Sheet.
Không xóa dữ liệu Supabase cũ. Hai lời chúc công khai cũ đã được nhập sang Sheet với mã legacy-2 và legacy-3; đã kiểm tra hiển thị qua endpoint thật. Dữ liệu đăng ký cũ chỉ ở từng thiết bị, không thể tự lấy từ thiết bị khác.

## Quyền và vận hành
Chủ thiệp đã chọn tạm giữ Anyone with the link trên Sheet. Vì vậy ai có link Sheet đều có thể đọc toàn bộ dữ liệu. Chọn Restricted trong Share để giới hạn người xem. Tùy chọn công khai trên form chỉ kiểm soát trang thiệp.
Endpoint nhận lượt gửi không yêu cầu đăng nhập, cần theo dõi spam/quota Apps Script khi chia sẻ rộng. Không có CAPTCHA ở bản này. Giới hạn độ dài và kiểm tra dữ liệu được áp dụng ở server; khóa ghi tránh ghi đồng thời và mã gửi chống lặp khi thử lại.
Khi sửa Code.gs, tạo phiên bản triển khai mới trong Manage deployments; chỉ lưu editor không tự cập nhật bản /exec đang chạy.

## Kiểm tra thực tế ngày 05/11/2026
Web app đã triển khai và URL /exec đã điền trong wish-config.js. Bản preview cục bộ đã gửi thành công qua trình duyệt: RSVP riêng với hai tiệc và 2 người mỗi tiệc; lời chúc công khai với lựa chọn không tham dự; thu hồi lời chúc có xác thực. Đã đối chiếu cờ thu hồi TRUE và dữ liệu đăng ký vẫn còn trước khi dọn thử. Hai dòng thử đã được xóa nội dung tại A4:M5 sau khi đọc lại; hai dòng legacy giữ nguyên và tổng hợp trở về 0. Build, kiểm tra backend/frontend và git diff --check đều qua. Việc kiểm tra trên GitHub Pages cần thực hiện sau khi xuất bản.

## Giữ thông tin trên form
Form tự lưu nháp trên trình duyệt hiện tại. Sau khi gửi, thông tin được giữ và có nút Chỉnh sửa thông tin. Thao tác save dùng cùng mã gửi và mã xác thực để cập nhật đúng một dòng, không tăng số lượt đăng ký. Xóa dữ liệu trình duyệt hoặc đổi thiết bị sẽ mất bản nháp và quyền chỉnh sửa tại máy đó. Bản trước nâng cấp chưa giữ mã sửa RSVP nên không thể tự nhận diện lượt cũ.

Không đặt mức tối đa số người mỗi lượt; số người tham dự phải là số nguyên dương biểu diễn chính xác được trong JavaScript. Không cắt danh sách công khai ở 100 lời chúc; giao diện cuộn trong khung.
