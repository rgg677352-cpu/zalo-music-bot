# Zalo Bot 1.7.6

Mới: `!test` bật thử **vàng M5 · Pivot + hợp lưu RSI/TDF/Stoch/CCI**, tự gửi LIMIT có Entry/TP/SL khi có tín hiệu. `!test M1` / `!test M15` đổi khung; `!test status` xem trạng thái; `!test report` xem kết quả nghiên cứu cũ; `!test off` tắt riêng. Không cần setup; đăng ký giữ qua restart. Nến Bitget vàng tham chiếu, mức lệnh quy về Exness công khai; **chưa đạt kiểm chứng**, không bồi lệnh hoặc tự đặt lệnh. Không chạy backtest nặng hay lưu tick lên ổ đĩa Botkeep. [Công thức và giới hạn](assets/video-test.md).

`!scalp XAU` bật riêng scalp vàng trong nhóm, tự quét mỗi 10 giây và gửi **BUY LIMIT/SELL LIMIT** khi có tín hiệu còn mới. Chấp nhận XAU/XAUUSD/XAUU/GOLD. `!off scalp XAU` tắt riêng scalp vàng; `!off XAU` tắt mọi khung vàng; `!check XAU` kiểm tra nguồn; `!research XAU` xem công thức. `!scalp` không tham số vẫn bật BTC+ETH như cũ. Không cần `!setup`, không tự bật vàng ở nhóm chưa yêu cầu.

Giá tính vùng vàng lấy từ **Bid/Ask XAUUSD công khai Exness**, nến chỉ báo là **XAUUSDT perpetual Bitget tham chiếu**. Đây không phải feed tài khoản MT5. BUY LIMIT phải dưới Ask, SELL LIMIT phải trên Bid; thiếu giá Exness mới thì dừng, không thay Entry bằng giá sàn crypto. Tín hiệu mới chỉ được thông báo trong 45 giây sau nến đóng; lệnh chờ có hạn khoảng 3 phút ghi cụ thể trong tin, giữ tối đa 3 phút sau khớp. Nhập Expiration đúng hạn hoặc tự hủy nếu chưa khớp; giá đã đi qua Entry/TP thì bỏ. Bot chỉ gửi thông báo, không đặt/hủy/đóng lệnh trên Exness.

Bộ vàng dùng Bollinger 20/2 khi phiên Á đi ngang, EMA 8/34 hồi theo xu hướng tại phiên Âu/Âu–Mỹ, quét đỉnh/đáy 20 nến tại Mỹ cuối. Giờ London/New York tính DST riêng, tạm nghỉ cuối tuần/rollover và rạng sáng; đây là cửa sổ chiến lược bảo thủ, không phải lịch nghỉ lễ tài khoản. SL theo swing có giới hạn ATR M5; TP tối đa 1,2R và giảm trước pivot đã xác nhận, bỏ khi khoảng lời dưới 0,7R. **Bộ LIMIT vàng mới chưa đạt kiểm chứng lợi nhuận**, mọi tin ghi DEMO. Test chức năng và dữ liệu live không chứng minh chiến lược có lãi. [Chi tiết nguồn và giới hạn](assets/gold-scalp.md).


Bản 1.7.6 tự dọn file nhạc/giải nén mồ côi khi khởi động và mỗi 10 phút, đồng thời xóa thư mục giải nén riêng sau mỗi tác vụ. Khi công cụ hết thời gian, bot dừng cả nhóm tiến trình con để tránh bỏ lại FFmpeg/yt-dlp. File đang tải/gửi và phiên Zalo, cấu hình, đăng ký trade được bảo vệ. `!storage` xem dung lượng theo loại; `!clean` dọn ngay trong nhóm, không cần `!setup`. Console có `npm run storage` và `npm run clean`. Từ 1.7.3, bot dọn thêm các file cache HTTP tải FFmpeg (`*.body`/`*.json` có tên hash đúng định dạng) sau khi xác nhận FFmpeg đã cài chạy được và nằm ngoài cache. Chỉ xử lý thư mục `ffmpeg-static-nodejs`, không xóa binary trong `node_modules`, thư viện, cache npm hay cấu hình. Giữ file đang mở, vừa thay đổi dưới một phút, thư mục lạ và symlink. Nếu chưa kiểm tra được thì hoãn và hiện lý do trong `!clean`/`!storage`. Phản hồi của host đã xác định 560,7 MB nằm ở cache này; chưa trực tiếp truy cập Botkeep.

Setup tự động mới ở **M15/M30/H4** nhắc cả nhóm bằng mention `@All` của Zalo. H1/scalp, yêu cầu setup thủ công và lệnh trạng thái không tag. Chỉ áp dụng cho tài sản/khung đã bật ở nhóm; vẫn chống trùng và không gửi bù setup hết hạn. Đã kiểm tra payload và vòng phát bằng API giả lập, chưa thử tag trong nhóm thật.

`!research BTC M15` / `!research ETH H4` hiện kết quả của đúng bộ khung lớn đang cấu hình, gồm số lệnh, net R sau phí, tăng phí, PF và lý do chưa đạt. M15/M30 kiểm tra một tháng; H1/H4 khoảng chín tháng. Chưa bộ nào trong 288 bộ đạt tiêu chuẩn; chưa xác minh riêng từng phiên hoặc khớp lệnh tài khoản Exness. Bản này giữ thuật toán và TP/SL cũ, không coi việc thêm @All là cải thiện lợi nhuận.

Gửi nội dung tự soạn vào nhóm Zalo, luân phiên mỗi 10 phút:

```text
?pr ID_NHOM | Nội dung một | Nội dung hai
```

Bot có mặt trong nhóm là mọi thành viên dùng được các lệnh cũ và mới, không cần `!setup` hay `?setup`; không giới hạn số nhóm. Giữ nguyên phiên đăng nhập Zalo, lịch gửi và lịch sử nhạc khi cập nhật. Có nhạc SoundCloud dạng voice kèm ảnh. `!scl randoom` / `!scl random` chỉ chọn nhạc Việt đang hot từ bảng Apple Music VN rồi tìm bản SoundCloud phù hợp. Lọc tên/thể loại để bỏ nhạc ngoại lẫn trong bảng VN; không gọi hoặc chuyển sang bảng US/GB/KR. Ghi nhớ tên bài và link đã phát theo từng nhóm qua restart, kể cả đổi nghệ sĩ/phiên bản/link tracking; khi hết bài phù hợp thì báo chờ, không tự phát lại. Lịch sử tối đa 5.000 bài/nhóm; đầy thì dừng random và giữ lịch sử, không quay vòng xóa bài cũ. Đây là lọc metadata, không nhận dạng toàn bộ lời hát; bài Việt tên tiếng Anh thiếu bằng chứng có thể bị bỏ qua.

[Hướng dẫn cập nhật và sử dụng](HUONG-DAN.md). Node.js 22+; `npm ci`, `npm start`. Giữ riêng `data` và `.env`. Chưa kiểm thử trực tiếp trên tài khoản Zalo của người dùng.


Thông báo setup demo: `!on`, `!BTC`, `!ETH`, `!XAUU`, `!BTC H1`, `!off BTC`, `!off`. Bật/tắt theo từng nhóm; không tự bật ở nhóm chưa yêu cầu. Bản 1.7.6 mặc định tự báo setup DEMO BTC/ETH khi có tín hiệu mới, kèm Entry/TP/SL và thời hạn; chống trùng qua restart. Bộ chưa đạt kiểm chứng vẫn được gửi, ghi rõ “DEMO · CHƯA ĐẠT KIỂM CHỨNG”. Kết quả test 0/288 bộ đạt giữ nguyên, không biến thành tuyên bố có lợi nhuận. Chỉ nhận nến đóng và Bid/Ask mới; setup hết hạn không gửi bù. Vàng khung lớn M15–H4 chưa có feed; scalp vàng bật riêng bằng `!scalp XAU`. Không gửi lệnh đến sàn.

M15/M30 test 1 tháng, H1/H4 test khoảng 9 tháng. Engine và kết quả được đóng cùng bản ZIP, cùng công thức với web. Mã tích hợp và luồng gửi đã test bằng API Zalo giả lập; chưa đăng nhập hay gửi tin trên tài khoản của bạn. Tải ZIP mới lên Botkeep, giữ `data/` và `.env`, ghi đè code rồi restart một lần. Không cần gọi setup sau đó.


Scalp: `!scalp` bật thêm scalp demo BTC/ETH M1/M5 trong nhóm hiện tại và gửi setup còn hiệu lực; sau đó tự kiểm tra mỗi 10 giây. `!scalp BTC` / `!scalp ETH` chọn riêng. `!off scalp` tắt scalp, giữ M15–H4; `!off scalp BTC` tắt scalp BTC. `!off BTC` tắt cả scalp và khung lớn BTC. Không cần !on trước và không cần !setup. Đăng ký giữ qua restart.

Scalp BTC/ETH dùng cùng công thức/cấu hình theo phiên với web, giữ tối đa 1–3 phút, entry hiệu lực 45 giây sau khi có nến đóng. Nến Bitget M1 thật, ATR M5 từ nhóm đủ 5 nến; ưu tiên Bid/Ask Exness công khai để tính Entry/TP/SL và quy đổi ATR theo tỷ lệ giá cùng thời điểm. Thiếu giá Exness mới thì tạm dừng báo setup; không dùng Bitget/USDT làm giá Entry. Giá công khai không bảo đảm trùng tài khoản Exness; đối chiếu giá app trước khi đặt. 0/480 cấu hình scalp vượt đầy đủ kiểm tra, nên mọi tin vẫn là DEMO · CHƯA ĐẠT KIỂM CHỨNG.

Scalp chạy vòng10giây riêng với khung lớn 30 giây, dùng bộ nhớ đệm chỉ báo đến nến M1 mới; không backtest/huấn luyện trên host. Không gửi setup cũ hoặc bị trễ giá. Chưa cập nhật host Botkeep hoặc gửi tin Zalo thật từ môi trường này.


Giá lệnh BTC/ETH bản1.7.6: cả SCALP và M15–H4 chỉ lấy Entry BUY theo Ask, SELL theo Bid của Exness công khai; SL/TP tính lại theo độ biến động tham chiếu được quy đổi cùng thời điểm. Không dùng giá Bitget spot/perp để thay thế Entry khi Exness lỗi. Tin ghi BTCUSD/ETHUSD, loại MARKET tham chiếu, Bid/Ask lúc phát, giờ phát và hạn entry. Chỉ báo vẫn dùng nến Bitget tham chiếu; đây CHƯA phải feed tài khoản MT5.

Để khớp đúng nguồn tài khoản, cần kết nối chính tài khoản bằng cầu nối terminal MT5 chỉ đọc hoặc API chính thức nếu là tài khoản Exness được hỗ trợ. Exness API hiện không hỗ trợ tài khoản MetaTrader tiêu chuẩn. Tên BTC trong app không đủ xác định mã/suffix. Không gửi mật khẩu/khóa bí mật vào chat; thông tin kết nối phải cấu hình trực tiếp trên máy chủ của chủ tài khoản.

## Kiểm tra bot im lặng — 1.7.6

Gõ `!status` ngay trong nhóm đã bật: phải thấy **Bot 1.7.6**, **BÁO TRADE ĐANG CHẠY** và `BTC SCALP · quét ...s trước` sau `!scalp BTC`. Nếu không phản hồi `!status` hoặc phiên bản khác thì host chưa chạy code mới. Upload ZIP vào Files chưa đủ: phải Extract/Unarchive ghi đè đúng thư mục chứa `index.mjs`, rồi restart; giữ `data/` và `.env`.

“Đang chờ tín hiệu” là kết quả tại lần quét, không phải cam kết sẽ có setup mỗi10giây. Status hiển thị nến, bộ chỉ báo, số điều kiện và tín hiệu gần nhất để thấy bot có tiếp tục quét. Lỗi nguồn hoặc Entry quá cũ được ghi riêng; lỗi gửi Zalo hiện “chưa được xác nhận”, không báo nhầm đã gửi. BTC/ETH và các nhóm tiến hành độc lập có giới hạn song song. SSE Exness lỗi/bị đệm có snapshot HTTP cùng Exness dự phòng, không dùng giá Entry Bitget.

## Tín hiệu có trong lịch sử nhưng nhóm không nhận — 1.7.6

Dùng `!check BTC` và `!check ETH` để thử giá ngay trên chính host. Mỗi nguồn có OK/LỖI, tuổi tick, đường HTTP/SSE và lỗiHTTP nếu có. Không tạo setup giả để thử gửi. `!status` hiển thị giờ khởi động, tín hiệu quan sát trong phiên và lần chặn gần nhất; thông tin này giữ trong bộ nhớ đến restart, đăng ký/chống trùng vẫn lưu ở data như cũ. Giá lệnh mặc định đi qua cùng endpoint Exness công khai của web; nến Bitget tiếp tục là tham chiếu.

Bot báo “đang chạy” chỉ xác nhận vòng quét, không xác nhận nguồn giá luôn tốt hay Zalo đã nhận một setup. “Tín hiệu gần nhất (lịch sử)” cũng không chứng minh bot đã online trong cửa sổ entry đó. Cập nhật1.7.6 rồi gửi kết quả `!check BTC` nếu nhóm tiếp tục không nhận; không cần xóa data/session hoặc bật setup.

## Nghiên cứu và thông báo gọn — 1.7.6

`!indicators` xem catalog; `!research BTC` xem scalp của phiên hiện tại; `!research ETH H1` xem khung lớn. Catalog gồm cả hàm phụ/mẫu nến, không phải mọi mục đều là chiến lược độc lập. Thư viện16 thuật toán đã được đưa vào bot để tra cứu/tính điều kiện nghiên cứu, nhưng0profile mới đạt nên chưa tự thay bộ demo cũ. Gửi setup hiện tại vẫn dùng cấu hình riêng BTC/ETH theo5phiên đã có. Không bật vàng khi thiếu feed.

Báo cáo đầy đủ ở assets/optimizer-report.md:5.520 cấu hình,70finalists; dữ liệu đã khảo sát nhiều lần nên chưa phải OOS độc lập. BộH1/VWAP phiênÁ chỉ qua số học trong mẫu, chưa được gọi là kiểm chứng. TP gần tăng số lần chạm trong một số phép thử nhưng kỳ vọng vẫn âm sau chi phí. Không tự thay TP/SL chỉ để nhìn dễ chạm, cũng không quản lý lệnh thật trên tài khoản.

Tin mới bỏ link/đoạn lặp, giữ Entry/TP/SL tách dòng và hạn vào/nguồn/nhãn chưa đạt. !status và !check BTC vẫn dùng để chẩn đoán, không nhét mọi chi tiết lỗi vào từng tin setup. Giữ data/ và .env khi cập nhật ZIP.

## Quản lý rủi ro và kỷ luật — 1.7.6

- `!risk 1000 0.5` tính ngân sách5 đơn vị tiền cho SL. `!risk 1000 0.5 100 2` dùng vốn1000, risk0.5%, khoảng Entry–SL100 và phí/trượt thêm2 mỗi đơn vị cơ sở: khối lượng tối đa0.049019 đơn vị cơ sở, **chưa phải lot Exness**. Cùng đồng tiền; dấu chấm/phẩy là thập phân, không dùng phân cách nghìn. Công thức áp dụng sản phẩm tuyến tính. Cần kiểm tra contract size, min/step lot và margin ở sàn; gap có thể vượt ngân sách. Lệnh không lưu thông tin vốn.
- `!rr 80000 79900 80150 2` tính R:R sau phí bổ sung đã nhập và tỷ lệ thắng hòa vốn toán học nếu chỉ có kết quảTP/SL. Đây không phải xác suất thắng dự báo hay expectancy đo từ giao dịch. Spread đã nằm trong Entry Bid/Ask thì không cộng lần nữa; phí thực tế vẫn phải nhập đúng.
- `!pause 15m` nghỉ báo trade trong nhóm, từ1phút đến24h. `!resume` tiếp tục sớm, hoặc bot tự tiếp tục khi hết giờ. Đăng ký/giờ nghỉ được giữ qua restart; !off vẫn tắt riêng được. Lệnh đã bắt đầu gửi trước lúc nghỉ có thể vẫn đến. Các nhóm khác và chức năng nhạc/lịch không bị ảnh hưởng. Bot không biết bạn đã đặt lệnh thật, không tự kết luận bạn đang revenge trade hay đã lỗ trong ngày.

Khi có đủ dữ liệu, setup ghi thêm cản pivot tham chiếu trướcTP hoặcSL trước swing. Pivot cần2nến trái/2nến phải đã đóng trong60nến gần nhất, loại mức đã bị xuyên. Đây là ngữ cảnh từ Bitget được quy đổi gần đúng theo báo giá đồng thời, **không phải** vùng hỗ trợ/kháng cự tài khoảnExness hay thuật toán chắc chắn đảo chiều. Thiếu ngữ cảnh không tạo cảnh báo giả; mứcEntry/TP/SL và điều kiện phát cũ giữ nguyên. Chỉ tính ngữ cảnh khi đã có setup, không thêm feed hoặc vòng quét.

Khóa học cung cấp nguyên tắc học tập, không chứng minh một chiến lược sinh lời choBTC/ETH. Không ép mọiTP lên2R, không gán một %vốn/lot mặc định cho tất cả người trong nhóm. Phép thử chốt50%@1R vàhòa vốn/trailing còn âm sauchi phí, chưa bật exitmới. Xem assets/course-review.md. Bộ demo cũ vẫn chưa đạt kiểm chứng.

Nhận dạng lời video bằng Whisper chỉ chạy trong môi trường nghiên cứu; không thêm model/ASR vào bot hoặc VPS Botkeep.
