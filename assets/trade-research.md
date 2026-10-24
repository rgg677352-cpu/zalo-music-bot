# BTC / ETH / XAUUSD · M15, M30, H1, H4

Ngày nghiên cứu: 24/10/2026. Giá tham chiếu, không phải giá và kết quả khớp lệnh tài khoản Exness.

Đã sàng lọc 288 cấu hình (36 quy tắc riêng theo tài sản × 2 bộ thoát × 4 khung). Mỗi tài sản/khung chọn một bộ dựa trên train và validation; giữ nguyên bộ đó khi đánh giá đoạn cuối. **0 trong 12 bộ cuối vượt đủ tiêu chí. Bản bot 1.6.1 cho phép báo setup DEMO của các bộ chưa đạt, với nhãn rõ; không sửa kết quả kiểm chứng.** Không có nghĩa tất cả chỉ báo trên thế giới đều thua, hay đã đánh giá độc lập toàn bộ 288 bộ trên holdout.

M15/M30 dùng 24/09–23/10/2026: 15 ngày train, 5 ngày validation, 10 ngày holdout. H1/H4 dùng 24/01–23/10/2026: train tới 24/07, validation tới 09/09, holdout 09/09–23/10. Dữ liệu trước các mốc dùng để khởi động chỉ báo, không tính vào kết quả. H1/H4 đã mở rộng khoảng 9 tháng theo yêu cầu.

BTC/ETH: OHLC spot Bitget USDT, kiểm tra đủ từng nến H1 và M15; tổng hợp M30/H4 chỉ khi đầy đủ nhóm nến. Vàng: OHLC spot OANDA:XAUUSD qua biểu đồ công khai TradingView; bỏ nhóm M30/H4 thiếu nến, không điền nến vào giờ nghỉ. Giá khác Exness và có rủi ro chênh lệch USD/USDT, múi giờ đóng nến và spread. Không dùng giá điểm để bịa OHLC.

## Lựa chọn

Đợt đầu 24 quy tắc riêng theo tài sản / 192 cấu hình: BTC ưu tiên trend và phá biên (Donchian, EMA21/55, Supertrend, Super Smoother, KAMA, Vortex, MACD); ETH có mean reversion/volatility (Bollinger, Keltner, RSI pullback, WaveTrend, CCI, Fisher) và trend; vàng gồm EMA/Donchian có giờ UTC riêng, Chandelier, Supertrend, Super Smoother, Bollinger lọc ADX, RSI, CCI. Đây là các quy tắc thử nghiệm độc lập theo công thức chỉ báo, không phải hệ thống được tác giả chứng nhận.

Sau khi không có bộ đạt, đợt mở rộng thêm 12 quy tắc / 96 cấu hình: HMA, DMI/ADX, TEMA, ROC + EMA100 riêng BTC; ZLEMA, TSI, HMA, Aroon riêng ETH; DEMA, DMI/ADX, Aroon, ROC + EMA100 có giờ riêng cho vàng. Đợt này dùng lại kỳ lịch sử đã xem kết quả đợt đầu nên là nghiên cứu thăm dò, **không phải holdout độc lập mới**. Bộ mới dù vượt số học cũng chưa được phép bật tự động trước forward test dữ liệu mới. Không đổi tham số sau khi đọc kết quả các họ mới.

## Khớp và chi phí mô phỏng

Chỉ tín hiệu từ nến đóng; vào ở open nến kế tiếp có dữ liệu, không dùng close tín hiệu làm giá vào. Mỗi tài sản chỉ một vị thế, SL/TP cố định. Nếu nến chạm cả hai, tính SL trước; gap qua SL chịu giá open bất lợi. Mức chạm dùng Bid khi thoát BUY và Ask khi thoát SELL sau spread tham chiếu; không dùng mid chạm TP để tự tính thắng. Chi phí mỗi fill gồm nửa spread và trượt giá. Spread sàn tham chiếu BTC 8,17 USD, ETH 1 USD, vàng 0,60 USD; stress gấp đôi spread, tăng trượt giá từ 0,002% lên 0,005% mỗi fill. Dự phòng giữ lệnh 0,1% giá/ngày theo thời gian, không phải bảng swap Exness thực tế. Thoát trong nến chịu trọn thời lượng nến để tránh đánh giá thấp chi phí. Không mô hình hóa được đầy đủ spread giãn, báo giá mất và trượt giá khi có tin.

Hai bộ thoát: SL = 1,5 ATR, TP = 1,5R, giữ tối đa 8 nến; hoặc SL = 2 ATR, TP = 2R, giữ tối đa 12 nến. R tính từ rủi ro ban đầu. Các con số là kết quả của toàn bộ quy tắc vào/thoát, không riêng đường chỉ báo.

Điều kiện sàng lọc: train ≥ 20 lệnh, validation ≥ 8; train/validation và validation tăng phí đều lãi. Đoạn cuối phải ≥ 15 lệnh, lãi cả cơ sở và stress, PF ≥ 1,2, biên dưới Wilson 95% của tỷ lệ thắng cao hơn ngưỡng hòa vốn theo R:R. Các tiêu chí này chưa xử lý hết thiên lệch do tìm nhiều cấu hình. Không coi “tốt nhất trong số đã thử” là có lợi thế giao dịch.

## Kết luận quan sát

- BTC H1 EMA21/55: 19 lệnh đoạn cuối, +0,86R cơ sở / +0,67R stress, PF≈1,10; chưa đạt PF và độ chắc thống kê.
- ETH H4 WaveTrend: 6 lệnh, +1,00R / +0,95R stress; quá ít lệnh để kết luận.
- Các bộ cuối khác không vượt train/validation hoặc lỗ đoạn cuối. CSV ghi đầy đủ cả kết quả âm.

Web cho xem tín hiệu demo BTC/ETH của bộ chưa đạt nếu người dùng chủ động bật ô thử nghiệm; chỉ dùng nến đóng và Bid/Ask mới, không gửi lệnh đến sàn. **Bot 1.6.1 mặc định gửi setup DEMO mới của BTC/ETH khi bật !on, kể cả bộ chưa đạt; tin ghi rõ DEMO · CHƯA ĐẠT KIỂM CHỨNG.** Vàng trên trang khung lớn hiện là biểu đồ lịch sử có ghi thời điểm; chưa có nguồn live cùng nguồn đã kiểm tra, chưa phát entry hiện tại. Không suy diễn dữ liệu cũ thành giá live.

Bot không cần !setup/?setup ở mọi nhóm đã tham gia. !on bật thông báo theo nhóm, !BTC/!ETH/!XAUU bật riêng tài sản và hỏi setup; !off BTC tắt BTC riêng nhóm đó. Kết quả không đạt kiểm chứng không còn khóa tin demo; chỉ tín hiệu thật từ nến đóng, giá mới và entry chưa hết hạn mới được gửi. Không bịa setup cho đủ thông báo. Bản bot phải được cập nhật trên host đang chạy; trang web không phải bằng chứng bot đã hoạt động trên Zalo.

## Nguồn công thức và dữ liệu

- [Bitget Market Data API chính thức](https://www.bitget.com/docs/catalog/market/market-data)
- [OANDA XAUUSD trên TradingView](https://www.tradingview.com/symbols/XAUUSD/?exchange=OANDA)
- [John Ehlers — Predictive Indicators / Super Smoother](https://www.mesasoftware.com/papers/PredictiveIndicators.pdf)
- [Alan Hull — Hull Moving Average](https://alanhull.com/hull-moving-average)
- [TA-Lib — KAMA](https://ta-lib.github.io/ta-doc/indicator/KAMA.htm), [ADX](https://ta-lib.github.io/ta-doc/indicator/ADX.htm), [MACD](https://ta-lib.github.io/ta-doc/indicator/MACD.htm), [TEMA](https://ta-lib.github.io/ta-doc/indicator/TEMA.htm), [Aroon](https://ta-lib.github.io/ta-doc/indicator/AROON.htm)
- [John Bollinger — quy tắc dùng Bands](https://www.bollingerbands.com/bollinger-band-rules)
- [WaveTrend — LazyBear](https://www.tradingview.com/script/2KE8wTuF-Indicator-WaveTrend-Oscillator-WT/), [Chandelier Exit — everget, mã công khai](https://github.com/everget/tradingview-pinescript-indicators/blob/master/trailing_stops/chandelier_exit.pine)

Mã engine dùng chung cho web/bot, tiêu chí đã lưu trước khi đọc kết quả, dữ liệu đầu vào có SHA256 và log giao dịch từng bộ để tái kiểm tra. Các công thức không bảo đảm lợi nhuận.


Bản1.6.2 bổ sung !scalp: bật scalp BTC/ETH M1/M5 theo cùng cấu hình giờ trong fast-study, giữ tối đa1–3phút, hiệu lực entry45giây. Vòng scalp10giây riêng vòng HTF30giây; chỉ tính lại khi nến M1 đổi. Ưu tiên báo giá Exness công khai và quy đổi ATR theo tỷ lệ giá cùng thời điểm; nếu nguồn này lỗi, dùng Bitget/USDT ghi rõ nguồn. Giá công khai vẫn có thể lệch tài khoản. !off scalp tắt riêng scalp, !off BTC tắt mọi khung BTC. 0/480 cấu hình scalp vượt đủ kiểm tra, tin luôn ghi DEMO · CHƯA ĐẠT KIỂM CHỨNG.
