export const messageSets = {
  uongnuoc: {
    name: 'Nhắc uống nước và nghỉ ngơi',
    messages: [
      'Bạn đã uống nước chưa? Nhấp một chút nước rồi làm tiếp nhé 💧',
      'Nghỉ tay một lát, đứng dậy vươn vai cho thoải mái nào 🌿',
      'Mải làm việc cũng nhớ chăm sóc bản thân nhé. Để ly nước bên cạnh cho dễ nhớ nha.',
      'Nếu đã ngồi lâu, thử đi lại vài bước và thả lỏng vai một chút nhé.',
      'Cho mắt nghỉ một lát, nhìn ra xa màn hình rồi quay lại khi thấy dễ chịu nhé.',
      'Một lời nhắc nhỏ: uống nước khi khát và dành thời gian nghỉ ngơi trong ngày 💙',
      'Hít thở chậm vài nhịp, thả lỏng vai. Bạn có thể nghỉ một chút mà.',
      'Đừng quên bữa ăn và giấc ngủ của mình nhé. Chúc mọi người giữ sức khỏe 🌼',
    ],
  },
  tichcuc: {
    name: 'Lời nhắn tích cực',
    messages: [
      'Cứ làm từng việc một, không cần vội. Chúc mọi người một ngày thuận lợi 🌿',
      'Một bước nhỏ hôm nay cũng đáng ghi nhận. Cố gắng vừa sức mình nhé.',
      'Nếu thấy mệt, hãy cho bản thân nghỉ một chút rồi tiếp tục khi sẵn sàng 💛',
      'Mong hôm nay bạn gặp được một điều khiến mình mỉm cười 😊',
      'Cảm ơn mọi người đã cùng giữ cho nhóm một không gian vui vẻ và tôn trọng nhau.',
      'Có những ngày chỉ cần hoàn thành một việc nhỏ thôi cũng đã là tốt rồi.',
      'Chúc mọi người có một khoảng thời gian dễ chịu dành cho chính mình hôm nay 🌼',
      'Nếu có một chuyện vui nhỏ, bạn có thể chia sẻ để cả nhóm cùng vui nhé.',
    ],
  },
};

export function resolveMessages(content, prefix = '!') {
  let messages;
  if (content.startsWith('@')) {
    const set = messageSets[content.slice(1).toLowerCase()];
    if (!set) throw new Error(`Nội dung mẫu không tồn tại. Gõ ${prefix}mau để xem bộ mẫu.`);
    messages = [...set.messages];
  } else messages = content.split('||').map(s => s.trim());
  if (messages.length < 1 || messages.length > 50 || content.length > 20000) throw new Error('Nội dung tối đa 50 câu, tổng đầu vào tối đa 20000 ký tự.');
  if (messages.some(s => !s || s.length > 4000 || s.startsWith(prefix))) throw new Error(`Nội dung mỗi câu cần 1–4000 ký tự, không bắt đầu bằng ${prefix}. Không để câu trống giữa các dấu ||.`);
  return messages;
}
