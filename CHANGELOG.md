# 1.4.0

- Thêm `?pr ID | nội dung | nội dung 2`: luân phiên một nội dung/lượt, mặc định mỗi 10 phút, lần đầu sau 10 phút.
- Gọi lại PR cho cùng nhóm cập nhật lịch hiện tại, giữ ID và đặt lại chu kỳ; không tạo lịch PR trùng.
- Sửa lỗi kết quả gửi của lịch cũ có thể dừng nhầm lịch PR vừa cập nhật.
- Dấu `?` dùng được dù `.env` vẫn đặt tiền tố khác; giữ lệnh và dữ liệu cũ.
- Setup sai tài khoản và help trước setup có hướng dẫn, giới hạn tin nhắc lặp.
- Help viết lại theo luồng đơn giản; không cần nhập chu kỳ khi tạo PR.
- 42 kiểm tra đã qua. Chưa kiểm thử trực tiếp trên Zalo/Botkeep của người dùng.

# 1.3.0

- Sửa bỏ nhầm các lệnh không có msgId; chống sự kiện trùng dựa trên nhóm, người gửi và mã tin.
- Hủy yêu cầu nhạc đang tải/xếp hàng và phản hồi danh sách đang chờ khi đổi nhóm chính.
- Ngừng các lượt gửi tiếp theo trong vòng lịch đang chạy khi mất kết nối; tránh callback cũ tiếp tục gửi sau reconnect.
- Giới hạn chờ SDK Zalo 30 giây; lịch lỗi tự dừng và không thử lại khi không rõ kết quả.
- Kiểm tra chặt dữ liệu lịch: mã trùng, số đếm, chu kỳ, vị trí câu, giới hạn kích thước. Giữ tương thích lịch 1.2.0/1.2.1.
- Lệnh `!list [trang]`, `!lich [trang]`, `!lich L1`; giới hạn phản hồi xem lặp quá nhanh.
- Phản hồi có khoảng cách rõ, thời gian đọc bằng giây/phút/giờ. Cập nhật help đầy đủ.
- Bỏ các bộ câu tạo sẵn; `@` trong nội dung được gửi nguyên văn. Lịch cũ giữ nguyên dữ liệu.
- Không xóa phiên đã lưu chỉ vì lần khôi phục đăng nhập thất bại; chỉ ghi đè sau khi đăng nhập QR thành công.
- Kiểm tra công cụ nhạc chạy nền; tạo ảnh song song với upload audio để voice không phải chờ ảnh.
- Sửa xử lý tiêu đề ảnh quá dài và thời lượng không hữu hạn.

Đã chạy 37 kiểm tra tự động, doctor tạo PNG/công cụ đạt, npm audit không có advisory tại thời điểm kiểm tra. Chưa kiểm thử gửi thực tế bằng tài khoản Zalo của người dùng. Thời gian gửi phụ thuộc host/mạng; tin đã bắt đầu gửi có thể vẫn đến sau khi dừng.
