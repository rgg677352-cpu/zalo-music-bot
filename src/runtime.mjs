export function deadline(operation, ms = 30000) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('Zalo request timed out'), { code: 'ZALO_TIMEOUT' })), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export function createDeduper(limit = 500) {
  const seen = new Set();
  return event => {
    const id = event.data?.msgId || event.data?.cliMsgId;
    // Không có ID thì không kết luận hai lệnh khác nhau là cùng một tin.
    if (id === undefined || id === null || id === '') return false;
    const key = `${event.threadId}:${event.data?.uidFrom}:${id}`;
    if (seen.has(key)) return true;
    seen.add(key);
    if (seen.size > limit) seen.delete(seen.values().next().value);
    return false;
  };
}

export function durationText(ms) {
  if (ms === 0) return 'không nghỉ thêm';
  if (ms % 3600000 === 0) return `${ms / 3600000} giờ`;
  if (ms % 60000 === 0) return `${ms / 60000} phút`;
  return `${ms / 1000} giây`;
}

export function pageOf(items, value, size = 8) {
  const page = value.trim() || '1', total = Math.max(1, Math.ceil(items.length / size));
  if (!/^\d+$/.test(page) || !Number.isSafeInteger(Number(page)) || Number(page) < 1 || Number(page) > total) throw new Error(`Trang không hợp lệ. Chọn từ 1 đến ${total}.`);
  const index = Number(page);
  return { items: items.slice((index - 1) * size, index * size), page: index, total, offset: (index - 1) * size };
}

export function commandPrefix(text, configured) {
  return [...new Set([configured, '?', '!'].filter(Boolean))].sort((a, b) => b.length - a.length).find(prefix => text.startsWith(prefix)) || null;
}
