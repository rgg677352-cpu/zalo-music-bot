// Chỉ gửi nội dung người dùng cung cấp. Không tạo câu tự động hay đổi cách diễn đạt.
export function resolveMessages(content, prefix = '!') {
  const messages = content.split('||').map(s => s.trim());
  if (messages.length > 50 || content.length > 20000) throw new Error('Nội dung tối đa 50 câu, tổng đầu vào tối đa 20000 ký tự.');
  if (messages.some(s => !s || s.length > 4000 || s.startsWith(prefix))) throw new Error(`Nội dung mỗi câu cần 1–4000 ký tự, không bắt đầu bằng ${prefix}. Không để câu trống giữa các dấu ||.`);
  return messages;
}
