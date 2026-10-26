# Mở rộng chỉ báo, thuật toán và cách thoát lệnh

Không có tổng hữu hạn cho mọi chỉ báo. Danh mục thư viện bao gồm toán học, thống kê, mẫu nến và nhiều biến thể trùng; không cộng số lượng các thư viện thành chỉ báo độc lập.

Danh mục tại lần kiểm tra: TA-Lib đã cài201 hàm (v0.8.2), trang chính thức237 tên; Pandas TA Classic284 mục duy nhất. Danh mục và nguồn được lưu trong indicator-catalog.json.

16 thuật toán kết hợp chỉ báo với trạng thái thị trường;2 biến thể riêng mỗi tài sản. Chọn riêng5phiên. Scalp BTC/ETH:1.920 cấu hình. M15/M30/H1/H4 BTC/ETH/XAU:3.600 cấu hình; loại các luật cần volume thực ở vàng. Tổng5.520 cấu hình,70 lựa chọn được đóng băng từ train+validation trước test.

Scalp/khung nhỏ:24/09–23/10/2026; H1/H4:24/01–23/10. Tháng này đã dùng nghiên cứu trước nên đây là mở rộng thăm dò, không phải OOS độc lập. Không chọn lại theo test.

Sàng lọc trên OHLC với next-open, chi phí, SL-first nếu nến chạm cả TP và SL; scalp OHLC chỉ là sơ tuyển.10 finalist scalp được chạy lại trên tick Bid/Ask Exness lưu trữ, loại lệnh có gap>10s, báo tỷ lệ coverage, stress spread×2 và delay15s. H1/H4 tính dự phòng giữ qua ngày. Nến và tick tham chiếu không phải thực thi tài khoản Exness của người dùng.

Đã thử TP/SL ATR5 cũ, TP gần dựa ATR1, SL cấu trúc5nến/TP cản20nến, và dời hòa vốn sau0.7R có dự phòng chi phí thoát. Rút TP không tự tạo lợi thế. Chưa có bộ mới qua toàn bộ kiểm tra; không thay mặc định bằng bộ lỗ hoặc bộ có coverage quá thấp.

| Mã | Phiên VN | Lựa chọn scalp | Thoát | Tick test R | Stress R | Coverage |
|---|---|---|---|---:|---:|---:|
|BTC|07–14h|vwap:1|ATR5 180s|-2.19|-6.06|100.0%|
|BTC|14–19h|macd_trend:0|ATR5 180s|-11.59|-18.36|100.0%|
|BTC|19–23h|regression:1|BE sau0.7R|-22.27|-40.55|100.0%|
|BTC|23–04h|ehlers_ss:1|ATR5 180s|-6.33|-9.26|100.0%|
|BTC|04–07h|macd_trend:0|ATR5 180s|-0.51|-5.73|100.0%|
|ETH|07–14h|ema_pullback:0|ATR5 180s|-9.86|-13.44|25.2%|
|ETH|14–19h|kama:0|BE sau0.7R|-7.86|-6.02|30.8%|
|ETH|19–23h|ema_pullback:0|ATR5 180s|-11.23|-20.84|87.3%|
|ETH|23–04h|macd_trend:0|ATR5 180s|-2.51|-7.02|43.2%|
|ETH|04–07h|donchian:1|ATR5 180s|2.48|3.35|24.5%|

Một bộ BTC/H1/phiên Á qua tiêu chí số học OHLC trong mẫu nhưng chưa có forward độc lập và chịu tác động chọn nhiều mô hình. Không gọi đó là được kiểm chứng hay tự bật.

Bot tích hợp thư viện nghiên cứu và tra cứu theo phiên; chỉ các profile accepted mới được phép thay mô hình. Không có profile mới được bật trong đợt này. Tối ưu tính toán chỉ tính các họ đang được chọn, giữ nguyên tín hiệu demo đã công bố. Thông báo được rút gọn, không kèm dump kết quả nghiên cứu hoặc lặp link mỗi lệnh.

Nguồn:
- https://ta-lib.org/functions/
- https://xgboosted.github.io/pandas-ta-classic/indicators.html
- https://traders.com/Documentation/FEEDbk_docs/2014/01/TradersTips.html

## Kiểm tra riêng cách thoát trên tín hiệu demo cũ

Đây là phân tích mô tả bổ sung trên cùng10ngày đã khảo sát, không dùng để chọn/bật mô hình. Cùng chỉ báo nhưng các gói SL/TP/hold có thể thay số lượt khớp và rủi ro chuẩn hóa. Hai phép bổ sung giữ SL khi rút TP và giữ TP khi thêm BE giúp tách tác động; chúng không phải holdout mới.

| Gói thoát | Lệnh đủ tick | R sau phí | R tăng phí | Lần chạm TP |
|---|---:|---:|---:|---:|
|ATR5 60s|3034|-976.72|-1819.78|39|
|ATR5 120s|2748|-704.94|-1358.01|68|
|ATR5 180s hiện tại|2530|-458.50|-925.58|36|
|ATR1 TP/SL gần|3037|-1477.46|-2682.69|697|
|SL cấu trúc|2983|-1331.78|-2235.46|440|
|TP1R + BE0.7R|2536|-457.72|-920.88|136|
|Giữ SL, TP0.7R|2541|-457.88|-929.47|331|
|Giữ TP1.5R, thêm BE0.7R|2534|-456.92|-925.04|36|

Tăng số lần chạm TP không đồng nghĩa kỳ vọng dương. Không chọn một gói để tự bật chỉ vì nó ít lỗ hơn trên mẫu đã xem. Bot chưa quản lý vị thế thật; các mức chỉ là setup/demo, không phải xác nhận SL đã được đổi trên sàn.
