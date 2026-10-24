## 1.6.2 — 2026-10-24

- !scalp bật thêm scalp demo BTC/ETH M1/M5, trả setup hiện còn hiệu lực và tự báo tín hiệu mới; !scalp BTC/ETH chọn riêng; !off scalp hoặc !off scalp BTC tắt riêng. Không ảnh hưởng khung lớn hoặc nhóm khác.
- Dùng cùng công thức/cấu hình 480 ứng viên đã nghiên cứu trên web, theo phiên, giữ tối đa 1–3 phút; không sửa kết quả kiểm chứng.
- Ưu tiên giá Exness công khai cho Entry/TP/SL và quy đổi ATR từ cùng thời điểm; dự phòng Bitget/USDT ghi rõ nguồn. Giá nguồn công khai có thể lệch tài khoản.
- Vòng scalp 10 giây độc lập vòng HTF 30 giây, lưu tín hiệu/cấu hình theo nến mới, chống trùng qua restart; bỏ setup hết hạn hoặc quote trễ.
- Không cần !setup, không trần số nhóm; giữ phiên Zalo/lịch nhạc/PR. Chưa cập nhật host Botkeep hoặc gửi tin Zalo thật.

## 1.6.1 — 2026-10-24

- !on mặc định tự gửi setup DEMO BTC/ETH từ bộ chọn trong nghiên cứu, kể cả chưa đạt kiểm chứng; không sửa kết quả test hay cờ accepted. Tin có nhãn DEMO · CHƯA ĐẠT KIỂM CHỨNG.
- Bỏ nhầm trạng thái nến trễ sau2phút trên H1/H4; chờ tín hiệu/entry hết hạn được báo đúng trạng thái, không gửi setup cũ.
- Kiểm tra timestamp báo giá lúc gửi, vẫn chống trùng và lưu đăng ký qua restart; vàng thiếu nguồn live vẫn báo chưa sẵn sàng.
- Hỏi setup nhiều khung đọc dữ liệu song song, kiểm tra độ mới trước khi gửi.
- Kiểm tra toàn luồng provider mặc định → tín hiệu nến lịch sử thật → thông báo Zalo giả lập, với accepted=false. Chưa gửi tin Zalo thật hoặc cập nhật host Botkeep.

## 1.6.0 — 2026-10-24

- Mọi nhóm dùng ngay, bỏ yêu cầu setup cho cả lệnh cũ; bỏ trần 100 lịch. Setup cũ không dừng lịch/nhạc.
- Thêm !on/!BTC/!ETH/!XAUU/!off theo nhóm và khung M15/M30/H1/H4; lưu đăng ký, chống trùng qua restart, ngắt kết nối thì dừng.
- Engine chỉ báo dùng chung web/bot, cấu hình riêng mỗi tài sản,288cấu hình được sàng lọc. Chưa có bộ đủ tiêu chí; không phát lệnh từ bộ chưa đạt.
- Giữ phiên Zalo, lịch cũ và lịch sử nhạc. Sửa lockfile có bản string_decoder 1.5.0 không tồn tại để npm cài được.
- Chưa triển khai host Botkeep hoặc test gửi tin Zalo thật.

# 1.5.0

- Thêm `!scl randoom`, `!scl random`, `?scl random`: lấy bảng most-played Apple Music VN/Mỹ/Anh/Hàn, rồi tìm bản SoundCloud phù hợp.
- Cache 6 giờ, dự phòng tối đa 48 giờ khi nguồn lỗi, từ chối bảng quá cũ; không dùng danh sách cố định thay thế.
- Lọc preview dưới 90 giây, kết quả nhầm tên/nghệ sĩ, remix/cover/mashup không yêu cầu. Không bảo đảm mọi bài đều có bản tải được.
- Lưu 80 lượt random gần nhất theo nhóm, giữ qua restart; không phát lại chỉ vì nguồn thiếu bài mới.
- Sửa nhận tiền tố ! khi cấu hình đang là ?; chặn cả hai tiền tố trong nội dung gửi tự động.
- Sửa chống lặp lệnh random 30 giây khiến yêu cầu mới bị bỏ nhầm; vẫn giữ cooldown 10 giây/người.
- Không chờ nguồn quốc tế tùy chọn bị lỗi khi đã có đủ cache VN và một nguồn quốc tế.
- 53 kiểm tra đã qua, doctor đạt; tải và chuyển AAC thực tế thành công bài VN và quốc tế. Chưa kiểm thử gửi trên tài khoản Zalo người dùng.

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
