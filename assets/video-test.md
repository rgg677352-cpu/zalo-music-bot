# !test — thử phương pháp Pivot/hợp lưu trên vàng

`!test` bật thông báo **DEMO** XAUUSD M5 trong nhóm hiện tại, không cần setup. Quét mỗi 10 giây khi bot kết nối Zalo. Chỉ báo khi đủ điều kiện; không tạo lệnh để minh họa bằng giá giả.

- `!test M1`, `!test M5`, `!test M15`: chuyển khung thử của nhóm, chỉ một khung TEST cùng lúc.
- `!test status`: xem lần quét, điều kiện thiếu, tín hiệu bị chặn và xác nhận gửi Zalo. `!status` cũng chứa TEST.
- `!test report`: kết quả nghiên cứu lịch sử đã hoàn thành; **không chạy lại hàng triệu tick trên VPS** và không gọi đó là kết quả live.
- `!test off` / `!off test`: tắt riêng TEST. `!off XAU` hoặc `!off` cũng tắt TEST. `!off scalp` giữ TEST; `!pause`/`!resume` áp dụng TEST như các báo trade khác.
- M15 TEST tự động có metadata @All như các setup M15 khác. M1/M5 và phản hồi thủ công không tag.

## Công thức cố định, không tự tìm tham số có lãi

Giả thuyết `pivot_confluence` được viết lại từ phần công thức công khai trong nghiên cứu hai video. Không có mã chỉ báo riêng của người dạy; không sao chép kênh màu hoặc Semafor không rõ cách xác nhận. Bộ này chưa đủ tiêu chuẩn lợi nhuận; người dùng chủ động bật để thử.

Pivot Traditional P/S1–3/R1–3 lấy từ **nến ngày UTC tham chiếu đã đóng gần nhất thuộc thứ Hai–thứ Sáu**; bỏ cuối tuần, không thay ngày bị thiếu bằng dữ liệu cũ. Nến ngày này thuộc Bitget, không phải ngày giao dịch Exness và không dùng mốc NY17. Giá chạm vùng ±0,25 ATR trong 3 nến gần nhất, đóng cách mức đó từ −0,5 đến +0,75 ATR theo hướng mua/bán. Nếu nhiều vùng hợp lệ, dùng vùng gần nhất.

Cần ít nhất 2/3 nhóm xác nhận: (1) RSI14 ≤30 / ≥70 cùng TDF proxy3 ≤−0,8 / ≥0,8 trong 3 nến; (2) phân kỳ Stoch8/3/3 thường hoặc ẩn đã xác nhận bằng pivot trái2/phải2, khoảng cách 3–60 nến, mới trong 3 nến; (3) CCI21 hoặc CCI14 vượt ±200 trong 3 nến. TDF dùng EMA3 hai lần và chuẩn hóa 9 nến, không khẳng định đúng phiên bản riêng trong video. Chỉ phát khi tổ hợp hướng/vùng xuất hiện mới; không phát lại liên tục khi điều kiện giữ nguyên.

Giá đặt LIMIT là mức S/R được quy đổi sang Exness bằng tỷ lệ hai giá giữa cùng thời điểm. M1/M5 dùng ATR14 M5 đã đóng; M15 dùng ATR14 M15. SL M1/M5 ngoài swing5 nến +0,15 ATR, tối thiểu0,8/tối đa2,5 ATR; TP tối đa1,2R và chốt trước P0,1 ATR; giữ tối đa10/30 phút sau khớp. M15 dùng SL1 ATR, TP tối đa0,8R trước P, giữ tối đa15 phút. Bỏ nếu R:R sau làm tròn dưới0,5 hoặc spread quá25% khoảng SL. Mức giá khóa từ lần chấp nhận đầu tiên của nến; không trượt theo mỗi lần lấy giá mới.

LIMIT hết hạn sau khoảng3/5/15 phút tương ứng M1/M5/M15, làm tròn xuống phút từ lúc tín hiệu+5giây. Chỉ thông báo trong45giây sau khi nến đóng+2giây, còn ít nhất60giây để nhập. Không bảo đảm vùng vẫn còn khi người dùng mở app sau15–40giây: nếu giá tới/quá Entry hoặc qua TP thì bỏ. Chỉ gửi khi Exness và tham chiếu đều mới ≤5giây, lệch timestamp≤5giây, chênh giá≤2%. Exness lỗi thì không dùng Entry giá sàn thay thế.

## Nguồn và giới hạn

Nến M1/M5/M15 và 1D: Bitget **XAUUSDT perpetual**. Giá đặt lệnh: Exness **XAUUSD công khai**, không kết nối MT5/tài khoản cá nhân. Đây là tổ hợp nguồn mới, **không phải mô phỏng giống hệt XAUUSDm tick archive đã test**. Không gắn kết quả của ba ứng viên `pivot_touch` trong báo cáo cho `pivot_confluence` đang báo live. Báo cáo cũ ghi rõ 0/120 cấu hình đủ chuẩn; các ngày đã được khảo sát trước đó.

Phiên Á/Âu/giao Âu–Mỹ/Mỹ cuối dựa London/New York với DST riêng. Cùng giả thuyết hợp lưu ở các phiên đang hoạt động; **chưa có bộ thắng được kiểm chứng theo từng phiên**. Chặn cuối tuần, rollover và giờ yên theo cửa sổ bảo thủ giống scalp vàng. Không có bộ lọc lịch tin tức hoặc lịch nghỉ riêng của tài khoản.

Bot chỉ gửi thông báo, không đặt/hủy/đóng lệnh, không biết lệnh nào đã khớp, không tính PnL live hay điều chỉnh SL hộ. Mỗi thông báo có một LIMIT/SL/TP; không có chức năng bồi tăng lot. Các tín hiệu khác nhau hoặc báo scalp cũ vẫn có thể chồng thời gian; người thử phải kiểm tra vị thế và tự đặt Expiration/đóng theo hạn giữ. Không có tính năng basket không SL.

Trạng thái đăng ký và nến đã xử lý lưu trong file trading-subscriptions.json cũ. Không lưu giá/tick ra đĩa, không tải kho lịch sử; cache tối đa các khung hiện có trong RAM và thay khi có nến mới. Không thêm dependency. Có kiểm thử công thức với TA-Lib, tính nhân quả, BUY/SELL LIMIT, nguồn sai/trễ, gửi giả lập và khôi phục trạng thái. Chưa thử gửi thật trên Zalo/Botkeep của người dùng; test phần mềm không chứng minh chiến lược có lãi.
