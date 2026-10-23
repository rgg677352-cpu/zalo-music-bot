# Zalo Bot 1.4.0

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Tài khoản đăng nhập bot nhắn `?setup` trong nhóm điều khiển. Sau đó mọi thành viên nhóm này dùng được `?list`, `?pr`, `?lich`, `?dung`, `?tieptuc`, `?xoa`, `?help`. Nhóm khác không điều khiển được. Có nhạc SoundCloud dạng voice kèm ảnh.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.
