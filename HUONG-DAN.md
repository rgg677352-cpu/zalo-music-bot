# Bot Zalo 1.4.0

## Cập nhật Botkeep

Stop bot → upload `zalo-music-bot-1.4.0.zip` → Extract/Unarchive và ghi đè toàn bộ code ở thư mục chính → Start. Giữ nguyên `data` và `.env` riêng của bạn. Console phải hiện `1.4.0`. ZIP chỉ nằm trong Files chưa có nghĩa là đã cập nhật.

Không có dependency mới so với 1.3.0. Nếu cần cài lại thì dùng quy trình `npm ci` của host. Console chạy bot không phải Terminal để nhập lệnh shell.

## Dùng nhanh

1. Dùng chính tài khoản Zalo đã đăng nhập bot nhắn `?setup` trong nhóm điều khiển. Mọi thành viên nhóm đó đều được dùng lệnh. Nhóm khác không điều khiển được.
2. Nhắn `?list` để lấy tên/ID nhóm. `?list 2` xem trang tiếp. Tài khoản bot phải ở trong nhóm đích và có quyền nhắn.
3. Nhắn một trong hai dạng:

```text
?pr 123456789 | Nội dung muốn gửi
?pr 123456789 | Nội dung một | Nội dung hai | Nội dung ba
```

Thay `123456789` bằng ID thật từ `?list`. Mỗi 10 phút bot gửi **một nội dung**. Có nhiều nội dung thì gửi lần lượt, hết mới quay lại đầu. Lần đầu sau 10 phút. Không gửi cả danh sách cùng lúc.

Gọi `?pr` lại cho cùng nhóm sẽ cập nhật lịch PR đó, giữ mã lịch, bắt đầu lại từ câu đầu và chờ 10 phút từ lúc cập nhật. Không tạo thêm lịch PR trùng cho cùng nhóm. Nếu lượt cũ đã bắt đầu gửi, tin cũ đó vẫn có thể đến.

Mỗi dấu `|` tách một nội dung. Không dùng `||` và không để đoạn trống. Tối đa 50 nội dung, mỗi nội dung 1–4000 ký tự, tổng đầu vào 20000 ký tự. Nội dung không bắt đầu bằng tiền tố lệnh (mặc định `?`; có kiểm tra cả tiền tố riêng trong `.env`) để tránh bot tự gọi lệnh. Bot gửi đúng chữ bạn nhập, không thêm lời dẫn hay câu tự tạo.

## Dừng và xem lịch

```text
?lich
?lich L1
?dung L1
?dung all
?tieptuc L1
?xoa L1
?help
```

Bot trả mã như `L1` sau khi tạo lịch. `?dung` tạm dừng, `?tieptuc` chờ 10 phút rồi tiếp tục ở câu kế (đối với lịch PR), `?xoa` xóa hẳn. `?lich 2` xem trang tiếp.

Đổi nhóm chính bằng `?setup` sẽ dừng tất cả lịch cũ. Sai tài khoản setup sẽ được hướng dẫn thay vì im lặng. `?help` trước khi chọn nhóm chính cũng có chỉ dẫn.

## Dữ liệu cũ và mất kết nối

Dấu `?` hoạt động ngay cả khi `.env` cũ còn `PREFIX=!`. Lệnh với tiền tố riêng trong `.env` vẫn dùng được. Các lệnh `gui`, `tudong`, `id`, `mau` cũ vẫn được giữ nhưng không cần dùng để tạo lịch PR.

Lịch cũ giữ nguyên chu kỳ đã đặt; `?pr` chỉ cập nhật lịch PR cùng nhóm, không xóa lịch `tudong` cũ. Nếu chuyển từ lịch cũ sang PR, dùng `?lich` rồi dừng/xóa lịch cũ để tránh hai lịch cùng gửi vào một nhóm.

Nhóm chính/lịch được lưu ở `data/control.json`. Giữ thư mục này khi cập nhật. Bot tự tiếp tục sau restart/kết nối lại, không gửi bù dồn khi host tắt. Mỗi yêu cầu Zalo có giới hạn chờ 30 giây. Gửi lỗi hoặc không rõ kết quả thì lịch dừng và báo một lần, không tự gửi lại. Vị trí câu đã được ghi trước khi gửi nên lượt không rõ kết quả có thể bị bỏ qua.

Một tin đã bắt đầu gửi có thể vẫn đến sau khi dừng/hết chờ. Host phải chạy và có kết nối thì lịch mới hoạt động. Thời gian thực tế phụ thuộc host và mạng.

Nếu dữ liệu lịch hỏng (`CONTROL_STATE_INVALID`), giữ bản sao rồi kiểm tra/sửa file, không xóa phiên đăng nhập Zalo.

## Nhạc

`?nhac tên bài` hoặc `?scl link SoundCloud`: voice kèm ảnh. `?kiemtra`: kiểm tra công cụ nhạc. Mặc định bài tối đa 10 phút. `MAX_DURATION_SECONDS` cho phép 30–600 giây.

## Kiểm tra

`npm test`: 42 kiểm tra. `npm run doctor`: công cụ nhạc và tạo PNG. Đã kiểm tra xử lý lệnh, lịch, lỗi mạng giả lập và tương thích dữ liệu cũ; chưa gửi thử trực tiếp trên tài khoản Zalo/Botkeep của bạn.

Không chia sẻ `.env`, `data/session.json` hay QR. Bot dùng thư viện tài khoản Zalo cá nhân zca-js.
