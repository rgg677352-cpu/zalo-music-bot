# Hướng dẫn Bot Zalo nhạc 1.1.0

## Cài trên Botkeep

1. Chọn runtime Node.js 22 hoặc 24.
2. Upload `zalo-music-bot-1.1.0.zip`, giải nén vào thư mục chính.
3. `package.json`, `package-lock.json`, `index.mjs`, `src/`, `scripts/` nằm cùng cấp.
4. Install command: `npm ci`. Start command: `npm start`.
5. Console phải hiện `Zalo Music Bot 1.1.0`.
6. Khi Console báo QR sẵn sàng, mở Files → data → qr.png.
7. Quét và xác nhận đăng nhập bằng Zalo trên điện thoại.

ZIP chỉ chứa code và giấy phép font. `npm ci` sẽ tải thư viện, FFmpeg, yt-dlp
và font tiếng Việt đã ghim phiên bản/SHA-256. Không cần sudo hoặc Python hệ thống.
Mạng của host cần truy cập npm, GitHub Releases và raw.githubusercontent.com.

## Cập nhật từ 1.0.x

Stop bot, upload/giải nén đè đầy đủ code 1.1.0, cài dependency bằng `npm ci`, Start.
Giữ nguyên `data/` và Environment. Không chỉ sửa số version trong package.json.
Bản này cần thêm thư viện tạo ảnh; không chỉ thay mỗi index.mjs.

Nếu Files đã được thay mà mỗi lần Start vẫn hiện 1.0.x, kiểm tra nguồn triển khai
hoặc Startup của host: host có thể đang dùng bản nguồn cũ. Cần xem cấu hình thật
để cập nhật, không đoán rằng nhập lệnh shell vào Console bot sẽ chạy được.

## Đăng nhập

QR hết hạn tự tạo lại; refresh Files và tải lại ảnh `data/qr.png` mới.
Sau khi quét, xác nhận trên điện thoại. Console báo BOT SẴN SÀNG khi đã kết nối.
Phiên được lưu trong `data/session.json`, dùng lại nếu host giữ file và phiên còn hạn.
Muốn đổi tài khoản: Stop, xóa riêng file đó, Start và quét QR mới.
Không chia sẻ session.json hoặc QR đang còn hạn cho người khác.

## Gửi nhạc

Tài khoản đã đăng nhập phải ở trong nhóm; nhóm chỉ cho trưởng/phó gửi thì tài
khoản bot cũng cần quyền gửi tin.

```text
!nhac Em Đừng Khóc Chillies
!scl https://soundcloud.com/kevin-9-1/carefree
!help
!id
!kiemtra
```

Cả !nhac và !scl nhận tên hoặc link SoundCloud. Link trên là một bài thử thực tế.
Không nối thêm tên file code (như index.mjs) vào link.
Tìm tên lấy kết quả đầu tiên; SoundCloud có thể chỉ cung cấp bản nghe thử.
Không tự tìm bản khác hoặc gửi nhiều kết quả vào nhóm.

## Kết quả trong nhóm

Một bài thành công: **một voice + một ảnh thông tin** có bìa, tên, nghệ sĩ và thời lượng.
Không gửi tin đang tải, link chữ hoặc tin báo bận.
Nếu không có bìa, ảnh dùng hình đĩa nhạc mặc định.
Nếu ảnh không tạo/gửi được sau khi voice thành công, dùng một dòng tên bài gọn.
Không gửi lại voice hoặc báo lỗi cả bài chỉ vì ảnh lỗi.

Một bài đang xử lý, tối đa hai bài chờ. Yêu cầu trùng trong 30 giây bị bỏ qua.
Mỗi người tối đa một yêu cầu trong 10 giây. Yêu cầu vượt hàng đợi bị bỏ qua,
không có tin nhắn phụ gây rối nhóm. Gửi lệnh một lần rồi đợi.

Lỗi chỉ có một câu ngắn, tối đa một tin lỗi mỗi nhóm trong 30 giây.
Chi tiết kỹ thuật và URL đã được ẩn thông tin nhạy cảm nằm trong Console.

## Cấu hình Environment (không bắt buộc)

```text
PREFIX=!
ALLOWED_GROUP_IDS=
ALLOWED_USER_IDS=
MAX_DURATION_SECONDS=600
```

Dùng !id trước khi giới hạn nhóm/người. Danh sách ID cách nhau bằng dấu phẩy,
để trống nghĩa là không giới hạn theo danh sách đó. Khởi động lại sau khi đổi.

## Kiểm tra và lỗi

- `!kiemtra` trong nhóm: một tin kết quả ngắn. Chi tiết ở Console.
- `npm run doctor`: kiểm tra yt-dlp, FFmpeg, font và tạo ảnh PNG.
- `npm run doctor -- --network`: thêm kiểm tra kết nối SoundCloud.
- TLS: kiểm tra chứng chỉ của host. Bot thử CA hệ thống chỉ khi lỗi TLS, không tắt xác minh.
- HTTP 403/429: nguồn từ chối/giới hạn yêu cầu từ host. Không bảo đảm khắc phục bằng code.
- RUNTIME/GLIBC/Permission denied: image host không chạy được công cụ, xem lỗi Console.
- DISK_FULL: host hết dung lượng. Không xóa data/session.json để dọn file nhạc.
- Upload Zalo đứng lâu: restart rồi thử bài ngắn khác, kiểm tra quyền gửi và kết nối.
- Không có ảnh: kiểm tra đã cài đúng dependency mới, font tải được và Console không có lỗi tạo/gửi ảnh.

## Nguồn và giới hạn

Dùng zca-js (API Zalo cá nhân không chính thức), yt-dlp, ffmpeg-static,
@resvg/resvg-js và font Be Vietnam Pro. Giấy phép font trong assets/FONT-LICENSE.txt.
Ảnh bìa lấy từ metadata của bài SoundCloud, không tải lên dịch vụ ảnh bên ngoài.

Đã kiểm tra tự động và tạo ảnh thực tế trong môi trường phát triển; chưa trực tiếp
đăng nhập hoặc gửi nhạc/ảnh trong tài khoản người dùng. Giao thức, mạng, tài nguyên
và giới hạn của Zalo/SoundCloud/Botkeep có thể ảnh hưởng kết quả.

Nguồn:
- https://botkeep.cloud/docs/zip
- https://github.com/RFS-ADRENO/zca-js
- https://github.com/yt-dlp/yt-dlp
- https://github.com/yisibl/resvg-js
- https://github.com/google/fonts/tree/main/ofl/bevietnampro
