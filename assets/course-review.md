# Đối chiếu khóa học và bot 1.7.1

Ngày nghiên cứu: 25/10/2026. Đã nhận dạng lời60/60video, tổng60.49phút; đọc bản chữ và kiểm tra hình ở các nội dung trọng tâm.

Nguồn do người dùng cung cấp:

- [Forex 101](https://brokershub.co/vi/courses/forex-101): 20 bài.
- [Price Action 101](https://brokershub.co/vi/courses/price-action-101): 20 bài.
- [Quản Lý Vốn 101](https://brokershub.co/vi/courses/quan-ly-von-101): 10 bài.
- [Trading Psychology](https://brokershub.co/vi/courses/trading-psychology): 10 bài.

Các trang không có phụ đề/bản chép lời công khai. Video được lấy từ đường phát công khai trên chính trang bài học; tách âm thanh16kHz và nhận dạng tiếng Việt bằng faster-whisper1.2.1, model small, CPU/int8. Nội dung nhận dạng máy có lỗi thuật ngữ và con số; đã đối chiếu các điểm quan trọng với khung hình, phép tính và code. Không coi bản nhận dạng là trích dẫn chính xác từng chữ. Không phát hành lại video, âm thanh hoặc toàn văn lời giảng trong bot/website; chỉ lưu tóm tắt áp dụng và bằng chứng kỹ thuật.

## Phần áp dụng được

| Nội dung học | Thay đổi trong bot | Giới hạn |
|---|---|---|
| Hiểu spread, Bid/Ask, khối lượng và chi phí | Giữ BUY theo Ask, SELL theo Bid Exness công khai; công cụ tính phí bổ sung | Không suy ra contract size hoặc phí tài khoản từ tên BTC |
| Đọc giá trong ngữ cảnh, không chồng nhiều chỉ báo | Khi có setup, tính thêm pivot đã xác nhận từ60nến đóng; báo cản trướcTP vàSL trước swing | Đây là ngữ cảnh từ nếnBitget được quy đổi gần đúng, không phải feed cấu trúc tài khoảnExness |
| SL cần có lý do trước khi vào; khối lượng theo ngân sách lỗ | `!risk` tính ngân sách và khối lượng cơ sở từ khoảng Entry–SL, có chi phí đã nhập | Không thay SL chỉ để khớp một số lot; không biết min/step lot, margin hoặc gap thực tế |
| R:R và expectancy cần xét cùng chi phí | `!rr` tính R:R sau chi phí và tỷ lệ thắng hòa vốn về toán học | Tỷ lệ hòa vốn không phải xác suất thắng hoặc expectancy được đo |
| Kỷ luật nghỉ giao dịch, tránh cố gỡ | `!pause 15m` / `!resume`, riêng từng nhóm, giữ đăng ký/thời hạn qua restart | Bot không thấy lệnh khớp/P&L nên không tự kết luận bạn đang gỡ thua |
| Không đuổi theo tín hiệu cũ | Giữ kiểm tra nến đóng, giá mới và cửa sổ entry; nghỉ xong không gửi bù setup hết hạn | Không biến một tín hiệu lịch sử thành lệnh còn hiệu lực |

Pivot dùng2nến trái/2nến phải; chỉ được biết sau khi hai nến phải đóng, loại mức đã bị xuyên. Lookback60 và pivot2/2 là cách triển khai cố định của chúng tôi, không phải thông số do khóa học cung cấp hoặc một chiến lược đã chứng minh. Thiếu dữ liệu ngữ cảnh thì bỏ cảnh báo, không tự tạo cản. Các cảnh báo này không sửa Entry/TP/SL, không tăng điểm tin cậy hoặc chặn tín hiệu bằng một bộ lọc chưa kiểm chứng.

Scalp giữ cấu hình riêng BTC/ETH theo5 khoảng hoạt động đã có. Khung lớn giữ bộ riêng từng tài sản/khung; nhãn phiên trên tin khung lớn chỉ mô tả giờ hiện tại, không giả vờ đã có bộ mới theo phiên vượt kiểm chứng. Giờ phiênFX trong khóa học không được sao chép thành lịch đóng cửaBTC/ETH cuối tuần. Vàng tiếp tục chưa có feed live hợp lệ.

## Phần cần kiểm tra, không chép máy móc

Khuyến nghị cố định như luôn dùngR:R≥2, xem một mẫu nến là đảo chiều hoặc gán một phần trăm kết quả cho tâm lý không chứng minh được hiệu quả trên BTC/ETHM1. R:R mục tiêu cao hơn không tự tăng expectancy; cần tỷ lệ chạm và phân phối lãi/lỗ thực tế sau chi phí. Dời SL về Entry vẫn có thể lỗ vì phí, trượt và gap. Các tỷ lệ thua, lợi nhuận tháng, mức “an toàn nhất” trong bài học không được dùng làm kết quả kiểm chứng của bot.

Phần trăm vốn phải tính trên cơ sở đã nêu rõ. Nếu risk1% số dư còn lại mỗi lần,100lầnSL vẫn còn khoảng36.60% vốn trước phí, không phải phép tính tuyến tính. Đây là ví dụ số học, không phải cam kết khả năng sống sót. Không lấy một mức phí/giá trịpip hoặc sốlot củaEURUSD/XAUUSD áp choBTC/ETH.

## Kiểm tra chốt phần, hòa vốn và trailing

[Bài TP/trailing](https://brokershub.co/vi/courses/quan-ly-von-101/lessons/quan-ly-von-101-07-take-profit-trailing-stop) mô tả chốt nửa vị thế khi đạt1R, chuyển SL về hòa vốn và theo swing tiếp theo. Chúng tôi thử cơ chế này trên cùng tín hiệu cũ, riêng BTC/ETH và5 khoảng hoạt động, giữ tối đa180giây:

1. Baseline hiện tại: SL1ATR_M5, TP1.5R.
2. Chốt50% ở1R, SL phần còn lại về Entry có dự phòng trượt thoát, TP cuối1.5R.
3. Như2, thêm trailing cách mức giá thực thi tốt nhất1ATR_M5. Khoảng trailing này là giả thuyết của chúng tôi.
4. Như2, trailing theo pivotM1 đã xác nhận2/2, chỉ siếtSL; TP cuối1.5R. Mức tham chiếu quy đổi theo tỷ lệ tại entry, có sai số nguồn.

Dùng tick Bid/Ask Exness tham chiếu đã lưu, không nội suy đường giá trong nến. Có spread/slip; stress nhân đôi spread và tăng slip. Bỏ giao dịch gặp gap dữ liệu>10giây; báo tỷ lệ đủ dữ liệu riêng mỗi tài sản/phiên. Baseline mới đã đối chiếu bằng toàn bộ hàng kết quả với simulator cũ. Kiểm tra điều khiển bằng đường giá nhân tạo chỉ xác minh xử lý khớp phần/BE/trailing/gap, không tính vào bằng chứng hiệu quả.

Mẫu14–23/10/2026 nằm trong tập1tháng cũ và đã được dùng nhiều lần. Đây là thử mô tả40trường hợp ×2 mức phí, không phải holdout mới, không chọn bộ thắng từ kết quả này.

| Cách thoát | Lệnh đủ tick | Tổng R | Tổng R tăng phí |
|---|---:|---:|---:|
| Hiện tại | 2.530 | −458,50 | −925,58 |
| Chốt50% + hòa vốn | 2.530 | −457,96 | −922,30 |
| Thêm trailing1ATR_M5 | 2.530 | −457,93 | −922,65 |
| Thêm trailing swingM1 | 2.530 | −457,73 | −922,14 |

TổngR chỉ cộng kết quả chuẩn hóa rủi ro ban đầu của10nhóm tài sản/phiên, không phải lợi nhuận tiền hoặc danh mục tài khoản có cùng mức vốn. Stress có2.422lệnh đủ dữ liệu sau các guard. CoverageETH thấp ở nhiều phiên; xem từng trường hợp trong course-exits.json. Chốt phần có thay đổi nhỏ nhưng không làm kỳ vọng mẫu dương. **Không bật exit mới, không tự đổi TP/SL mặc định.** Kết quả cũ của bot vẫn ghi chưa đạt kiểm chứng; công cụ quản lý vốn không biến một bộ đang âm thành bộ có lợi thế.

## Dùng bản sửa

- `!risk 1000 0.5`: ngân sáchSL5 đơn vị tiền.
- `!risk 1000 0.5 100 2`: khoảng Entry–SL100, phí/trượt thêm2 mỗi đơn vị; khối lượng≤0.049019 đơn vị cơ sở. Áp dụng sản phẩm tuyến tính; cần quy đổi lot đúng hợp đồng/min/step và kiểm tra margin ở sàn. Không tự đọc hoặc lưu vốn tài khoản.
- `!rr 80000 79900 80150 2`: tính R:R sau chi phí đã nhập. Spread đã nằm trong Entry thực tế thì không cộng lần nữa. Công thức chỉ giả sử hai kết quảTP/SL; thoát sớm/chốt phần sẽ có phân phối khác.
- `!pause 15m`: nghỉ báo trade trong nhóm1phút–24h. Hết giờ bot tiếp tục đăng ký cũ; `!resume` tiếp tục sớm. `!off` vẫn dùng được, nhóm khác và nhạc/lịch không bị dừng. Tin đã bắt đầu gửi có thể vẫn đến sau lệnhnghỉ.

114 kiểm tra tự động đã qua, gồm tính phí/khối lượng, pivot causal, nghỉ qua restart và chặn tin trả muộn sau lệnh nghỉ. Whisper chỉ chạy khi nghiên cứu, không nằm trong runtime Botkeep. Mã đã kiểm tra bằng bộ test tự động; không đăng nhập tài khoảnZalo/Exness, không gửi lệnh sàn hoặc tự cập nhật hostBotkeep. ZIP cần được chủ host giải nén ghi đè code rồi restart, giữ `data/` và `.env`.
