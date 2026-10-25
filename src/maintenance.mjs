import { ThreadType } from 'zca-js';
import { commandPrefix, createDeduper, deadline } from './runtime.mjs';
import { storage, sizeLabel } from './storage.mjs';
import { BOT_VERSION } from './version.mjs';

export function createMaintenance(api, { manager = storage, prefix = '?', now = Date.now } = {}) {
  const duplicate = createDeduper(300), recent = new Map();
  return { async handle(event) {
    if (event.type !== ThreadType.Group || typeof event.data?.content !== 'string') return false;
    const text = event.data.content.trim(), p = commandPrefix(text, prefix);
    if (!p) return false;
    const [word, ...args] = text.slice(p.length).split(/\s+/), command = word.toLowerCase();
    if (!['storage', 'clean'].includes(command)) return false;
    if (duplicate(event)) return true;
    const key = String(event.threadId) + ':' + command;
    if (recent.has(key) && now() - recent.get(key) < (command === 'clean' ? 60000 : 10000)) return true;
    recent.set(key, now()); if (recent.size > 300) recent.delete(recent.keys().next().value);
    let message;
    try {
      if (args.length) message = 'Dùng !storage để xem dung lượng; !clean để dọn file tạm mồ côi.';
      else if (command === 'clean') {
        const result = await manager.sweep();
        message = `Dọn file tạm · Bot ${BOT_VERSION}\nĐã xóa ${result.removed} thư mục · ${sizeLabel(result.bytes)}.${result.skipped ? '\nĐang dùng/chưa đủ điều kiện: ' + result.skipped + '.' : ''}\nGiữ phiên Zalo, đăng ký trade, lịch gửi và lịch sử nhạc.\n!storage xem dung lượng theo loại.`;
      } else {
        const u = await manager.usage();
        message = [`Ổ đĩa · Bot ${BOT_VERSION}`, ...u.categories.map(c => `${c.label}: ${c.partial ? 'ít nhất ' : ''}${sizeLabel(c.bytes)}`), `Tác vụ đang giữ file: ${u.activeJobs}`, `RAM tiến trình Node: ${sizeLabel(u.nodeRSS)} (khác ổ đĩa).`, 'Tự dọn file tạm mồ côi khi khởi động và mỗi 10 phút.', '!clean dọn ngay; không xóa thư viện hoặc dữ liệu đăng nhập.'].join('\n');
      }
    } catch { message = 'Chưa kiểm tra/dọn được file tạm. Xem quyền ghi thư mục tmp và dung lượng host; không xóa data/session.json.'; }
    await deadline(() => api.sendMessage(message, String(event.threadId), ThreadType.Group));
    return true;
  } };
}
