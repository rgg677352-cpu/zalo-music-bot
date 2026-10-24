# Zalo Bot 1.7.0

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Bot có mặt trong nhóm là mọi thành viên dùng được các lệnh cũ và mới, không cần `!setup` hay `?setup`; không giới hạn số nhóm. Giữ nguyên phiên đăng nhập Zalo, lịch gửi và lịch sử nhạc khi cập nhật. Có nhạc SoundCloud dạng voice kèm ảnh. `!scl randoom` / `!scl random` chọn bài từ bảng Apple Music VN/quốc tế, tìm bản SoundCloud phù hợp và nhớ 80 lượt gần đây để tránh lặp.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.


Thông báo setup demo: `!on`, `!BTC`, `!ETH`, `!XAUU`, `!BTC H1`, `!off BTC`, `!off`. Bật/tắt theo từng nhóm; không tự bật ở nhóm chưa yêu cầu. Bản 1.7.0 mặc định tự báo setup DEMO BTC/ETH khi có tín hiệu mới, kèm Entry/TP/SL và thời hạn; chống trùng qua restart. Bộ chưa đạt kiểm chứng vẫn được gửi, ghi rõ “DEMO · CHƯA ĐẠT KIỂM CHỨNG”. Kết quả test 0/288 bộ đạt giữ nguyên, không biến thành tuyên bố có lợi nhuận. Chỉ nhận nến đóng và Bid/Ask mới; setup hết hạn không gửi bù. Vàng chưa có nguồn live cùng nguồn đã kiểm tra. Không gửi lệnh đến sàn.

M15/M30 test 1 tháng, H1/H4 test khoảng 9 tháng. Engine và kết quả được đóng cùng bản ZIP, cùng công thức với web. Mã tích hợp và luồng gửi đã test bằng API Zalo giả lập; chưa đăng nhập hay gửi tin trên tài khoản của bạn. Tải ZIP mới lên Botkeep, giữ `data/` và `.env`, ghi đè code rồi restart một lần. Không cần gọi setup sau đó.


Scalp: `!scalp` bật thêm scalp demo BTC/ETH M1/M5 trong nhóm hiện tại và gửi setup còn hiệu lực; sau đó tự kiểm tra mỗi 10 giây. `!scalp BTC` / `!scalp ETH` chọn riêng. `!off scalp` tắt scalp, giữ M15–H4; `!off scalp BTC` tắt scalp BTC. `!off BTC` tắt cả scalp và khung lớn BTC. Không cần !on trước và không cần !setup. Đăng ký giữ qua restart.

Scalp dùng cùng công thức/cấu hình theo phiên với web, giữ tối đa 1–3 phút, entry hiệu lực 45 giây sau khi có nến đóng. Nến Bitget M1 thật, ATR M5 từ nhóm đủ 5 nến; ưu tiên Bid/Ask Exness công khai để tính Entry/TP/SL và quy đổi ATR theo tỷ lệ giá cùng thời điểm. Thiếu giá Exness mới thì tạm dừng báo setup; không dùng Bitget/USDT làm giá Entry. Giá công khai không bảo đảm trùng tài khoản Exness; đối chiếu giá app trước khi đặt. 0/480 cấu hình scalp vượt đầy đủ kiểm tra, nên mọi tin vẫn là DEMO · CHƯA ĐẠT KIỂM CHỨNG.

Scalp chạy vòng10giây riêng với khung lớn 30 giây, dùng bộ nhớ đệm chỉ báo đến nến M1 mới; không backtest/huấn luyện trên host. Không gửi setup cũ hoặc bị trễ giá. Chưa cập nhật host Botkeep hoặc gửi tin Zalo thật từ môi trường này.


Giá lệnh bản1.7.0: cả SCALP và M15–H4 chỉ lấy Entry BUY theo Ask, SELL theo Bid của Exness công khai; SL/TP tính lại theo độ biến động tham chiếu được quy đổi cùng thời điểm. Không dùng giá Bitget spot/perp để thay thế Entry khi Exness lỗi. Tin ghi BTCUSD/ETHUSD, loại MARKET tham chiếu, Bid/Ask lúc phát, giờ phát và hạn entry. Chỉ báo vẫn dùng nến Bitget tham chiếu; đây CHƯA phải feed tài khoản MT5.

Để khớp đúng nguồn tài khoản, cần kết nối chính tài khoản bằng cầu nối terminal MT5 chỉ đọc hoặc API chính thức nếu là tài khoản Exness được hỗ trợ. Exness API hiện không hỗ trợ tài khoản MetaTrader tiêu chuẩn. Tên BTC trong app không đủ xác định mã/suffix. Không gửi mật khẩu/khóa bí mật vào chat; thông tin kết nối phải cấu hình trực tiếp trên máy chủ của chủ tài khoản.

## Kiểm tra bot im lặng — 1.7.0

Gõ `!status` ngay trong nhóm đã bật: phải thấy **Bot 1.7.0**, **BÁO TRADE ĐANG CHẠY** và `BTC SCALP · quét ...s trước` sau `!scalp BTC`. Nếu không phản hồi `!status` hoặc phiên bản khác thì host chưa chạy code mới. Upload ZIP vào Files chưa đủ: phải Extract/Unarchive ghi đè đúng thư mục chứa `index.mjs`, rồi restart; giữ `data/` và `.env`.

“Đang chờ tín hiệu” là kết quả tại lần quét, không phải cam kết sẽ có setup mỗi10giây. Status hiển thị nến, bộ chỉ báo, số điều kiện và tín hiệu gần nhất để thấy bot có tiếp tục quét. Lỗi nguồn hoặc Entry quá cũ được ghi riêng; lỗi gửi Zalo hiện “chưa được xác nhận”, không báo nhầm đã gửi. BTC/ETH và các nhóm tiến hành độc lập có giới hạn song song. SSE Exness lỗi/bị đệm có snapshot HTTP cùng Exness dự phòng, không dùng giá Entry Bitget.

## Tín hiệu có trong lịch sử nhưng nhóm không nhận — 1.7.0

Dùng `!check BTC` và `!check ETH` để thử giá ngay trên chính host. Mỗi nguồn có OK/LỖI, tuổi tick, đường HTTP/SSE và lỗiHTTP nếu có. Không tạo setup giả để thử gửi. `!status` hiển thị giờ khởi động, tín hiệu quan sát trong phiên và lần chặn gần nhất; thông tin này giữ trong bộ nhớ đến restart, đăng ký/chống trùng vẫn lưu ở data như cũ. Giá lệnh mặc định đi qua cùng endpoint Exness công khai của web; nến Bitget tiếp tục là tham chiếu.

Bot báo “đang chạy” chỉ xác nhận vòng quét, không xác nhận nguồn giá luôn tốt hay Zalo đã nhận một setup. “Tín hiệu gần nhất (lịch sử)” cũng không chứng minh bot đã online trong cửa sổ entry đó. Cập nhật1.7.0 rồi gửi kết quả `!check BTC` nếu nhóm tiếp tục không nhận; không cần xóa data/session hoặc bật setup.

## Nghiên cứu và thông báo gọn — 1.7.0

`!indicators` xem catalog; `!research BTC` xem scalp của phiên hiện tại; `!research ETH H1` xem khung lớn. Catalog gồm cả hàm phụ/mẫu nến, không phải mọi mục đều là chiến lược độc lập. Thư viện16 thuật toán đã được đưa vào bot để tra cứu/tính điều kiện nghiên cứu, nhưng0profile mới đạt nên chưa tự thay bộ demo cũ. Gửi setup hiện tại vẫn dùng cấu hình riêng BTC/ETH theo5phiên đã có. Không bật vàng khi thiếu feed.

Báo cáo đầy đủ ở assets/optimizer-report.md:5.520 cấu hình,70finalists; dữ liệu đã khảo sát nhiều lần nên chưa phải OOS độc lập. BộH1/VWAP phiênÁ chỉ qua số học trong mẫu, chưa được gọi là kiểm chứng. TP gần tăng số lần chạm trong một số phép thử nhưng kỳ vọng vẫn âm sau chi phí. Không tự thay TP/SL chỉ để nhìn dễ chạm, cũng không quản lý lệnh thật trên tài khoản.

Tin mới bỏ link/đoạn lặp, giữ Entry/TP/SL tách dòng và hạn vào/nguồn/nhãn chưa đạt. !status và !check BTC vẫn dùng để chẩn đoán, không nhét mọi chi tiết lỗi vào từng tin setup. Giữ data/ và .env khi cập nhật ZIP.
