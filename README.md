# Zalo Bot 1.6.3

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Bot có mặt trong nhóm là mọi thành viên dùng được các lệnh cũ và mới, không cần `!setup` hay `?setup`; không giới hạn số nhóm. Giữ nguyên phiên đăng nhập Zalo, lịch gửi và lịch sử nhạc khi cập nhật. Có nhạc SoundCloud dạng voice kèm ảnh. `!scl randoom` / `!scl random` chọn bài từ bảng Apple Music VN/quốc tế, tìm bản SoundCloud phù hợp và nhớ 80 lượt gần đây để tránh lặp.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.


Thông báo setup demo: `!on`, `!BTC`, `!ETH`, `!XAUU`, `!BTC H1`, `!off BTC`, `!off`. Bật/tắt theo từng nhóm; không tự bật ở nhóm chưa yêu cầu. Bản 1.6.3 mặc định tự báo setup DEMO BTC/ETH khi có tín hiệu mới, kèm Entry/TP/SL và thời hạn; chống trùng qua restart. Bộ chưa đạt kiểm chứng vẫn được gửi, ghi rõ “DEMO · CHƯA ĐẠT KIỂM CHỨNG”. Kết quả test 0/288 bộ đạt giữ nguyên, không biến thành tuyên bố có lợi nhuận. Chỉ nhận nến đóng và Bid/Ask mới; setup hết hạn không gửi bù. Vàng chưa có nguồn live cùng nguồn đã kiểm tra. Không gửi lệnh đến sàn.

M15/M30 test 1 tháng, H1/H4 test khoảng 9 tháng. Engine và kết quả được đóng cùng bản ZIP, cùng công thức với web. Mã tích hợp và luồng gửi đã test bằng API Zalo giả lập; chưa đăng nhập hay gửi tin trên tài khoản của bạn. Tải ZIP mới lên Botkeep, giữ `data/` và `.env`, ghi đè code rồi restart một lần. Không cần gọi setup sau đó.


Scalp: `!scalp` bật thêm scalp demo BTC/ETH M1/M5 trong nhóm hiện tại và gửi setup còn hiệu lực; sau đó tự kiểm tra mỗi 10 giây. `!scalp BTC` / `!scalp ETH` chọn riêng. `!off scalp` tắt scalp, giữ M15–H4; `!off scalp BTC` tắt scalp BTC. `!off BTC` tắt cả scalp và khung lớn BTC. Không cần !on trước và không cần !setup. Đăng ký giữ qua restart.

Scalp dùng cùng công thức/cấu hình theo phiên với web, giữ tối đa 1–3 phút, entry hiệu lực 45 giây sau khi có nến đóng. Nến Bitget M1 thật, ATR M5 từ nhóm đủ 5 nến; ưu tiên Bid/Ask Exness công khai để tính Entry/TP/SL và quy đổi ATR theo tỷ lệ giá cùng thời điểm. Thiếu giá Exness mới thì tạm dừng báo setup; không dùng Bitget/USDT làm giá Entry. Giá công khai không bảo đảm trùng tài khoản Exness; đối chiếu giá app trước khi đặt. 0/480 cấu hình scalp vượt đầy đủ kiểm tra, nên mọi tin vẫn là DEMO · CHƯA ĐẠT KIỂM CHỨNG.

Scalp chạy vòng10giây riêng với khung lớn 30 giây, dùng bộ nhớ đệm chỉ báo đến nến M1 mới; không backtest/huấn luyện trên host. Không gửi setup cũ hoặc bị trễ giá. Chưa cập nhật host Botkeep hoặc gửi tin Zalo thật từ môi trường này.


Giá lệnh bản1.6.3: cả SCALP và M15–H4 chỉ lấy Entry BUY theo Ask, SELL theo Bid của Exness công khai; SL/TP tính lại theo độ biến động tham chiếu được quy đổi cùng thời điểm. Không dùng giá Bitget spot/perp để thay thế Entry khi Exness lỗi. Tin ghi BTCUSD/ETHUSD, loại MARKET tham chiếu, Bid/Ask lúc phát, giờ phát và hạn entry. Chỉ báo vẫn dùng nến Bitget tham chiếu; đây CHƯA phải feed tài khoản MT5.

Để khớp đúng nguồn tài khoản, cần kết nối chính tài khoản bằng cầu nối terminal MT5 chỉ đọc hoặc API chính thức nếu là tài khoản Exness được hỗ trợ. Exness API hiện không hỗ trợ tài khoản MetaTrader tiêu chuẩn. Tên BTC trong app không đủ xác định mã/suffix. Không gửi mật khẩu/khóa bí mật vào chat; thông tin kết nối phải cấu hình trực tiếp trên máy chủ của chủ tài khoản.
