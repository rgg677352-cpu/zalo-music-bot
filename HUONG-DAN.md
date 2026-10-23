# Bot Zalo 1.2.0: nhóm điều khiển, lịch gửi/nghỉ và nhạc

## Cập nhật trên Botkeep

1. Stop bot. Giữ nguyên thư mục `data` và cấu hình riêng `.env`.
2. Upload `zalo-music-bot-1.2.0.zip`, giải nén và ghi đè **toàn bộ code** ở thư mục chính. ZIP chứa thẳng `index.mjs`, `package.json`, `src`, `scripts`... Không để code nằm trong một thư mục con.
3. ZIP chỉ nằm trong Files thì chưa cập nhật. Cần dùng mục Extract/Unarchive của host. Console chạy bot không phải Terminal để gõ lệnh shell.
4. Start; kiểm tra Console hiện `Zalo Music Bot 1.2.0` và `BOT SẴN SÀNG 1.2.0`.
5. Nếu chưa có dependencies thì dùng quy trình cài `npm ci` của host. Bản này không thêm dependency so với 1.1.0.

## Chọn nhóm chính

Dùng **chính tài khoản Zalo đăng nhập bot** nhắn `!setup` trong nhóm muốn làm nhóm chính. Từ đó, mọi thành viên nhóm chính đều dùng được tất cả lệnh điều khiển, không cần cấu hình UID. Các nhóm khác không nhận lệnh, kể cả lệnh nhạc.

Chỉ tài khoản bot được dùng `!setup` để tránh thành viên nhóm khác tự chuyển nhóm chính. Đổi nhóm chính sẽ tạm dừng mọi lịch cũ. Gọi `!setup` lại ở nhóm chính hiện tại không dừng lịch.

`ALLOWED_GROUP_IDS` và `ALLOWED_USER_IDS` cũ không áp dụng trong chế độ nhóm chính này. Muốn hạn chế người điều khiển, hãy quản lý thành viên nhóm chính.

## Tên và ID nhóm

Gõ `!list` tại nhóm chính để lấy tên và ID nhóm mà tài khoản bot tham gia. Dùng ID đầy đủ, không dùng số thứ tự. Nếu Zalo không trả tên thì bot vẫn hiện ID. `!id` hiện ID nhóm đang nhắn và UID người nhắn.

## Gửi một lần

```text
!gui 123456789 | Chào mọi người
```

Thay `123456789` bằng ID từ `!list`. Tài khoản bot phải là thành viên có quyền nhắn ở nhóm đích.

## Lịch gửi lặp và thời gian nghỉ

```text
!tudong ID_NHOM | khoảng gửi | số lần mỗi đợt | nghỉ | nội dung
!tudong 123456789 | 30s | 5 | 10m | Nhớ uống nước nhé
```

Ví dụ trên: lần đầu sau 30 giây, các lần sau cách nhau 30 giây. Đủ 5 lần thì nghỉ 10 phút rồi gửi đợt mới, tiếp tục cho tới khi dừng/xóa lịch. Nghỉ thay khoảng chờ giữa hai đợt. Đặt nghỉ `0s` để luôn dùng khoảng gửi, không nghỉ thêm.

Đơn vị `s` giây, `m` phút, `h` giờ; khoảng gửi ít nhất 1 giây, mỗi giá trị tối đa 7 ngày. Nhập `90s` thay cho `1m30s`. Số lần mỗi đợt từ 1–1000. Mỗi lịch gửi vào một nhóm; tối đa 100 lịch đã lưu. Nội dung chữ dài 1–4000 ký tự, không bắt đầu bằng tiền tố lệnh để tránh tự gọi lệnh. Dấu `|` trong phần nội dung được giữ nguyên.

Bot trả mã như `L1` khi tạo lịch. Quản lý bằng:

```text
!lich
!dung L1
!dung all
!tieptuc L1
!xoa L1
```

`!tieptuc` bắt đầu đợt mới sau khoảng gửi. `!lich` hiển thị giờ Việt Nam. Bot lưu nhóm chính/lịch ở `data/control.json` (nội dung tin nhắn có trong file này). Giữ thư mục `data` khi cập nhật. Lịch còn chạy sẽ hoạt động lại khi bot kết nối sau restart, không gửi dồn những lần bỏ lỡ. Gửi lỗi thì lịch tự dừng và báo một lần ở nhóm chính; kiểm tra rồi dùng `!tieptuc`.

Độ chính xác tùy kết nối và host, không bảo đảm đúng tuyệt đối từng giây. Host tắt thì không gửi. Tin đã bắt đầu gửi có thể vẫn đến sau lệnh dừng. Nếu khởi động không thành công vì `control.json` hỏng, giữ bản sao file rồi kiểm tra/sửa file thay vì xóa `session.json`.

## Nhạc và trợ giúp

`!nhac tên bài` hoặc `!scl link SoundCloud`: voice kèm ảnh thông tin, tối đa 10 phút. Chỉ dùng trong nhóm chính. `!kiemtra` kiểm tra công cụ. `!help` giải thích đầy đủ tất cả lệnh và ví dụ ngay trong chat.

Không chia sẻ `.env`, `data/session.json` hay ảnh QR đăng nhập. Đây là bot dùng thư viện tài khoản cá nhân zca-js, không phải API Zalo chính thức.
