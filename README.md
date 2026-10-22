# Bot nhạc Zalo — SoundCloud → tin nhắn thoại

**[Tải bản 1.0.1 để upload lên Botkeep](https://github.com/rgg677352-cpu/zalo-music-bot/raw/refs/heads/main/zalo-music-bot-1.0.1.zip)**

Bản gọn dùng Node.js và zca-js: đăng nhập Zalo qua QR, tìm hoặc nhận link SoundCloud, chuyển âm thanh sang AAC rồi gửi bằng `sendVoice` vào nhóm.

## Chạy trên Botkeep

1. Tải file ZIP bằng link trên và chọn runtime **Node.js 22 hoặc 24**.
2. Upload ZIP, giữ `package.json` ngay thư mục chính.
3. Install command: `npm ci`. Start command: `npm start`.
4. Khi Console báo QR sẵn sàng, mở **Files → data → qr.png**, quét và xác nhận trên Zalo.
5. Khi bot sẵn sàng, gõ `!help` hoặc `!nhac Em Đừng Khóc Chillies` trong nhóm.

Tài khoản bot phải ở trong nhóm và có quyền gửi tin. Mặc định bot nghe trong mọi nhóm có tài khoản bot; có thể giới hạn bằng biến Environment, xem [hướng dẫn](HUONG-DAN.md).

## Lệnh

```text
!help
!nhac tên bài hát - ca sĩ
!scl link-bài-hát-SoundCloud
!id
!kiemtra
```

Mỗi lần xử lý một bài, tối đa 10 phút. Tên bài và link được gửi thành tin nhắn chữ kèm voice; chưa tạo thẻ ảnh SoundCloud.

## Kiểm chứng

Đã cài dependency, chạy 11 bài kiểm tra tự động và thử tải/chuyển SoundCloud sang AAC trên Linux x64. Chưa trực tiếp kiểm tra trên container Botkeep của người dùng. Người dùng đã xác nhận đăng nhập Zalo và nhận lệnh được, nhưng bản cũ báo lỗi công cụ trên host. Xem [kết quả kiểm tra](KIEM-TRA.txt).

## Bản 1.0.1

- Báo rõ bước, công cụ, nguyên nhân và chi tiết lỗi đã ẩn URL/credential.
- Dùng kho chứng chỉ mặc định, chỉ thử CA hệ thống khi có lỗi xác minh HTTPS; không tắt TLS.
- Đặt thư mục tạm của công cụ độc lập trong thư mục ứng dụng thay vì phụ thuộc `/tmp` của container.
- Chuẩn hóa link SoundCloud mobile và từ chối link bị dính tên file code.
- Có `!kiemtra` trong nhóm và `npm run doctor -- --network` để kiểm tra ngay trên host.

Khi cập nhật, giữ `data/` và Environment. Console phải hiện **Zalo Music Bot 1.0.1**.

Đây là API Zalo cá nhân không chính thức; khả năng hoạt động và giới hạn tài khoản phụ thuộc nền tảng. Không đưa `data/session.json`, QR còn hiệu lực hoặc cookie lên GitHub. ZIP không chứa dữ liệu đăng nhập.

Xem [HUONG-DAN.md](HUONG-DAN.md) để cấu hình, đăng nhập QR và xử lý lỗi. ZIP là bản đóng gói 1.0.1; GitHub **Code → Download ZIP** có thêm thư mục bao ngoài, nên khi upload Botkeep hãy dùng link tải trực tiếp ở đầu trang.
