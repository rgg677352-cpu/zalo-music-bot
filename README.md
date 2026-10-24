# Zalo Bot 1.6.1

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Bot có mặt trong nhóm là mọi thành viên dùng được các lệnh cũ và mới, không cần `!setup` hay `?setup`; không giới hạn số nhóm. Giữ nguyên phiên đăng nhập Zalo, lịch gửi và lịch sử nhạc khi cập nhật. Có nhạc SoundCloud dạng voice kèm ảnh. `!scl randoom` / `!scl random` chọn bài từ bảng Apple Music VN/quốc tế, tìm bản SoundCloud phù hợp và nhớ 80 lượt gần đây để tránh lặp.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.


Thông báo setup demo: `!on`, `!BTC`, `!ETH`, `!XAUU`, `!BTC H1`, `!off BTC`, `!off`. Bật/tắt theo từng nhóm; không tự bật ở nhóm chưa yêu cầu. Bản 1.6.1 mặc định tự báo setup DEMO BTC/ETH khi có tín hiệu mới, kèm Entry/TP/SL và thời hạn; chống trùng qua restart. Bộ chưa đạt kiểm chứng vẫn được gửi, ghi rõ “DEMO · CHƯA ĐẠT KIỂM CHỨNG”. Kết quả test 0/288 bộ đạt giữ nguyên, không biến thành tuyên bố có lợi nhuận. Chỉ nhận nến đóng và Bid/Ask mới; setup hết hạn không gửi bù. Vàng chưa có nguồn live cùng nguồn đã kiểm tra. Không gửi lệnh đến sàn.

M15/M30 test 1 tháng, H1/H4 test khoảng 9 tháng. Engine và kết quả được đóng cùng bản ZIP, cùng công thức với web. Mã tích hợp và luồng gửi đã test bằng API Zalo giả lập; chưa đăng nhập hay gửi tin trên tài khoản của bạn. Tải ZIP mới lên Botkeep, giữ `data/` và `.env`, ghi đè code rồi restart một lần. Không cần gọi setup sau đó.
