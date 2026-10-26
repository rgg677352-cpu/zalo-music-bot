# Scalp vàng DEMO — 1.7.5

`!scalp XAU` bật theo nhóm, quét mỗi 10 giây. Alias XAUUSD/XAUU/GOLD. `!off scalp XAU` tắt scalp vàng, `!off XAU` tắt mọi khung vàng. Không tham số, `!scalp` giữ mặc định BTC/ETH. M15–H4 vàng chưa bật feed. `!check XAU` thử nguồn dù chưa có tín hiệu; `!research XAU` mô tả bộ đang chạy.

## Nguồn

- Nến và orderbook tham chiếu: API Bitget `/api/v3/market/candles` và `/orderbook`, `category=USDT-FUTURES&symbol=XAUUSDT`. Đây là hợp đồng vàng, không dùng BTC, PAXG hoặc XAUT để làm nến vàng. [Tài liệu API](https://www.bitget.com/docs/catalog/market/market-data).
- Bid/Ask tính mức giá: Exness công khai `/api/quotes/prev/?instruments=XAUUSD&intervals=1d` hoặc `/api/quotes/subscribe/?instruments=XAUUSD`, đi qua relay cố định của web. Snapshot là mẫu báo giá, **không** được biến thành nến OHLC. Không có đăng nhập tài khoản hay quyền gửi lệnh.
- Nến đóng sau 2 giây, tối thiểu 220 nến M1 liên tục; ATR M5 chỉ dùng nhóm đủ 5 nến đã đóng. Hai quote mới không quá 5 giây, chênh timestamp không quá 5 giây và tỷ lệ giá trong 0,98–1,02. Ngưỡng basis là bộ lọc nghiên cứu, không bảo đảm hai sản phẩm tương đương.
- Dữ liệu công khai không khẳng định trùng mã/suffix/spread hay chart của tài khoản Exness. Nến USDT và tỷ lệ quy đổi không thể tái tạo tick USD của tài khoản.

## Tín hiệu riêng XAU

Các tham số là giả thuyết cố định để chạy demo, không phải kết quả tìm được bộ tốt nhất:

- Phiên Á: Bollinger 20/2 quay vào dải, hiệu suất dịch chuyển 20 nến <0,4, đóng cửa còn phía trước đường giữa.
- Phiên Âu và Âu–Mỹ: EMA 8/34, dốc EMA chậm cùng hướng, giá cắt lại EMA nhanh, thân nến cùng hướng >0,1 ATR M1.
- Mỹ cuối: quét cực trị 20 nến trước ít nhất 0,05 ATR M1 rồi đóng lại trong vùng; râu vượt 1,5 lần thân (sàn thân 0,1 ATR); biên nến <3 ATR M1.
- Không dùng volume crypto để suy ra khối lượng thị trường vàng OTC.

Ranh giới phiên dùng London 08h/17h và New York 08h/16h45. Nghỉ quanh New York 16h45–18h15, nghỉ sau 18h15 tới 00h UTC, chặn cuối tuần theo ngày New York và chờ ít nhất 15 phút liên tục trong cửa sổ hoạt động. DST hai thành phố độc lập. Đây là cửa sổ chiến lược bảo thủ, không truy xuất lịch lễ/close-only tài khoản. Giá Exness mới là điều kiện bổ sung, nhưng một tick mới cũng không chứng minh tài khoản có quyền mở vị thế. [Lịch giao dịch Exness](https://get.exness.help/hc/en-us/articles/4405235684498-Instrument-trading-hours).

## LIMIT và TP/SL

Vùng chỉ thông báo trong 45 giây sau nến đóng +2 giây, chống gửi bù. Entry theo giá đóng cửa tham chiếu đã quy đổi bằng hai báo giá đồng thời, hồi 0,2 ATR M5. BUY LIMIT phải dưới Ask, SELL LIMIT trên Bid ít nhất một spread hoặc 0,01 USD. Nếu vượt vùng hoặc vượt TP trước lúc báo thì bỏ.

SL sau swing 5 nến thêm 0,15 ATR M5, risk tối thiểu 0,8 ATR; bỏ nếu vượt 2 ATR. Spread ≤20% risk. TP tối đa 1,2R, giảm trước pivot đối hướng đã xác nhận 2 nến phải trong 60 nến, đệm 0,1 ATR; bỏ nếu dưới 0,7R. Làm tròn mức giá 2 chữ số rồi tính lại risk/R:R. Giá Entry/SL/TP giữ cố định trong cùng nến sau lần tạo hợp lệ, không trôi theo báo giá mới.

Hạn pending = thời điểm tín hiệu +180 giây, làm tròn xuống phút để nhập Expiration trên điện thoại; thường còn gần 3 phút. Mục tiêu là có thời gian thao tác 15–40 giây, không bảo đảm còn khớp khi mở app. Giữ tối đa 180 giây **sau khớp**. Bot không biết lệnh thật, không tự đặt/hủy/đóng, không biết setup đã khớp hoặc đã TP. Người dùng phải đặt Expiration/tự hủy và kiểm tra điều kiện sàn; broker có thể có stop level/giới hạn riêng. Nhiều tín hiệu mới có thể có vùng chờ chồng thời gian, không có lời khẳng định chỉ một vị thế trên tài khoản.

## Kiểm chứng và giới hạn

Test chức năng có nến vàng thật và API giả lập: BUY/SELL, giữ mức giá, prefix nhân quả, xử lý thiếu nến/quote cũ/sai mã, spread/basis lớn, limit bị vượt, đăng ký theo nhóm, phát tự động và chống trùng qua restart. Đã đọc được nến/orderbook Bitget và Bid/Ask Exness live ngày 26/10/2026. Test chức năng không phải backtest lợi nhuận hoặc xác nhận push notification Zalo thật.

Nghiên cứu Exness vàng trước đó dùng nến mid từ kho tick XAUUSDm; các chỉ báo/exit đã thử không cho một bộ đạt đầy đủ kiểm chứng. Kết quả đó **không** chuyển thành thống kê cho bộ LIMIT và nến XAUUSDT mới này. Chưa có backtest/forward lợi nhuận đủ điều kiện cho tổ hợp mới, không gán win rate hay gọi là tối ưu. Mọi tin ghi **DEMO · CHƯA ĐẠT KIỂM CHỨNG** và chế độ chỉ nhận bộ đạt vẫn chặn vàng.
