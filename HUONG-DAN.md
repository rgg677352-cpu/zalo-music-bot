# Bot Zalo 1.7.3

Mới: tự dọn thư mục nhạc/giải nén mồ côi lúc khởi động và mỗi 10 phút; thư mục giải nén riêng được xóa sau từng lần chạy. File đang tải/gửi, phiên đăng nhập và cấu hình được giữ. Gõ `!storage` xem dung lượng, `!clean` dọn ngay; không cần `!setup`. Không xóa tay `data/` hoặc `.env`. Bản 1.7.3 dọn thêm cache tải FFmpeg trong `ffmpeg-static-nodejs`, sau khi thử FFmpeg đã cài. Giữ binary đang dùng trong `node_modules`; bỏ qua symlink, file cache đang mở hoặc mới thay đổi dưới một phút. Nếu chưa dọn được, `!clean`/`!storage` hiện lý do; thử lại khi bộ cài đã xong. Không dọn cache npm. Phản hồi host của bạn cho thấy cache FFmpeg chiếm 560,7 MB.

Setup tự động mới M15/M30/H4 tag cả nhóm **@All**; H1/scalp, `!status` và hỏi setup thủ công không tag. Nhóm cần đã bật khung tương ứng. Không gửi bù tin cũ. Kiểm tra tích hợp hiện dùng API Zalo giả lập, chưa thử gửi nhóm thật.

`!research BTC M15` hoặc `!research ETH H4` xem kết quả đúng bộ khung lớn đang dùng. 0/288 bộ đạt tiêu chuẩn; chưa xác minh riêng từng phiên/khớp lệnh Exness. Thuật toán và TP/SL chưa đổi; setup hiện vẫn có nhãn DEMO chưa đạt kiểm chứng.

## Cập nhật Botkeep

Stop bot → upload `zalo-music-bot-1.7.3.zip` → Extract/Unarchive và ghi đè toàn bộ code ở thư mục chính → Start. Giữ nguyên `data` và `.env` riêng của bạn. Console phải hiện `1.7.3`. ZIP chỉ nằm trong Files chưa có nghĩa là đã cập nhật.

Không có dependency mới so với 1.3.0. Nếu cần cài lại thì dùng quy trình `npm ci` của host. Console chạy bot không phải Terminal để nhập lệnh shell.

## Dùng nhanh

1. Bot đã tham gia nhóm là mọi thành viên dùng được lệnh ngay, không cần `!setup`/`?setup`. Không có nhóm chính và không giới hạn số nhóm.
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

`?setup`/`!setup` cũ chỉ trả lời rằng không cần setup; không đổi quyền, không dừng lịch hoặc hủy nhạc ở nhóm khác.

## Dữ liệu cũ và mất kết nối

Dấu `?` hoạt động ngay cả khi `.env` cũ còn `PREFIX=!`. Lệnh với tiền tố riêng trong `.env` vẫn dùng được. Các lệnh `gui`, `tudong`, `id`, `mau` cũ vẫn được giữ nhưng không cần dùng để tạo lịch PR.

Lịch cũ giữ nguyên chu kỳ đã đặt; `?pr` chỉ cập nhật lịch PR cùng nhóm, không xóa lịch `tudong` cũ. Nếu chuyển từ lịch cũ sang PR, dùng `?lich` rồi dừng/xóa lịch cũ để tránh hai lịch cùng gửi vào một nhóm.

Nhóm chính/lịch được lưu ở `data/control.json`. Giữ thư mục này khi cập nhật. Bot tự tiếp tục sau restart/kết nối lại, không gửi bù dồn khi host tắt. Mỗi yêu cầu Zalo có giới hạn chờ 30 giây. Gửi lỗi hoặc không rõ kết quả thì lịch dừng và báo một lần, không tự gửi lại. Vị trí câu đã được ghi trước khi gửi nên lượt không rõ kết quả có thể bị bỏ qua.

Một tin đã bắt đầu gửi có thể vẫn đến sau khi dừng/hết chờ. Host phải chạy và có kết nối thì lịch mới hoạt động. Thời gian thực tế phụ thuộc host và mạng.

Nếu dữ liệu lịch hỏng (`CONTROL_STATE_INVALID`), giữ bản sao rồi kiểm tra/sửa file, không xóa phiên đăng nhập Zalo.

## Nhạc

`?nhac tên bài` hoặc `?scl link SoundCloud`: voice kèm ảnh. `?kiemtra`: kiểm tra công cụ nhạc. Mặc định bài tối đa 10 phút. `MAX_DURATION_SECONDS` cho phép 30–600 giây.

## Kiểm tra

`npm test`: 53 kiểm tra. `npm run doctor`: công cụ nhạc và tạo PNG. Đã kiểm tra xử lý lệnh, lịch, lỗi mạng giả lập và tương thích dữ liệu cũ; chưa gửi thử trực tiếp trên tài khoản Zalo/Botkeep của bạn.

Không chia sẻ `.env`, `data/session.json` hay QR. Bot dùng thư viện tài khoản Zalo cá nhân zca-js.


## Nhạc thịnh hành ngẫu nhiên (1.7.3)

```text
!scl randoom
!scl random
?scl random
```

Dùng trong nhóm điều khiển đã chọn. Cả `!` và `?` luôn được nhận; tiền tố riêng trong `.env` vẫn dùng được. `randoom` và `random` cùng một chức năng, không bị tìm thành tên bài. Hai dấu này cũng được chặn ở đầu nội dung PR để tránh bot tự gọi lệnh.

Bot lấy bảng most-played Apple Music Việt Nam và các thị trường quốc tế Mỹ/Anh/Hàn Quốc, ưu tiên luân phiên hai nguồn VN/quốc tế khi tìm được bản phù hợp. Đây là bảng các bài đang được nghe nhiều, **không phải danh sách bài chỉ mới phát hành trong vài ngày gần đây**, và cũng không phải bảng xếp hạng của SoundCloud. Bài hay phụ thuộc gu nghe của bạn.

- Nguồn: https://rss.marketingtools.apple.com/api/v2/vn/music/most-played/100/songs.json (đổi `vn` thành `us`, `gb`, `kr` cho thị trường khác).
- Cache 6 giờ; khi nguồn lỗi có thể dùng cache còn trong 48 giờ. Từ chối feed có ngày cập nhật quá 7 ngày hoặc không hợp lệ. Không thay bằng danh sách nhạc cố định khi nguồn lỗi.
- Tìm tối đa ba kết quả SoundCloud cho mỗi bài được chọn, đối chiếu tên bài/nghệ sĩ. Bỏ bản dưới 90 giây, quá giới hạn thời lượng, remix/cover/mashup không yêu cầu. Không bảo đảm mọi bài trong bảng đều có bản phù hợp để tải trên SoundCloud.
- Ghi nhớ 80 lượt random gần nhất cho mỗi nhóm, cả tên bài/nghệ sĩ và URL SoundCloud, ở `data/music-history.json`. Tránh chọn lại trong phạm vi lịch sử này. Nếu không có bài phù hợp/chưa phát thì báo lỗi, không cố phát lại bài cũ. Giữ `data` để còn lịch sử qua restart.
- Lịch sử được ghi trước khi gửi voice để tránh gửi trùng khi kết quả Zalo không rõ; lượt gửi thất bại có thể vẫn nằm trong lịch sử.
- `data/trends-cache.json` là cache có thể tải lại; nếu `music-history.json` hỏng thì giữ bản sao và sửa file, không xóa phiên Zalo. Lỗi lịch sử nhạc không ngăn bot đăng nhập hay chạy lệnh PR.
- Mỗi người gọi nhạc cách ít nhất 10 giây; yêu cầu random mới không bị bộ chống lặp tên lệnh 30 giây chặn nhầm. Chỉ một bài xử lý và tối đa hai bài chờ như trước.

Đã chạy thử tải bài Việt Nam và quốc tế từ bảng hiện tại rồi chuyển AAC; chưa thử gửi trực tiếp vào tài khoản Zalo của bạn. Việc đối chiếu metadata không bảo đảm tuyệt đối bản SoundCloud là bản gốc/chính thức.


## Báo setup demo

- `!on`: bật BTC/ETH/XAUUSD, M15/M30/H1/H4 trong nhóm đang nhắn.
- `!BTC`, `!ETH`, `!XAUU`: bật riêng tài sản và hỏi setup hiện tại. XAUU là alias của XAUUSD.
- `!BTC H1` hoặc `!on ETH M30`: chọn tài sản/khung.
- `!off BTC`: chỉ tắt BTC trong nhóm này; `!off`: tắt hết thông báo trade nhóm này.

Không giới hạn nhóm; bot phải có mặt và có quyền nhắn tin trong nhóm. `!on` không bật cho nhóm khác. Đăng ký và ID nến đã gửi lưu trong `data/trading-subscriptions.json`; giữ file qua restart. Bot tự phát setup DEMO mới, có Entry/TP/SL, hướng, nguồn, khung và thời hạn. Bộ chưa đạt kiểm chứng vẫn gửi khi có tín hiệu, luôn có nhãn “DEMO · CHƯA ĐẠT KIỂM CHỨNG”. Lỗi nguồn hoặc giá trễ thì không phát lệnh. Gửi chưa rõ kết quả không tự gửi lại. Không gửi bù setup cũ.

0/288 bộ đạt kiểm chứng vẫn giữ nguyên; kết quả này không còn khóa thông báo DEMO. Khung lớn đã test khoảng 9 tháng; bộ đạt số học trong đợt tìm thêm trên cùng mẫu vẫn cần forward test. Vàng chưa nối được nguồn live cùng nguồn đã kiểm tra, không phát setup vàng hiện tại. Engine chia sẻ cùng web, nguồn BTC/ETH là Bitget USDT gần đúng Exness. H1/H4 đang chờ nến mới là bình thường; chỉ báo nguồn trễ khi thiếu nến đã phải đóng. Đây là thông báo demo, không đặt lệnh trên sàn.

Đã chạy kiểm tra tự động bằng API Zalo giả lập. Chưa có quyền host Botkeep hoặc phiên Zalo nên chưa cập nhật host, chưa gửi tin thật. Cập nhật ZIP trên host cũ và restart, giữ toàn bộ `data/`/`.env`; không cần `!setup`.


## Scalp bổ sung — 1.7.3

`!scalp` bật thông báo scalp BTC/ETH trong nhóm và xem setup mới nếu có. `!scalp BTC` hoặc `!scalp ETH` chọn riêng. Không cần !on hoặc !setup trước đó. Các thông báo M15/M30/H1/H4 đang bật vẫn được giữ.

`!off scalp` chỉ tắt scalp; `!off scalp BTC` chỉ tắt scalp BTC. `!off BTC` tắt mọi khung của BTC; `!off` tắt hết thông báo trade nhóm này. Nhóm khác không đổi.

Scalp dùng nến M1, ATR M5 và bộ chỉ báo riêng từng tài sản/khung giờ như web; giữ tối đa 1–3 phút. Chỉ gửi setup mới còn 45 giây hiệu lực sau lúc chỉ báo xuất hiện; entry/TP/SL lấy từ giá mới. Nến Bitget, ưu tiên giá Exness công khai và quy đổi ATR theo giá cùng thời điểm. Nguồn Exness lỗi thì dừng báo setup; không chuyển sang giá Bitget/USDT. Không bịa hoặc gửi bù setup quá hạn.

Vòng scalp 10 giây chạy riêng vòng khung lớn 30 giây. Chỉ tính lại chỉ báo khi nến M1 đổi, dùng chung dữ liệu giữa các nhóm. Đăng ký và nến đã gửi giữ qua restart; không có giới hạn số nhóm trong code. Mọi setup scalp hiện là demo chưa vượt kiểm chứng, không tự đặt lệnh lên sàn.


Giá lệnh bản1.7.3: cả SCALP và M15–H4 chỉ lấy Entry BUY theo Ask, SELL theo Bid của Exness công khai; SL/TP tính lại theo độ biến động tham chiếu được quy đổi cùng thời điểm. Không dùng giá Bitget spot/perp để thay thế Entry khi Exness lỗi. Tin ghi BTCUSD/ETHUSD, loại MARKET tham chiếu, Bid/Ask lúc phát, giờ phát và hạn entry. Chỉ báo vẫn dùng nến Bitget tham chiếu; đây CHƯA phải feed tài khoản MT5.

Để khớp đúng nguồn tài khoản, cần kết nối chính tài khoản bằng cầu nối terminal MT5 chỉ đọc hoặc API chính thức nếu là tài khoản Exness được hỗ trợ. Exness API hiện không hỗ trợ tài khoản MetaTrader tiêu chuẩn. Tên BTC trong app không đủ xác định mã/suffix. Không gửi mật khẩu/khóa bí mật vào chat; thông tin kết nối phải cấu hình trực tiếp trên máy chủ của chủ tài khoản.

## Khi không nhận được setup — 1.7.3

1. Stop → Upload ZIP1.7.3 → Extract/Unarchive ghi đè code ở thư mục gốc → Start. Giữ nguyên `data/` và `.env`.
2. Gõ `!status`: phải ghi `Bot 1.7.3`. Nếu không nhận lệnh này, kiểm tra lại thư mục giải nén và dòng phiên bản trong Console.
3. Gõ `!scalp BTC` (BTC) hoặc `!scalp` (BTC+ETH). Không cần `!on` hay `!setup` trước. Đăng ký cũ vẫn giữ qua restart.
4. Gõ `!status` sau khoảng20giây. Dòng `quét ...s trước` và giờ nến phải cập nhật. Xem lý do riêng: chờ tín hiệu, nguồn lỗi/giá cũ, hay Zalo chưa xác nhận gửi. Status chỉ hiển thị đăng ký của nhóm hiện tại.

Bot kiểm tra mỗi10giây, không phải phát một lệnh mỗi10giây. Mọi tín hiệu vẫn phải mới và có Bid/Ask Exness hợp lệ. Các bộ hiện vẫn chưa đạt kiểm chứng và chỉ dùng demo.

## Kiểm tra trực tiếp nguồn — 1.7.3

Sau khi cập nhật và restart, gửi `!check BTC` trong nhóm. Phải thấy `Bot 1.7.3`; các dòng nến, giá quy đổi và giá Exness phải OK. `!check ETH` làm tương tự cho ETH. LỖI HTTP, tick quá5giây hoặc lệch đồng hồ là lý do chưa tạo setup; không cần chờ một tín hiệu để thấy lỗi này. Lệnh không thay đăng ký nhóm.

Status mới giữ “Chặn gần nhất” khi lượt tiếp theo đã chuyển sang chờ; hiện “Đã thấy trong phiên” riêng với tín hiệu lịch sử. Thông tin chẩn đoán này bắt đầu lại khi restart; giờ khởi động được ghi rõ, không xóa lịch sử nến đã xử lý.

## Chỉ báo/thuật toán mới — 1.7.3

- !indicators: số lượng trong catalog và đợt sàng lọc.
- !research BTC: thuật toán thử cho scalp theo phiên hiện tại; !research ETH H1: theo mã/khung/phiên. Đây là tra cứu nghiên cứu, không bật bộ rejected hoặc tạo Entry giả.
- 0bộ mới đủ điều kiện tự bật. Bot vẫn demo theo các bộ phiên cũ; TP/SL mới chưa được mặc định áp dụng vì chưa có bằng chứng cải thiện ổn định.
- Mẫu tin được rút gọn nhưng giữ nguồn, thời gian, Entry, TP, SL, R:R và nhãn DEMO.

## Quản lý rủi ro và kỷ luật — 1.7.3

- `!risk 1000 0.5` tính ngân sách5 đơn vị tiền cho SL. `!risk 1000 0.5 100 2` dùng vốn1000, risk0.5%, khoảng Entry–SL100 và phí/trượt thêm2 mỗi đơn vị cơ sở: khối lượng tối đa0.049019 đơn vị cơ sở, **chưa phải lot Exness**. Cùng đồng tiền; dấu chấm/phẩy là thập phân, không dùng phân cách nghìn. Công thức áp dụng sản phẩm tuyến tính. Cần kiểm tra contract size, min/step lot và margin ở sàn; gap có thể vượt ngân sách. Lệnh không lưu thông tin vốn.
- `!rr 80000 79900 80150 2` tính R:R sau phí bổ sung đã nhập và tỷ lệ thắng hòa vốn toán học nếu chỉ có kết quảTP/SL. Đây không phải xác suất thắng dự báo hay expectancy đo từ giao dịch. Spread đã nằm trong Entry Bid/Ask thì không cộng lần nữa; phí thực tế vẫn phải nhập đúng.
- `!pause 15m` nghỉ báo trade trong nhóm, từ1phút đến24h. `!resume` tiếp tục sớm, hoặc bot tự tiếp tục khi hết giờ. Đăng ký/giờ nghỉ được giữ qua restart; !off vẫn tắt riêng được. Lệnh đã bắt đầu gửi trước lúc nghỉ có thể vẫn đến. Các nhóm khác và chức năng nhạc/lịch không bị ảnh hưởng. Bot không biết bạn đã đặt lệnh thật, không tự kết luận bạn đang revenge trade hay đã lỗ trong ngày.

Khi có đủ dữ liệu, setup ghi thêm cản pivot tham chiếu trướcTP hoặcSL trước swing. Pivot cần2nến trái/2nến phải đã đóng trong60nến gần nhất, loại mức đã bị xuyên. Đây là ngữ cảnh từ Bitget được quy đổi gần đúng theo báo giá đồng thời, **không phải** vùng hỗ trợ/kháng cự tài khoảnExness hay thuật toán chắc chắn đảo chiều. Thiếu ngữ cảnh không tạo cảnh báo giả; mứcEntry/TP/SL và điều kiện phát cũ giữ nguyên. Chỉ tính ngữ cảnh khi đã có setup, không thêm feed hoặc vòng quét.

Khóa học cung cấp nguyên tắc học tập, không chứng minh một chiến lược sinh lời choBTC/ETH. Không ép mọiTP lên2R, không gán một %vốn/lot mặc định cho tất cả người trong nhóm. Phép thử chốt50%@1R vàhòa vốn/trailing còn âm sauchi phí, chưa bật exitmới. Xem assets/course-review.md. Bộ demo cũ vẫn chưa đạt kiểm chứng.

Nhận dạng lời video bằng Whisper chỉ chạy trong môi trường nghiên cứu; không thêm model/ASR vào bot hoặc VPS Botkeep.
