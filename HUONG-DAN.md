# Bot Zalo gửi nhạc dạng ghi âm — bản gọn cho Botkeep

Bot tìm nhạc SoundCloud bằng tên hoặc link, tải âm thanh, chuyển sang AAC,
tải lên Zalo rồi gửi bằng `sendVoice`. Không gửi dưới dạng tệp đính kèm.
Không có menu game/quản trị nhóm hay tự nhắn tin hàng loạt.

## 1. Upload lên Botkeep

1. Chọn loại ứng dụng **Node.js**, phiên bản **22 hoặc 24**.
2. Chọn nguồn **ZIP**, upload file `zalo-music-bot.zip`.
3. Sau giải nén, `package.json`, `package-lock.json` và `index.mjs` phải nằm
   ngay thư mục chính. Không để thêm lớp thư mục `zalo-music-bot/` ở ngoài.
4. Nếu có ô **Install command**, nhập `npm ci`. Nếu host chỉ hỗ trợ `npm install`,
   có thể dùng lệnh đó. Chờ cài xong; tải công cụ nhạc có thể mất vài phút.
5. Ô **Start command / Startup command** nhập `npm start`.
6. Nếu có thể chạy lệnh kiểm tra trước, dùng `npm run doctor`.
7. Bấm Deploy/Start tùy giao diện. Mở **Console** để đọc trạng thái.

Không cần token Discord, mật khẩu Zalo, tài khoản API tải nhạc hoặc thẻ thanh toán
trong bộ code này. Các biến trong `.env.example` đều có mặc định; có thể bỏ trống
mục Environment khi chạy thử.

## 2. Đăng nhập Zalo bằng QR

1. Khi Console hiện **QR ĐÃ SẴN SÀNG**, mở **Files → data → qr.png**.
2. Mở hoặc tải ảnh QR về rồi dùng Zalo trên điện thoại quét và xác nhận đăng nhập.
   Có thể mở ảnh trên màn hình khác để quét. Nếu bản Zalo của bạn hỗ trợ chọn ảnh
   QR trong thư viện, có thể chọn ảnh đã tải về ngay trên cùng điện thoại.
3. QR hết hạn sẽ được tạo lại. Tải lại ảnh mới trong Files, tránh dùng bản đã lưu cũ.
4. Console hiện **BOT SẴN SÀNG** là bot đã kết nối.
5. Phiên đăng nhập lưu trong `data/session.json`, dùng lại khi restart nếu host giữ
   file và Zalo chưa hết hạn phiên. Muốn đổi tài khoản: Stop, xóa file đó, Start lại.

Giữ `data/session.json` riêng tư như thông tin đăng nhập. Không gửi file này hoặc
ảnh QR đăng nhập đang còn hạn vào nhóm, GitHub hay cuộc trò chuyện hỗ trợ.
QR không được đưa lên một trang web công khai bởi bộ bot này.

## 3. Dùng trong nhóm

Tài khoản Zalo đã đăng nhập phải ở trong nhóm. Nhóm/cộng đồng chỉ cho trưởng/phó
nhắn tin thì tài khoản bot cũng cần có quyền gửi tin ở đó.

Gõ trong nhóm:

```text
!help
!nhac Em Đừng Khóc Chillies
!scl https://soundcloud.com/ten-tac-gia/ten-bai-hat
!id
!kiemtra
```

Dòng `!scl` trên là mẫu cú pháp; thay bằng link bài hát thật. Tìm bằng tên sẽ lấy
kết quả SoundCloud đầu tiên; để chọn đúng bài, nên dán link của bài đó.
Bot nghe cả lệnh từ chính tài khoản đang chạy bot.

Mỗi lần xử lý một bài, giới hạn 10 phút và file tải tối đa 30 MB để giảm tải cho
gói miễn phí. Có thể mất một lúc để tìm, tải, chuyển đổi và gửi. Chỉ hỗ trợ nội dung
mà nguồn cho phép truy cập; bài riêng tư/không khả dụng có thể không tải được.

Thông tin tên bài và link được gửi dưới dạng tin nhắn chữ sau voice; bản gọn này
chưa vẽ thẻ ảnh SoundCloud giống hình mẫu. Giao diện voice thực tế phụ thuộc Zalo.

## 4. Chỉ bật cho một nhóm hoặc một số người

Mặc định bot phản hồi lệnh trong mọi nhóm có tài khoản bot.
Dùng `!id` trong nhóm trước, rồi thêm biến trong mục Environment:

```text
PREFIX=!
ALLOWED_GROUP_IDS=ID_NHOM_1,ID_NHOM_2
ALLOWED_USER_IDS=UID_NGUOI_1,UID_NGUOI_2
MAX_DURATION_SECONDS=600
```

Để trống một danh sách nghĩa là không giới hạn theo danh sách đó.
Khởi động lại sau khi thay đổi Environment. `!id` cũng chịu giới hạn nên cần lấy
ID trước khi bật danh sách cho phép.

## 5. Lỗi thường gặp

### Cập nhật từ bản 1.0.0 lên 1.0.1

Stop bot, tải `zalo-music-bot-1.0.1.zip`, giải nén đè các file code hiện có rồi Start.
Giữ nguyên `data/` và các biến Environment; không xóa `data/session.json` để sửa lỗi nhạc.
Nếu chức năng triển khai lại của host xóa toàn bộ môi trường thì phải quét QR lại.
Khi chạy đúng bản mới, Console hiện **Zalo Music Bot 1.0.1**.

Gõ `!kiemtra` trong nhóm để kiểm tra công cụ và kết nối SoundCloud mà không tải
toàn bộ bài. Gõ `!kiemtra dancing in the dark` để kiểm tra tìm bài cụ thể.
Hoặc chạy `npm run doctor -- --network` nếu host cho nhập lệnh shell.

Lỗi mới có dạng `[tim-nhac / yt-dlp / TLS]` hoặc
`[tai-nhac / yt-dlp / SOURCE_FORBIDDEN]`; Console có chi tiết đã ẩn URL và credential.
Các mã HTTP 403/429, lỗi mạng hay giới hạn container cần xử lý theo lỗi thực tế;
bản cập nhật không đảm bảo vượt qua được hạn chế của host/nguồn nhạc.

`!scl dancing in the dark` là lệnh tìm theo tên hợp lệ. Với link SoundCloud,
không nối thêm tên file như `index.mjs` ở cuối link.

- **Không có `package.json`**: giải nén ZIP đúng thư mục chính, bỏ thư mục bao ngoài.
- **Không tải được công cụ khi cài npm**: host cần truy cập npm và GitHub Releases;
  xem lỗi cài đặt, thử lại. Không dùng `--ignore-scripts` vì sẽ bỏ bước cài công cụ.
- **Permission denied / GLIBC / không chạy được binary**: image host cần Linux
  x64 hoặc arm64 tương thích binary. Bản này không cần sudo, nhưng chưa được xác
  nhận chạy trên mọi image của Botkeep. Gửi ảnh lỗi Console, che thông tin riêng tư.
- **Không thấy QR**: chờ Console báo sẵn sàng, refresh Files. Lỗi trước bước này
  thường do kết nối tới Zalo hoặc cơ chế đăng nhập của thư viện thay đổi.
- **Gõ lệnh không phản hồi**: kiểm tra BOT SẴN SÀNG, tài khoản bot đã ở trong nhóm,
  có quyền gửi tin và danh sách ALLOWED_* đúng. Bản này chỉ nghe lệnh trong nhóm.
- **Bài không tải được**: thử link bài SoundCloud khác. Bot dùng yt-dlp
  `2026.10.21`; nguồn SoundCloud thay đổi có thể cần cập nhật công cụ.
- **Upload lên Zalo đứng lâu**: Stop rồi Start bot, thử bài ngắn khác; upload của
  thư viện cần kết nối WebSocket Zalo còn hoạt động.
- **Mất phiên sau deploy lại**: host có thể thay thư mục dữ liệu; đăng nhập QR lại.

## Kiểm chứng và giới hạn

Có kiểm tra thư viện, công cụ nhạc và 11 bài kiểm tra luồng gửi voice/chẩn đoán bằng API giả lập.
Đã tải thử bài “Carefree” từ SoundCloud và chuyển thành AAC thành công trên Linux x64.
Chưa đăng nhập tài khoản người dùng, chưa gửi nhạc vào nhóm Zalo thật và chưa
triển khai trên Botkeep của bạn. Khả năng chạy thực tế còn phụ thuộc tài nguyên,
mạng của host, SoundCloud và phiên bản giao thức Zalo.

Đây là API Zalo cá nhân không chính thức (`zca-js`), có thể ngừng hoạt động khi
Zalo thay đổi và có rủi ro tài khoản bị hạn chế theo điều khoản nền tảng.

Nguồn tham khảo:
- https://botkeep.cloud/docs/zip
- https://github.com/RFS-ADRENO/zca-js
- https://github.com/yt-dlp/yt-dlp
- https://github.com/eugeneware/ffmpeg-static
