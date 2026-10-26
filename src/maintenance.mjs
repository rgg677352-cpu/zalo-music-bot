import { ThreadType } from 'zca-js';
import { commandPrefix, createDeduper, deadline } from './runtime.mjs';
import { storage, sizeLabel } from './storage.mjs';
import { BOT_VERSION } from './version.mjs';

export function cacheCleanMessage(c) {
  if (!c) return '';
  const reason = { busy: 'đang dùng hoặc chưa xác nhận rảnh', ffmpeg: 'chưa xác nhận FFmpeg chạy được', unsafe: 'đường dẫn không phù hợp', unavailable: 'chưa truy cập/kiểm tra được' }[c.reason];
  return `Cache FFmpeg: xóa ${c.removed} file · ${sizeLabel(c.bytes)}.${reason ? '\nTạm giữ cache: ' + reason + '.' : c.skipped ? '\nGiữ ' + c.skipped + ' mục mới/chưa đủ điều kiện.' : ''}`;
}

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
      if (args.length) message = 'Dùng !storage để xem dung lượng; !clean để dọn file tạm/cache tải FFmpeg đã cài.';
      else if (command === 'clean') {
        const result = await manager.sweep();
        message = `Dọn ổ đĩa · Bot ${BOT_VERSION}\nFile tạm: xóa ${result.removed} thư mục · ${sizeLabel(result.bytes)}.${result.skipped ? '\nĐang dùng/chưa đủ điều kiện: ' + result.skipped + '.' : ''}${result.cache ? '\n' + cacheCleanMessage(result.cache) : ''}\nGiữ phiên Zalo, đăng ký trade, lịch gửi và lịch sử nhạc.\n!storage xem dung lượng theo loại.`;
      } else {
        const u = await manager.usage();
        message = [`Ổ đĩa · Bot ${BOT_VERSION}`, ...u.categories.map(c => `${c.label}: ${c.partial ? 'ít nhất ' : ''}${sizeLabel(c.bytes)}`), `Tác vụ đang giữ file: ${u.activeJobs}`, `RAM tiến trình Node: ${sizeLabel(u.nodeRSS)} (khác ổ đĩa).`, 'Tự dọn file tạm/cache tải FFmpeg khi khởi động và mỗi 10 phút.', u.lastSweep?.cache?.reason ? cacheCleanMessage(u.lastSweep.cache) : '', '!clean dọn ngay; giữ FFmpeg đang dùng, thư viện và dữ liệu đăng nhập.'].filter(Boolean).join('\n');
      }
    } catch { message = 'Chưa kiểm tra/dọn được file tạm. Xem quyền ghi thư mục tmp và dung lượng host; không xóa data/session.json.'; }
    await deadline(() => api.sendMessage(message, String(event.threadId), ThreadType.Group));
    return true;
  } };
}
