# Zalo Bot 1.6.0

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Bot có mặt trong nhóm là mọi thành viên dùng được các lệnh cũ và mới, không cần `!setup` hay `?setup`; không giới hạn số nhóm. Giữ nguyên phiên đăng nhập Zalo, lịch gửi và lịch sử nhạc khi cập nhật. Có nhạc SoundCloud dạng voice kèm ảnh. `!scl randoom` / `!scl random` chọn bài từ bảng Apple Music VN/quốc tế, tìm bản SoundCloud phù hợp và nhớ 80 lượt gần đây để tránh lặp.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.


Thông báo setup demo: `!on`, `!BTC`, `!ETH`, `!XAUU`, `!BTC H1`, `!off BTC`, `!off`. Bật/tắt theo từng nhóm; không tự bật ở nhóm chưa yêu cầu. Bot chỉ báo bộ vượt kiểm tra, có Entry/TP/SL và thời hạn; chống trùng qua restart. Hiện sàng lọc 288 cấu hình M15/M30/H1/H4 chưa có bộ đủ tiêu chí, nên lệnh hỏi trả lời rõ chưa đạt và chưa phát thông báo đặt lệnh. Vàng chưa có nguồn live cùng nguồn đã kiểm tra. Không gửi lệnh đến sàn.

M15/M30 test 1 tháng, H1/H4 test khoảng 9 tháng. Engine và kết quả được đóng cùng bản ZIP, cùng công thức với web. Mã tích hợp và luồng gửi đã test bằng API Zalo giả lập; chưa đăng nhập hay gửi tin trên tài khoản của bạn. Tải ZIP mới lên Botkeep, giữ `data/` và `.env`, ghi đè code rồi restart một lần. Không cần gọi setup sau đó.
