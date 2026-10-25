import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { ThreadType } from 'zca-js';
import { resolveMessages } from './messages.mjs';
import { deadline, createDeduper, durationText, pageOf, commandPrefix } from './runtime.mjs';
export function parseDuration(value, zero = false) {
  const m = /^(\d+)(s|giay|m|phut|h|gio)$/i.exec(value.trim());
  const n = m && Number(m[1]) * (/^(m|phut)$/i.test(m[2]) ? 60000 : /^(h|gio)$/i.test(m[2]) ? 3600000 : 1000);
  if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1000) || n > 604800000) throw new Error('Thời gian cần dạng 30s, 5m hoặc 1h, tối đa 7 ngày. Khoảng gửi ít nhất 1 giây; nghỉ có thể là 0s.');
  return n;
}
export function controlHelp(p = '?', maxDuration = 600) {
  return `BOT · Hướng dẫn

Bắt đầu
Bot có mặt trong nhóm là mọi thành viên dùng được lệnh, không cần !setup hay ?setup.
?list — xem tên và ID nhóm. ?list 2 — trang tiếp.

Thông báo setup · chỉ demo
!indicators — danh mục và số cấu hình đã kiểm tra.
!research BTC / !research ETH H1 — bộ thử theo phiên, chưa bật nếu không đạt.
!risk 1000 0.5 100 2 — ngân sách rủi ro/khối lượng, không tự đoán lot.
!rr 80000 79900 80150 2 — R:R và tỷ lệ hòa vốn sau phí đã nhập.
!pause 15m / !resume — nghỉ báo trade trong nhóm, giữ đăng ký qua restart.
!status — bản bot, giờ khởi động, lần quét và lần chặn setup gần nhất.
!check BTC / !check ETH — thử nguồn nến và giá ngay, không cần đợi tín hiệu.
!on — bật BTC/ETH/XAUUSD trong nhóm hiện tại, M15/M30/H1/H4.
!BTC, !ETH, !XAUU — bật riêng tài sản và xem setup hiện có.
!BTC H1 hoặc !on ETH M30 — chọn riêng khung.
!scalp — bật thêm scalp BTC/ETH M1/M5, giữ tối đa 1–3 phút.
!scalp BTC hoặc !scalp ETH — bật riêng và xem setup scalp mới.
!off scalp — tắt scalp, giữ M15–H4; !off scalp BTC — tắt scalp BTC.
!off BTC — tắt riêng BTC trong nhóm; !off — tắt tất cả báo trade nhóm này.
Tự gửi setup DEMO mới có entry/TP/SL, kể cả bộ chưa đạt kiểm chứng; tin nhắn ghi rõ trạng thái. Chỉ dùng nến đóng và giá mới, không gửi bù setup hết hạn. Vàng chưa có nguồn live, chưa báo setup vàng.

Gửi tự động · 10 phút/lần
?pr ID_NHOM | Nội dung
Hoặc nhiều nội dung:
?pr ID_NHOM | Câu một | Câu hai | Câu ba

Mỗi lượt chỉ gửi một câu, lần lượt từ đầu đến cuối rồi quay lại. Lần đầu sau 10 phút. Bot gửi đúng nội dung bạn soạn. Gọi ?pr lại cho cùng nhóm sẽ cập nhật lịch đó và chờ 10 phút từ lúc cập nhật, không tạo thêm lịch PR trùng.
Dùng một dấu | để tách các câu; mỗi câu không chứa dấu |. Tối đa 50 câu, mỗi câu 1–4000 ký tự, tổng đầu vào 20000 ký tự. Nhập ID đầy đủ, không dùng số thứ tự trong danh sách. Bot phải có quyền nhắn ở nhóm đích.

Quản lý
!storage — dung lượng file tạm/thư viện/cache; RAM hiện riêng.
!clean — dọn file tạm/cache tải FFmpeg đã cài, giữ đăng nhập và cấu hình.
?lich — xem lịch đang có; ?lich L1 — chi tiết.
?dung L1 — dừng một lịch; ?dung all — dừng tất cả.
?tieptuc L1 — chạy lại sau 10 phút (với lịch PR).
?xoa L1 — xóa lịch.

Lịch giữ qua restart, không gửi bù dồn khi host tắt. Gửi lỗi thì dừng lịch, không tự thử lại khi không rõ kết quả. Tin đã bắt đầu gửi có thể vẫn đến sau khi dừng. Botkeep phải chạy và kết nối Zalo.

Nhạc
?nhac tên bài hoặc ?scl link SoundCloud — voice kèm ảnh, tối đa ${Math.floor(maxDuration / 60)} phút.
!scl randoom hoặc !scl random — bài trong bảng xếp hạng VN/quốc tế, tìm bản SoundCloud đủ dài, tránh lặp 80 lượt random gần đây. Không tải được nguồn thì báo lỗi, không dùng danh sách cố định.\n?kiemtra — kiểm tra công cụ. ?help — hướng dẫn này.
Các lệnh cũ vẫn được giữ để tương thích.`;
}
export function createControl(api, { statePath, prefix = '!', now = Date.now, autoStart = true, requestTimeout = 30000, maxDuration = 600 }) {
  let state = { version: 1, mainGroup: null, nextId: 1, jobs: [] };
  function validateState(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.jobs) ||
        !Number.isSafeInteger(value.nextId) || value.nextId < 1 ||
        !(value.mainGroup === null || /^\d+$/.test(value.mainGroup) && typeof value.mainGroup === 'string')) return false;
    const ids = new Set();
    return value.jobs.every(j => {
      if (!j || !/^L[1-9]\d*$/.test(j.id) || ids.has(j.id) || Number(j.id.slice(1)) >= value.nextId ||
          typeof j.target !== 'string' || !/^\d+$/.test(j.target) || typeof j.text !== 'string' || !j.text || j.text.length > 4000 ||
          !Number.isSafeInteger(j.interval) || j.interval < 1000 || j.interval > 604800000 ||
          !Number.isSafeInteger(j.rest) || j.rest < 0 || j.rest > 604800000 ||
          !Number.isInteger(j.count) || j.count < 1 || j.count > 1000 || !Number.isInteger(j.sent) || j.sent < 0 || j.sent >= j.count ||
          !Number.isSafeInteger(j.nextAt) || j.nextAt < 0 || typeof j.paused !== 'boolean') return false;
      if (j.kind !== undefined && j.kind !== 'pr') return false;
      if (j.originGroup !== undefined && (typeof j.originGroup !== 'string' || !/^\d+$/.test(j.originGroup))) return false;
      if (j.kind === 'pr' && (j.interval !== 600000 || j.count !== 1 || j.rest !== 0)) return false;
      ids.add(j.id);
      if (j.messages !== undefined && (!Array.isArray(j.messages) || !j.messages.length || j.messages.length > 50 ||
          j.messages.some(m => typeof m !== 'string' || !m || m.length > 4000) ||
          j.messages.reduce((n, m) => n + m.length, 0) > 20000 || !Number.isSafeInteger(j.cursor) || j.cursor < 0 || j.cursor >= j.messages.length)) return false;
      return true;
    });
  }
  if (existsSync(statePath)) {
    try {
      const saved = JSON.parse(readFileSync(statePath, 'utf8'));
      if (!validateState(saved)) throw new Error();
      state = saved;
    } catch { throw Object.assign(new Error('Không đọc được data/control.json. Giữ bản sao và kiểm tra file; không cần xóa phiên Zalo.'), { code: 'CONTROL_STATE_INVALID' }); }
  }
  let generation = 0, enabled = autoStart;
  const save = () => {
    try {
      writeFileSync(`${statePath}.new`, JSON.stringify(state, null, 2), { mode: 0o600 });
      renameSync(`${statePath}.new`, statePath);
    } catch (error) {
      state.jobs.forEach(j => { j.paused = true; });
      console.error('Không lưu được control.json; các lịch trong phiên này đã dừng. Kiểm tra dung lượng và quyền ghi.');
      throw error;
    }
  };
  const send = (text, group) => deadline(() => api.sendMessage(text, group, ThreadType.Group), requestTimeout);
  // Giữ tên API cũ để tương thích; không còn nhóm điều khiển độc quyền.
  const isMain = () => true;
  const commands = new Set(['setup', 'help', 'list', 'gui', 'tudong', 'lich', 'dung', 'tieptuc', 'xoa', 'mau', 'pr']);
  const duplicate = createDeduper();
  const readCooldown = new Map();
  function split(arg, count) {
    const parts = []; let rest = arg;
    for (let i = 0; i < count - 1; i++) { const at = rest.indexOf('|'); if (at < 0) throw new Error(`Thiếu dấu |. Gõ ?help để xem cú pháp.`); parts.push(rest.slice(0, at).trim()); rest = rest.slice(at + 1); }
    return [...parts, rest.trim()];
  }
  async function targetExists(id) {
    const all = await deadline(() => api.getAllGroups(), requestTimeout);
    if (!/^\d+$/.test(id) || !Object.hasOwn(all.gridVerMap || {}, id)) throw new Error(`ID nhóm không hợp lệ hoặc bot chưa tham gia. Gõ ?list để lấy ID.`);
  }
  function validateText(text) {
    if (!text || text.length > 4000) throw new Error('Nội dung cần từ 1 đến 4000 ký tự.');
    if (text.startsWith(prefix) || text.startsWith('?') || text.startsWith('!')) throw new Error(`Nội dung không được bắt đầu bằng ?, tránh bot tự gọi lệnh.`);
  }
  async function handle(event) {
    if (event.type !== ThreadType.Group || typeof event.data?.content !== 'string') return false;
    const text = event.data.content.trim();
    const activePrefix = commandPrefix(text, prefix);
    if (!activePrefix) return false;
    const m = /^(\S+)(?:\s+([\s\S]*))?$/.exec(text.slice(activePrefix.length)); if (!m) return false;
    const name = m[1].toLowerCase(), arg = m[2] || '', group = String(event.threadId);
    if (!commands.has(name)) return false;
    if (duplicate(event)) return true;
    const token = generation;
    if (['setup', 'help', 'list', 'lich', 'mau'].includes(name)) {
      const key = `${group}:${event.data.uidFrom}:${name}`;
      if (readCooldown.has(key) && now() - readCooldown.get(key) < 1500) return true;
      readCooldown.set(key, now());
      if (readCooldown.size > 500) readCooldown.delete(readCooldown.keys().next().value);
    }
    const say = msg => send(msg, group);
    try {
      if (name === 'setup') {
        await say('Bot dùng được ngay trong mọi nhóm đã tham gia, không cần setup.\n?help — hướng dẫn · ?list — danh sách nhóm');
      } else if (name === 'help') await say(controlHelp('?', maxDuration));
      else if (name === 'mau') {
        await say(`Nội dung luân phiên\nSoạn các câu, ngăn bằng ||.\nVí dụ: ?tudong ID_NHOM | 30m | 4 | 2h | Câu một || Câu hai\nBot chỉ gửi nội dung bạn nhập.`);
      } else if (name === 'list') {
        const ids = Object.keys((await deadline(() => api.getAllGroups(), requestTimeout)).gridVerMap || {}).sort();
        if (token !== generation) return true;
        if (!ids.length) { await say('Chưa tìm thấy nhóm nào.'); return true; }
        const page = pageOf(ids, arg);
        let info = {};
        try { info = (await deadline(() => api.getGroupInfo(page.items), requestTimeout)).gridInfoMap || {}; } catch {}
        if (token !== generation) return true;
        const rows = page.items.map((id, i) => `${page.offset + i + 1}. ${String(info[id]?.name || 'Chưa lấy được tên').replace(/[\r\n]/g, ' ').slice(0, 100)}\n${id}`);
        await say(`Nhóm · ${page.page}/${page.total}\n\n${rows.join('\n\n')}\n\nDùng ID đầy đủ để gửi.${page.page < page.total ? ` Trang tiếp: ?list ${page.page + 1}` : ''}`);
      } else if (name === 'pr') {
        const parts = arg.split('|').map(s => s.trim());
        if (parts.length < 2) throw new Error('Nội dung lệnh: ?pr ID_NHOM | câu một | câu hai');
        const [target, ...messages] = parts;
        if (arg.length > 20000 || messages.length > 50) throw new Error('Nội dung tối đa 50 câu, tổng đầu vào tối đa 20000 ký tự.');
        for (const text of messages) validateText(text);
        await targetExists(target);
        if (!isMain(group) || token !== generation) return true;
        const previous = state.jobs.find(j => j.kind === 'pr' && j.target === target);
        const existed = !!previous;
        // Thay object để kết quả gửi của lịch cũ không ghi đè lịch vừa cập nhật.
        const job = { id: previous?.id || `L${state.nextId++}`, target, originGroup: group, kind: 'pr', text: messages[0], messages, cursor: 0, interval: 600000, rest: 0, count: 1, sent: 0, nextAt: now() + 600000, paused: false };
        if (previous) state.jobs[state.jobs.indexOf(previous)] = job;
        else state.jobs.push(job);
        save();
        await say(`${existed ? 'Đã cập nhật' : 'Đã tạo'} ${job.id} → ${target}\n${messages.length} nội dung · 10 phút/lượt\nLần đầu sau 10 phút.\n?dung ${job.id} — dừng`);
      } else if (name === 'gui') {
        const [target, content] = split(arg, 2); validateText(content); await targetExists(target);
        if (!isMain(group) || token !== generation) return true;
        await send(content, target); await say(`Đã gửi tới nhóm ${target}.`);
      } else if (name === 'tudong') {
        const [target, intervalText, countText, restText, content] = split(arg, 5);
        const interval = parseDuration(intervalText), rest = parseDuration(restText, true), count = Number(countText);
        if (!/^\d+$/.test(countText) || !Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Số lần mỗi đợt cần từ 1 đến 1000.');
        const messages = resolveMessages(content, prefix); await targetExists(target);
        if (!isMain(group) || token !== generation) return true;
        const job = { id: `L${state.nextId++}`, target, originGroup: group, text: messages[0], messages, cursor: 0, interval, rest, count, sent: 0, nextAt: now() + interval, paused: false };
        state.jobs.push(job); save();
        await say(`Lịch ${job.id} · Đang chạy\nNhóm: ${target}\nMỗi ${durationText(interval)} · ${count} lượt/đợt\nNghỉ: ${durationText(rest)} · ${messages.length} câu luân phiên\nLần đầu sau ${durationText(interval)}.\n?dung ${job.id} — tạm dừng`);
      } else if (name === 'lich') {
        if (!state.jobs.length) { await say(`Chưa có lịch. ?help để xem cách tạo.`); return true; }
        const id = arg.trim().toUpperCase();
        if (/^L/.test(id)) {
          const j = state.jobs.find(j => j.id === id);
          if (!j) throw new Error(`Không tìm thấy ${id}. Dùng ?lich để xem danh sách.`);
          const next = (j.messages || [j.text])[j.cursor || 0];
          await say(`${j.id} · ${j.paused ? 'Tạm dừng' : 'Đang chạy'}\nNhóm: ${j.target}\nMỗi ${durationText(j.interval)} · ${j.count} lượt/đợt\nNghỉ: ${durationText(j.rest)}\nCâu tiếp: ${(j.cursor || 0) + 1}/${j.messages?.length || 1}\n${j.paused ? 'Chờ tiếp tục' : 'Lần tới: ' + new Date(j.nextAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\n${next.slice(0, 2400)}${next.length > 2400 ? '…' : ''}`);
        } else {
          const page = pageOf(state.jobs, arg, 5);
          await say(`Lịch gửi · ${page.page}/${page.total}\n\n${page.items.map(j => `${j.id} · ${j.paused ? 'Tạm dừng' : 'Đang chạy'} → ${j.target}\nMỗi ${durationText(j.interval)} · ${j.count} lượt · nghỉ ${durationText(j.rest)}\n${(j.messages?.[j.cursor] || j.text).replace(/\s+/g, ' ').slice(0, 90)}`).join('\n\n')}\n\n?lich L1 — chi tiết${page.page < page.total ? ` · ?lich ${page.page + 1} — trang tiếp` : ''}`);
        }
      } else if (name === 'dung' && arg.trim().toLowerCase() === 'all') {
        state.jobs.forEach(j => { j.paused = true; }); save(); await say('Đã dừng tất cả lịch.');
      } else {
        const id = arg.trim().toUpperCase(), job = state.jobs.find(j => j.id === id);
        if (!job) throw new Error(`Không tìm thấy mã lịch. Gõ ?lich để xem.`);
        if (name === 'xoa') state.jobs = state.jobs.filter(j => j !== job);
        else if (name === 'dung') job.paused = true;
        else { job.paused = false; job.sent = 0; job.nextAt = now() + job.interval; }
        save(); await say(`${id}: ${name === 'xoa' ? 'đã xóa' : name === 'dung' ? 'đã dừng' : 'đã tiếp tục'}.`);
      }
    } catch (error) {
      if (name !== 'setup' && token !== generation) return true;
      const msg = /^(Thời gian|Thiếu dấu|ID nhóm|Nội dung|Số lần|Đã có|Không tìm thấy|Trang)/.test(error.message || '') ? error.message : 'Chưa thực hiện được. Kiểm tra quyền gửi tin, kết nối và thử lại.';
      await say(msg);
    }
    return true;
  }
  let busy = false, timer;
  async function tick() {
    if (busy) return;
    const token = generation;
    busy = true;
    try {
      for (const job of [...state.jobs]) {
        if (token !== generation) break;
        if (!state.jobs.includes(job) || job.paused || job.nextAt > now()) continue;
        const messages = job.messages || [job.text];
        const content = messages[job.cursor || 0];
        if (content.trimStart().startsWith(prefix) || content.trimStart().startsWith('?') || content.trimStart().startsWith('!')) {
          job.paused = true; save();
          try { await send(`${job.id} đã dừng: nội dung bắt đầu bằng tiền tố lệnh hiện tại. Xóa lịch và sửa nội dung trước khi tạo lại.`, job.originGroup || state.mainGroup || job.target); } catch {}
          continue;
        }
        job.cursor = ((job.cursor || 0) + 1) % messages.length;
        job.sent++; const end = job.sent >= job.count; if (end) job.sent = 0;
        job.nextAt = now() + (end && job.rest > 0 ? job.rest : job.interval); save();
        try { await send(content, job.target); }
        catch {
          if (!state.jobs.includes(job)) continue;
          job.paused = true; save();
          if (token !== generation) continue;
          try { await send(`${job.id} đã dừng vì gửi tin không thành công. Kiểm tra nhóm đích rồi dùng ?tieptuc ${job.id}.`, job.originGroup || state.mainGroup || job.target); } catch {}
        }
      }
    } finally { busy = false; }
  }
  function start() { enabled = true; if (!timer) { timer = setInterval(() => (enabled ? tick() : Promise.resolve()).catch(() => console.error('Không cập nhật được lịch; kiểm tra data/control.json và dung lượng host.')), 1000); timer.unref?.(); } }
  if (autoStart) start();
  return { handle, isMain, tick, start, token: () => generation, isCurrent: (group, token) => isMain(group) && token === generation, stop: () => { enabled = false; generation++; clearInterval(timer); timer = undefined; }, snapshot: () => structuredClone(state) };
}
