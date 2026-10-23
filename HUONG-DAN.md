# Bot Zalo 1.3.0

## Cập nhật trên Botkeep

1. Stop bot. Giữ nguyên thư mục `data` và `.env` riêng của bạn.
2. Upload `zalo-music-bot-1.3.0.zip`. Chọn Extract/Unarchive và ghi đè **toàn bộ code ở thư mục chính**. Cạnh `package.json` phải có `index.mjs`, `src`, `scripts`.
3. Chỉ upload ZIP chưa cập nhật bot. Console đang chạy bot không phải Terminal để nhập lệnh shell.
4. Start. Console phải hiện `Zalo Music Bot 1.3.0`.
5. Nếu chưa cài dependency thì chạy quy trình cài `npm ci` của host. Bản này không thêm dependency so với 1.1.0–1.2.1.

## Bắt đầu

Dùng chính tài khoản Zalo đăng nhập bot nhắn `!setup` trong nhóm chính. Mọi thành viên nhóm này đều điều khiển được. Nhóm khác không nhận lệnh, kể cả nhạc.

Chỉ tài khoản đăng nhập bot được chọn/đổi nhóm chính. Đổi nhóm chính sẽ dừng các lịch cũ và hủy yêu cầu nhạc đang chờ. Tin đã bắt đầu gửi có thể vẫn đến sau khi đổi nhóm/dừng lịch. Dùng `!help` để đọc hướng dẫn ngay trong Zalo.

Hai biến cũ `ALLOWED_GROUP_IDS` và `ALLOWED_USER_IDS` không áp dụng ở chế độ nhóm chính. Hãy quản lý thành viên nhóm chính nếu cần giới hạn quyền điều khiển.

## Chọn nhóm và gửi một lần

```text
!list
!list 2
!id
!gui 123456789 | Chào mọi người
```

`!list` hiện tên và ID, 8 nhóm/trang. Dùng ID đầy đủ, không dùng số thứ tự. Bot chỉ lấy thông tin của trang đang xem. Nếu Zalo không trả tên thì vẫn hiện ID.

Thay `123456789` bằng ID thật. Tài khoản bot phải tham gia nhóm đích và được phép nhắn. Bot gửi nguyên nội dung, không thêm chữ ký, quảng cáo hay lời dẫn.

## Lịch gửi với nội dung tự soạn

```text
!tudong ID_NHOM | khoảng gửi | số lượt/đợt | nghỉ | nội dung
!tudong 123456789 | 30m | 4 | 2h | Câu một || Câu hai || Câu ba
```

Ví dụ: sau 30 phút gửi câu một, thêm 30 phút gửi câu hai, rồi câu ba, rồi quay lại câu một. Đủ 4 lượt thì nghỉ 2 giờ rồi gửi câu hai. Vị trí câu được giữ qua lần nghỉ, restart và lệnh tiếp tục.

- `s` giây, `m` phút, `h` giờ. Dùng `90s` thay `1m30s`.
- Khoảng gửi ít nhất 1 giây; mỗi khoảng tối đa 7 ngày. Giờ gửi phụ thuộc mạng và host.
- Nghỉ thay khoảng chờ giữa hai đợt. `0s` nghĩa là luôn dùng khoảng gửi.
- 1–1000 lượt/đợt; tối đa 100 lịch, mỗi lịch một nhóm đích.
- Tối đa 50 câu/lịch, mỗi câu 1–4000 ký tự, tổng đầu vào 20000 ký tự.
- Hai dấu `||` tách câu. Một dấu `|` trong nội dung được giữ. Không để câu trống giữa dấu tách.
- Nội dung bắt đầu bằng `@` được gửi nguyên văn, không còn tra bộ mẫu. Đây chỉ là chữ, không tự tạo mention thành viên.
- Không bắt đầu câu bằng tiền tố lệnh hiện tại (mặc định `!`) để tránh bot tự gọi lệnh.

Bot chỉ dùng nội dung bạn soạn. Đã bỏ các bộ câu tích cực/nhắc uống nước tạo sẵn. Lịch cũ giữ nguyên nội dung đã lưu; nếu từng dùng bộ mẫu, hãy xóa lịch đó và tạo lại bằng câu của bạn.

## Quản lý lịch

```text
!lich
!lich 2
!lich L1
!dung L1
!dung all
!tieptuc L1
!xoa L1
```

Danh sách hiện 5 lịch/trang. `!lich L1` xem trạng thái, thời gian theo giờ Việt Nam và câu tiếp theo (xem trước tối đa 2400 ký tự). `!tieptuc` bắt đầu đợt mới sau khoảng gửi, giữ vị trí câu. Muốn sửa nội dung/chu kỳ thì xóa lịch và tạo lại.

Bot lưu nhóm chính và lịch trong `data/control.json`, ghi file mới rồi thay thế file cũ. Giữ `data` khi cập nhật. Dữ liệu lỗi sẽ chặn khởi động với mã `CONTROL_STATE_INVALID`, không tự xóa dữ liệu. Giữ bản sao rồi kiểm tra/sửa file; không cần xóa phiên đăng nhập Zalo.

Khi host tắt/mất kết nối, bot không gửi. Khi kết nối lại, lịch tiếp tục mà không gửi bù dồn. Mỗi yêu cầu Zalo có giới hạn chờ 30 giây. Gửi lỗi hoặc không rõ kết quả thì lịch dừng, báo một lần; không tự gửi lại để tránh trùng. Vị trí câu và số lượt được ghi trước khi gửi, nên lượt không rõ kết quả có thể bị bỏ qua. Xem `!lich L1` rồi quyết định tiếp tục. Một tin đã gửi lên mạng vẫn có thể đến sau khi hết chờ hoặc dừng.

Lệnh xem trợ giúp/danh sách lặp quá nhanh trong 1,5 giây được bỏ qua để tránh lấp chat. Lệnh dừng không bị giới hạn này.

## Nhạc

`!nhac tên bài` hoặc `!scl link SoundCloud`: voice kèm ảnh thông tin, chỉ tại nhóm chính. Mặc định tối đa 10 phút; `MAX_DURATION_SECONDS` trong `.env` cho phép 30–600 giây.

Bot tải ảnh bìa song song với tải âm thanh lên Zalo, gửi voice trước rồi đến ảnh. Nếu ảnh lỗi thì chỉ thêm một dòng tên bài. Không nhắn trạng thái đang tải/chờ. Một bài chạy và tối đa hai bài đợi. Yêu cầu trùng trong 30 giây hoặc cùng người gọi trong 10 giây được bỏ qua.

`!kiemtra` kiểm tra công cụ nhạc và SoundCloud. Công cụ nhạc được kiểm tra nền sau khi bắt đầu kết nối, không chặn đăng nhập/lệnh chữ.

## Kiểm tra và giới hạn

- `npm test`: kiểm tra tự động (37 ca ở bản này).
- `npm run doctor`: kiểm tra công cụ và tạo PNG.
- `npm audit --omit=dev`: kiểm tra advisory dependency.
- Đã kiểm tra lịch, quyền nhóm, gửi trùng, lỗi mạng giả lập và tạo ảnh; chưa kiểm thử trên tài khoản Zalo/Botkeep của bạn.

Không chia sẻ `.env`, `data/session.json`, nội dung `control.json` hay QR đăng nhập. Bot dùng thư viện tài khoản cá nhân zca-js, không phải API Zalo chính thức.
