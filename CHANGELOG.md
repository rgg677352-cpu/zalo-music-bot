## 1.7.0 — 2026-10-24

- Sàng lọc5.520 cấu hình từ16 thuật toán kết hợp chỉ báo/regime,2biến thể riêng tài sản,5phiên và6gói TP/SL scalp.70 lựa chọn đóng băng trước test;10 scalp finalist chạy lại tick Exness, stress và delay15. Khung nhỏ giữ1tháng, H1/H4 khoảng9tháng.0bộ mới đủ điều kiện bật tự động;1bộH1 chỉ qua số học trong mẫu, chưa forward độc lập.
- Thử riêng TP gần, SL cấu trúc, dời hòa vốn có chi phí trên tín hiệu cũ. Không tự đổi TP/SL mặc định thành gói chưa đạt hoặc hứa TP sẽ chạm.
- Tích hợp thư viện nghiên cứu16thuật toán, catalog và kết quả theo mã/khung/phiên qua !indicators và !research BTC / !research ETH H1. Bộ rejected không tạo Entry hay tự đổi đăng ký. Vàng vẫn chưa livefeed hợp lệ.
- Chỉ tính các họ chỉ báo đang được chọn: tín hiệu giữ nguyên trên12 cửa sổ dữ liệu thật, benchmark khoảng2.8x nhanh hơn trong môi trường kiểm tra, không phải bảo đảm tốc độ mọi host.
- Tin setup gọn: mã/hướng/khung, Entry/TP/SL từng dòng, R:R/hold, hạn entry, Bid/Ask giờ phát, bộ và phiên, nhãn DEMO/nguồn. Bỏ dump vùng giá/link lặp. Hỏi nhiều khung không lặp mọi đoạn waiting, vẫn hiện lỗi nguồn.
- Đăng ký/cooldown/quote guard/dedup qua restart giữ nguyên. Không gửi Zalo thật hay cập nhật host Botkeep từ môi trường này.

## 1.6.5 — 2026-10-24

- Status từng chỉ giữ lần quét mới nhất: lỗi chặn setup bị trạng thái chờ ở nến sau che mất. Giữ thêm lần chặn gần nhất và tín hiệu thực sự quan sát trong phiên; phân biệt với “tín hiệu gần nhất” tính lại từ lịch sử. Hiện giờ khởi động bộ báo để nhận biết tín hiệu trước khi bot chạy.
- `!check BTC` / `!check ETH` kiểm tra trực tiếp nến M1, giá Bitget dùng quy đổi, Bid/Ask Exness, tuổi tick, HTTP và chênh đồng hồ. Không đợi chỉ báo có tín hiệu, không bật/tắt đăng ký, không tạo lệnh.
- Bot mặc định lấy snapshot HTTP hữu hạn từ cùng endpoint Exness công khai mà web dùng, dự phòng SSE cùng dịch vụ. Chế độ đọc trực tiếp vẫn hỗ trợ cho tích hợp rõ ràng. Không dùng Entry sàn crypto làm dự phòng, không bỏ giới hạn5giây hoặc thời hạn setup.
- Giữ mã HTTP/tuổi tick/lỗi giờ trong lý do nguồn giá. Tôn trọng cả429/403/451 được máy chủ chuyển tiếp báo lại, không đổi đường để bỏ qua hạn chế.
- 101 kiểm tra tự động qua; đã kiểm tra nến/giá thật BTC/ETH qua HTTP. Chưa kết luận nguyên nhân mạng cụ thể trên Botkeep của người dùng, chưa gửi Zalo thật hoặc tự cập nhật host.

## 1.6.4 — 2026-10-24

- Thêm `!status`: phiên bản thật đang chạy, đăng ký của nhóm hiện tại, vòng quét có chạy hay không, lần quét/nến/chỉ báo gần nhất và lý do chưa gửi. Phân biệt Zalo đã xác nhận với gửi chưa rõ kết quả. Không cần setup và không tự bật nhóm mới.
- Nguồn lỗi không còn bị bỏ qua im lặng: lưu trạng thái chẩn đoán, log khi lỗi đổi/hồi phục; không biến lỗi giá thành trạng thái chờ tín hiệu.
- Quét BTC/ETH độc lập với giới hạn song song, gửi nhiều nhóm có giới hạn song song; một nguồn/nhóm chậm không giữ toàn bộ tín hiệu. Dùng chung request đang tải để tránh nhiều lệnh gọi trùng nguồn.
- Chỉ đánh dấu setup đã xử lý ngay trước khi gửi, sau khi tất cả kết quả hỏi trực tiếp đã xong và kiểm tra lại độ mới. Không tiêu thụ một setup vì nó tải xong sớm nhưng đã quá hạn trong lúc đợi mã khác. `!off` trong khi đang tải chặn setup trả muộn.
- Exness SSE bỏ qua tick cũ ban đầu và có HTTP snapshot dự phòng cùng nguồn với giới hạn thời gian/dung lượng. Tôn trọng429/403/451; không đổi sang giá Entry sàn khác.
- 91 kiểm tra tự động qua; chạy theo dõi giá thật với hàm gửi Zalo giả lập. Chưa cập nhật host Botkeep hoặc xác nhận gửi trên Zalo thật. Không đổi bộ chỉ báo hay sửa kết quả kiểm chứng để ép thêm lệnh.

## 1.6.3 — 2026-10-24

- Bỏ fallback giá Entry Bitget/USDT của scalp và chuyển cả M15–H4 sang giá lệnh Exness công khai. Thiếu giá Exness mới thì dừng setup, không thay bằng giá thị trường khác.
- BUY vào Ask, SELL vào Bid; quy đổi khoảng ATR/rủi ro theo hai nguồn cùng thời điểm, giữ R:R và hạn entry. Giá Exness công khai vẫn có thể khác tài khoản; chỉ báo dùng nến Bitget tham chiếu.
- Tin ghi rõ BTCUSD/ETHUSD, loại MARKET tham chiếu, Bid/Ask và giờ phát để phân biệt giá lúc báo với giá hiện tại hoặc một lệnh chờ Limit.
- Thêm kiểm tra khung lớn chuyển giá đúng Bid/Ask, source stale/missing/wrong, expiry, và không rò Entry Bitget khi Exness lỗi. Chưa có cầu nối feed tài khoản MT5, chưa cập nhật host Botkeep.

## 1.6.2 — 2026-10-24

- !scalp bật thêm scalp demo BTC/ETH M1/M5, trả setup hiện còn hiệu lực và tự báo tín hiệu mới; !scalp BTC/ETH chọn riêng; !off scalp hoặc !off scalp BTC tắt riêng. Không ảnh hưởng khung lớn hoặc nhóm khác.
- Dùng cùng công thức/cấu hình 480 ứng viên đã nghiên cứu trên web, theo phiên, giữ tối đa 1–3 phút; không sửa kết quả kiểm chứng.
- Ưu tiên giá Exness công khai cho Entry/TP/SL và quy đổi ATR từ cùng thời điểm; dự phòng Bitget/USDT ghi rõ nguồn. Giá nguồn công khai có thể lệch tài khoản.
- Vòng scalp 10 giây độc lập vòng HTF 30 giây, lưu tín hiệu/cấu hình theo nến mới, chống trùng qua restart; bỏ setup hết hạn hoặc quote trễ.
- Không cần !setup, không trần số nhóm; giữ phiên Zalo/lịch nhạc/PR. Chưa cập nhật host Botkeep hoặc gửi tin Zalo thật.

## 1.6.1 — 2026-10-24

- !on mặc định tự gửi setup DEMO BTC/ETH từ bộ chọn trong nghiên cứu, kể cả chưa đạt kiểm chứng; không sửa kết quả test hay cờ accepted. Tin có nhãn DEMO · CHƯA ĐẠT KIỂM CHỨNG.
- Bỏ nhầm trạng thái nến trễ sau2phút trên H1/H4; chờ tín hiệu/entry hết hạn được báo đúng trạng thái, không gửi setup cũ.
- Kiểm tra timestamp báo giá lúc gửi, vẫn chống trùng và lưu đăng ký qua restart; vàng thiếu nguồn live vẫn báo chưa sẵn sàng.
- Hỏi setup nhiều khung đọc dữ liệu song song, kiểm tra độ mới trước khi gửi.
- Kiểm tra toàn luồng provider mặc định → tín hiệu nến lịch sử thật → thông báo Zalo giả lập, với accepted=false. Chưa gửi tin Zalo thật hoặc cập nhật host Botkeep.

## 1.6.0 — 2026-10-24

- Mọi nhóm dùng ngay, bỏ yêu cầu setup cho cả lệnh cũ; bỏ trần 100 lịch. Setup cũ không dừng lịch/nhạc.
- Thêm !on/!BTC/!ETH/!XAUU/!off theo nhóm và khung M15/M30/H1/H4; lưu đăng ký, chống trùng qua restart, ngắt kết nối thì dừng.
- Engine chỉ báo dùng chung web/bot, cấu hình riêng mỗi tài sản,288cấu hình được sàng lọc. Chưa có bộ đủ tiêu chí; không phát lệnh từ bộ chưa đạt.
- Giữ phiên Zalo, lịch cũ và lịch sử nhạc. Sửa lockfile có bản string_decoder 1.5.0 không tồn tại để npm cài được.
- Chưa triển khai host Botkeep hoặc test gửi tin Zalo thật.

# 1.5.0

- Thêm `!scl randoom`, `!scl random`, `?scl random`: lấy bảng most-played Apple Music VN/Mỹ/Anh/Hàn, rồi tìm bản SoundCloud phù hợp.
- Cache 6 giờ, dự phòng tối đa 48 giờ khi nguồn lỗi, từ chối bảng quá cũ; không dùng danh sách cố định thay thế.
- Lọc preview dưới 90 giây, kết quả nhầm tên/nghệ sĩ, remix/cover/mashup không yêu cầu. Không bảo đảm mọi bài đều có bản tải được.
- Lưu 80 lượt random gần nhất theo nhóm, giữ qua restart; không phát lại chỉ vì nguồn thiếu bài mới.
- Sửa nhận tiền tố ! khi cấu hình đang là ?; chặn cả hai tiền tố trong nội dung gửi tự động.
- Sửa chống lặp lệnh random 30 giây khiến yêu cầu mới bị bỏ nhầm; vẫn giữ cooldown 10 giây/người.
- Không chờ nguồn quốc tế tùy chọn bị lỗi khi đã có đủ cache VN và một nguồn quốc tế.
- 53 kiểm tra đã qua, doctor đạt; tải và chuyển AAC thực tế thành công bài VN và quốc tế. Chưa kiểm thử gửi trên tài khoản Zalo người dùng.

# 1.4.0

- Thêm `?pr ID | nội dung | nội dung 2`: luân phiên một nội dung/lượt, mặc định mỗi 10 phút, lần đầu sau 10 phút.
- Gọi lại PR cho cùng nhóm cập nhật lịch hiện tại, giữ ID và đặt lại chu kỳ; không tạo lịch PR trùng.
- Sửa lỗi kết quả gửi của lịch cũ có thể dừng nhầm lịch PR vừa cập nhật.
- Dấu `?` dùng được dù `.env` vẫn đặt tiền tố khác; giữ lệnh và dữ liệu cũ.
- Setup sai tài khoản và help trước setup có hướng dẫn, giới hạn tin nhắc lặp.
- Help viết lại theo luồng đơn giản; không cần nhập chu kỳ khi tạo PR.
- 42 kiểm tra đã qua. Chưa kiểm thử trực tiếp trên Zalo/Botkeep của người dùng.

# 1.3.0

- Sửa bỏ nhầm các lệnh không có msgId; chống sự kiện trùng dựa trên nhóm, người gửi và mã tin.
- Hủy yêu cầu nhạc đang tải/xếp hàng và phản hồi danh sách đang chờ khi đổi nhóm chính.
- Ngừng các lượt gửi tiếp theo trong vòng lịch đang chạy khi mất kết nối; tránh callback cũ tiếp tục gửi sau reconnect.
- Giới hạn chờ SDK Zalo 30 giây; lịch lỗi tự dừng và không thử lại khi không rõ kết quả.
- Kiểm tra chặt dữ liệu lịch: mã trùng, số đếm, chu kỳ, vị trí câu, giới hạn kích thước. Giữ tương thích lịch 1.2.0/1.2.1.
- Lệnh `!list [trang]`, `!lich [trang]`, `!lich L1`; giới hạn phản hồi xem lặp quá nhanh.
- Phản hồi có khoảng cách rõ, thời gian đọc bằng giây/phút/giờ. Cập nhật help đầy đủ.
- Bỏ các bộ câu tạo sẵn; `@` trong nội dung được gửi nguyên văn. Lịch cũ giữ nguyên dữ liệu.
- Không xóa phiên đã lưu chỉ vì lần khôi phục đăng nhập thất bại; chỉ ghi đè sau khi đăng nhập QR thành công.
- Kiểm tra công cụ nhạc chạy nền; tạo ảnh song song với upload audio để voice không phải chờ ảnh.
- Sửa xử lý tiêu đề ảnh quá dài và thời lượng không hữu hạn.

Đã chạy 37 kiểm tra tự động, doctor tạo PNG/công cụ đạt, npm audit không có advisory tại thời điểm kiểm tra. Chưa kiểm thử gửi thực tế bằng tài khoản Zalo của người dùng. Thời gian gửi phụ thuộc host/mạng; tin đã bắt đầu gửi có thể vẫn đến sau khi dừng.
