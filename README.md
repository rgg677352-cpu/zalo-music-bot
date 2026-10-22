# Bot nhạc Zalo — voice kèm ảnh, chat gọn

**[Tải bản 1.1.0 để upload lên Botkeep](https://github.com/rgg677352-cpu/zalo-music-bot/raw/refs/heads/main/zalo-music-bot-1.1.0.zip)**

Node.js 22/24 · SoundCloud · đăng nhập Zalo bằng QR.

## Một yêu cầu, hai tin nhắn

Bot gửi **một voice và một ảnh thông tin bài hát**: bìa SoundCloud, tên bài, nghệ sĩ,
thời lượng. Không gửi tin “đang tải”, link chữ gây preview, hoặc thông báo “bot bận”.
Ảnh hỗ trợ chữ tiếng Việt. Nếu nguồn không có bìa, ảnh dùng hình đĩa nhạc mặc định.

- Xử lý lần lượt, tối đa một bài đang chạy và hai bài chờ.
- Bỏ yêu cầu trùng trong 30 giây, giới hạn mỗi người một yêu cầu trong 10 giây.
- Lỗi chỉ báo ngắn trong nhóm, tối đa một thông báo lỗi mỗi nhóm trong 30 giây.
  Chi tiết kỹ thuật vẫn có trong Console.
- Nếu voice đã gửi mà ảnh lỗi, chỉ thêm một dòng tên bài; không gửi voice lại.

## Cài và cập nhật

1. Chọn Node.js 22/24, upload và giải nén ZIP để `package.json` nằm ngoài cùng.
2. Install command: `npm ci`; Start command: `npm start`.
3. Console phải hiện **Zalo Music Bot 1.1.0**.
4. Khi QR sẵn sàng, mở **Files → data → qr.png**, quét và xác nhận bằng Zalo.
5. Tài khoản bot phải ở trong nhóm và có quyền gửi tin.

Bản 1.1.0 có dependency tạo ảnh mới. Cần cập nhật cả `package.json`,
`package-lock.json`, thư mục `src`, `scripts` và các file code; chạy lại cài dependency.
Giữ `data/` và Environment khi cập nhật, không xóa phiên đăng nhập để sửa lỗi nhạc.
Nếu host khôi phục code cũ mỗi lần Start, cần cập nhật nguồn triển khai trong bảng điều khiển.

## Lệnh

```text
!nhac Em Đừng Khóc Chillies
!scl link-bài-hát-SoundCloud
!help
!id
!kiemtra
```

`!nhac` và `!scl` đều nhận tên hoặc link. Tìm theo tên lấy kết quả đầu tiên,
có thể là bản nghe thử; muốn đúng bản hãy dùng link bài hát cụ thể.
Tối đa 10 phút/bài. Chỉ phản hồi lệnh trong nhóm.

## Kiểm chứng

18 bài kiểm tra tự động về gửi voice + ảnh, hàng đợi/chống trùng, lỗi một phần,
chữ tiếng Việt, giới hạn ảnh và chẩn đoán. Đã tạo ảnh PNG có bìa SoundCloud thật
trên Linux x64. Chưa trực tiếp xác nhận gửi ảnh/voice trên tài khoản Zalo và
container Botkeep của người dùng. Xem [kết quả kiểm tra](KIEM-TRA.txt).

Đây là API Zalo cá nhân không chính thức. Không đưa cookie, `data/session.json`,
QR còn hiệu lực hoặc `.env` thật lên GitHub. ZIP không chứa thông tin đăng nhập.

Xem [HUONG-DAN.md](HUONG-DAN.md). Khi upload Botkeep dùng ZIP ở link đầu trang;
GitHub Code → Download ZIP có thêm thư mục bao ngoài.
