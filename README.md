# Zalo Music & Group Control Bot 1.2.1

Bot tài khoản Zalo cá nhân: nhóm điều khiển, lấy tên/ID nhóm, gửi chữ ngay hoặc theo khoảng giây/phút/giờ với thời gian nghỉ, và gửi nhạc SoundCloud dạng voice kèm ảnh.

Đọc [HUONG-DAN.md](HUONG-DAN.md) để cài/cập nhật trên Botkeep và xem ví dụ lệnh.

Node.js 22+; `npm ci`, `npm start`. Tài khoản đăng nhập bot gõ `!setup` trong nhóm chính, sau đó gõ `!help`. Mọi thành viên nhóm chính được điều khiển. Không nhận lệnh ở nhóm khác.

Giữ dữ liệu đăng nhập và lịch trong `data` riêng tư. Không commit `.env`, QR hay session. Chỉ khi host đang chạy và kết nối Zalo thì mới gửi theo lịch. Chưa được kiểm thử trực tiếp trên tài khoản Zalo của bạn.
