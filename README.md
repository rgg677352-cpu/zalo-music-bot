# Zalo Music & Group Control Bot 1.3.0

Điều khiển tài khoản Zalo từ một nhóm chính: lấy tên/ID nhóm, gửi nội dung tự soạn theo chu kỳ gửi/nghỉ, luân phiên nhiều câu; gửi nhạc SoundCloud dạng voice kèm ảnh.

[Hướng dẫn cài đặt và sử dụng](HUONG-DAN.md) · [Thay đổi bản 1.3.0](CHANGELOG.md)

Node.js 22+; `npm ci`, `npm start`. Tài khoản đăng nhập bot nhắn `!setup` trong nhóm chính, sau đó dùng `!help`. Mọi thành viên nhóm chính đều điều khiển được.

Bản 1.3.0 làm gọn phản hồi, phân trang danh sách, bỏ bộ câu tạo sẵn, giới hạn chờ Zalo, hủy yêu cầu cũ khi đổi nhóm/mất kết nối và không chặn đăng nhập bởi kiểm tra công cụ nhạc.

Giữ riêng thư mục `data` và `.env`. Host phải đang chạy/kết nối thì lịch mới gửi. Không bảo đảm hết mọi lỗi trên môi trường chưa kiểm thử.
