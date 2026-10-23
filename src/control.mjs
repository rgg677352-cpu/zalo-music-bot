import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { ThreadType } from 'zca-js';
export function parseDuration(value, zero = false) {
  const m = /^(\d+)(s|giay|m|phut|h|gio)$/i.exec(value.trim());
  const n = m && Number(m[1]) * (/^(m|phut)$/i.test(m[2]) ? 60000 : /^(h|gio)$/i.test(m[2]) ? 3600000 : 1000);
  if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1000) || n > 604800000) throw new Error('Thời gian cần dạng 30s, 5m hoặc 1h, tối đa 7 ngày. Khoảng gửi ít nhất 1 giây; nghỉ có thể là 0s.');
  return n;
}
export function controlHelp(p = '!') {
  return `HƯỚNG DẪN BOT\n\nNHÓM ĐIỀU KHIỂN\n${p}setup: tài khoản Zalo đang chạy bot nhắn để chọn/đổi nhóm chính. Ai trong nhóm chính cũng được điều khiển. Nhóm khác không nhận lệnh. Đổi nhóm chính sẽ dừng các lịch cũ.\n${p}list: tên và ID tất cả nhóm tài khoản bot tham gia. Dùng ID đầy đủ, không dùng số thứ tự.\n${p}id: ID nhóm hiện tại và UID người nhắn.\n\nGỬI NGAY\n${p}gui ID_NHOM | Nội dung\nVí dụ: ${p}gui 123456789 | Chào mọi người\nTài khoản bot cần ở trong nhóm đích và có quyền nhắn.\n\nGỬI LẶP VÀ NGHỈ\n${p}tudong ID_NHOM | khoảng gửi | số lần mỗi đợt | nghỉ | nội dung\nVí dụ: ${p}tudong 123456789 | 30s | 5 | 10m | Nhớ uống nước nhé\nBot đợi 30 giây rồi gửi lần đầu; mỗi lần cách 30 giây. Đủ 5 lần thì nghỉ 10 phút rồi gửi đợt mới. Nghỉ thay khoảng chờ giữa hai đợt. 0s = không nghỉ thêm, vẫn chờ khoảng gửi.\nĐơn vị: s = giây, m = phút, h = giờ. Ví dụ 15s, 2m, 1h; muốn 1 phút 30 giây thì nhập 90s. Số lần/đợt: 1–1000. Mỗi lịch một nhóm, có thể tạo nhiều lịch riêng.\n\nQUẢN LÝ LỊCH\n${p}lich: mã lịch, ID nhóm, nội dung, trạng thái, lần gửi tới theo giờ Việt Nam.\n${p}dung MA_LICH hoặc ${p}dung all: tạm dừng.\n${p}tieptuc MA_LICH: chạy lại, bắt đầu đợt mới sau khoảng gửi.\n${p}xoa MA_LICH: xóa hẳn lịch.\nKhởi động lại vẫn giữ lịch, không gửi bù dồn khi host tắt. Gửi lỗi thì lịch tự dừng và báo một lần ở nhóm chính. Tin đang gửi có thể vẫn đến sau khi dừng. Botkeep phải chạy thì lịch mới hoạt động.\nNội dung là chữ, không bắt đầu bằng ${p} để tránh bot tự gọi lệnh.\n\nNHẠC\n${p}nhac tên bài hoặc ${p}scl link SoundCloud: voice kèm ảnh, tối đa 10 phút.\n${p}kiemtra: kiểm tra công cụ nhạc.\n${p}help: xem lại hướng dẫn.`;
}
export function createControl(api, { statePath, prefix = '!', now = Date.now, ownerId = String(api.getOwnId()), autoStart = true }) {
  let state = { version: 1, mainGroup: null, nextId: 1, jobs: [] };
  if (existsSync(statePath)) {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.jobs) || !Number.isSafeInteger(state.nextId) || !(state.mainGroup === null || typeof state.mainGroup === 'string') || state.jobs.some(j => !/^L\d+$/.test(j.id) || !/^\d+$/.test(j.target) || typeof j.text !== 'string' || !Number.isSafeInteger(j.interval) || j.interval < 1000 || !Number.isSafeInteger(j.rest) || j.rest < 0 || !Number.isInteger(j.count) || j.count < 1 || j.count > 1000 || !Number.isInteger(j.sent) || !Number.isFinite(j.nextAt) || typeof j.paused !== 'boolean')) throw new Error('File control.json không hợp lệ.');
  }
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
  const send = (text, group) => api.sendMessage(text, group, ThreadType.Group);
  const isMain = group => state.mainGroup === String(group);
  const commands = new Set(['setup', 'help', 'list', 'gui', 'tudong', 'lich', 'dung', 'tieptuc', 'xoa']);
  const seen = new Set();
  function split(arg, count) {
    const parts = []; let rest = arg;
    for (let i = 0; i < count - 1; i++) { const at = rest.indexOf('|'); if (at < 0) throw new Error(`Thiếu dấu |. Gõ ${prefix}help để xem cú pháp.`); parts.push(rest.slice(0, at).trim()); rest = rest.slice(at + 1); }
    return [...parts, rest.trim()];
  }
  async function targetExists(id) {
    const all = await api.getAllGroups();
    if (!/^\d+$/.test(id) || !Object.hasOwn(all.gridVerMap || {}, id)) throw new Error(`ID nhóm không hợp lệ hoặc bot chưa tham gia. Gõ ${prefix}list để lấy ID.`);
  }
  function validateText(text) {
    if (!text || text.length > 4000) throw new Error('Nội dung cần từ 1 đến 4000 ký tự.');
    if (text.startsWith(prefix)) throw new Error(`Nội dung không được bắt đầu bằng ${prefix}, tránh bot tự gọi lệnh.`);
  }
  async function handle(event) {
    if (event.type !== ThreadType.Group || typeof event.data?.content !== 'string') return false;
    const text = event.data.content.trim(); if (!text.startsWith(prefix)) return false;
    const m = /^(\S+)(?:\s+([\s\S]*))?$/.exec(text.slice(prefix.length)); if (!m) return false;
    const name = m[1].toLowerCase(), arg = m[2] || '', group = String(event.threadId);
    if (!commands.has(name)) return false;
    if (name === 'setup' ? String(event.data.uidFrom) !== ownerId : !isMain(group)) return true;
    const key = `${group}:${event.data.msgId ?? event.data.cliMsgId}`;
    if (seen.has(key)) return true; seen.add(key); if (seen.size > 500) seen.delete(seen.values().next().value);
    const say = msg => send(msg, group);
    try {
      if (name === 'setup') {
        if (!isMain(group)) { state.mainGroup = group; state.jobs.forEach(j => { j.paused = true; }); save(); }
        await say(`Đã đặt đây là nhóm chính. Mọi thành viên ở đây được điều khiển bot. Lịch từ nhóm chính cũ đã dừng (nếu có). Gõ ${prefix}help để xem hướng dẫn.`);
      } else if (name === 'help') await say(controlHelp(prefix));
      else if (name === 'list') {
        const ids = Object.keys((await api.getAllGroups()).gridVerMap || {}), lines = [];
        for (let i = 0; i < ids.length; i += 20) {
          const batch = ids.slice(i, i + 20); let info = {};
          try { info = (await api.getGroupInfo(batch)).gridInfoMap || {}; } catch {}
          for (const id of batch) lines.push(`${lines.length + 1}. ${String(info[id]?.name || '(Chưa lấy được tên nhóm)').replace(/[\r\n]/g, ' ')}\nID: ${id}`);
        }
        if (!lines.length) await say('Chưa tìm thấy nhóm nào.');
        for (let i = 0; i < lines.length; i += 15) await say(`DANH SÁCH NHÓM (${i + 1}–${Math.min(i + 15, lines.length)}/${lines.length})\n${lines.slice(i, i + 15).join('\n\n')}`);
      } else if (name === 'gui') {
        const [target, content] = split(arg, 2); validateText(content); await targetExists(target);
        if (!isMain(group)) return true;
        await send(content, target); await say(`Đã gửi tới nhóm ${target}.`);
      } else if (name === 'tudong') {
        const [target, intervalText, countText, restText, content] = split(arg, 5);
        const interval = parseDuration(intervalText), rest = parseDuration(restText, true), count = Number(countText);
        if (!/^\d+$/.test(countText) || !Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Số lần mỗi đợt cần từ 1 đến 1000.');
        validateText(content); await targetExists(target);
        if (!isMain(group)) return true;
        if (state.jobs.length >= 100) throw new Error('Đã có 100 lịch. Xóa lịch cũ trước khi thêm.');
        const job = { id: `L${state.nextId++}`, target, text: content, interval, rest, count, sent: 0, nextAt: now() + interval, paused: false };
        state.jobs.push(job); save();
        await say(`Đã tạo ${job.id} → ${target}. Mỗi ${interval / 1000}s, ${count} lần/đợt, nghỉ ${rest / 1000}s. Gửi lần đầu sau ${interval / 1000}s. Dừng: ${prefix}dung ${job.id}`);
      } else if (name === 'lich') {
        if (!state.jobs.length) await say(`Chưa có lịch. Gõ ${prefix}help để tạo.`);
        for (let i = 0; i < state.jobs.length; i += 5) await say(`LỊCH GỬI\n${state.jobs.slice(i, i + 5).map(j => `${j.id} → ${j.target} · ${j.paused ? 'ĐÃ DỪNG' : 'ĐANG CHẠY'}\nMỗi ${j.interval / 1000}s · ${j.count} lần/đợt · nghỉ ${j.rest / 1000}s\n${j.paused ? 'Chờ tiếp tục' : 'Lần tới: ' + new Date(j.nextAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\nNội dung: ${j.text.slice(0, 500)}${j.text.length > 500 ? '…' : ''}`).join('\n\n')}`);
      } else if (name === 'dung' && arg.trim().toLowerCase() === 'all') {
        state.jobs.forEach(j => { j.paused = true; }); save(); await say('Đã dừng tất cả lịch.');
      } else {
        const id = arg.trim().toUpperCase(), job = state.jobs.find(j => j.id === id);
        if (!job) throw new Error(`Không tìm thấy mã lịch. Gõ ${prefix}lich để xem.`);
        if (name === 'xoa') state.jobs = state.jobs.filter(j => j !== job);
        else if (name === 'dung') job.paused = true;
        else { job.paused = false; job.sent = 0; job.nextAt = now() + job.interval; }
        save(); await say(`${id}: ${name === 'xoa' ? 'đã xóa' : name === 'dung' ? 'đã dừng' : 'đã tiếp tục'}.`);
      }
    } catch (error) {
      const msg = /^(Thời gian|Thiếu dấu|ID nhóm|Nội dung|Số lần|Đã có|Không tìm thấy)/.test(error.message || '') ? error.message : 'Chưa thực hiện được. Kiểm tra quyền gửi tin, kết nối và thử lại.';
      await say(msg);
    }
    return true;
  }
  let busy = false, timer;
  async function tick() {
    if (busy || !state.mainGroup) return;
    busy = true;
    try {
      for (const job of [...state.jobs]) {
        if (!state.jobs.includes(job) || job.paused || job.nextAt > now()) continue;
        job.sent++; const end = job.sent >= job.count; if (end) job.sent = 0;
        job.nextAt = now() + (end && job.rest > 0 ? job.rest : job.interval); save();
        try { await send(job.text, job.target); }
        catch {
          if (state.jobs.includes(job)) { job.paused = true; save(); }
          try { await send(`${job.id} đã dừng vì gửi tin không thành công. Kiểm tra nhóm đích rồi dùng ${prefix}tieptuc ${job.id}.`, state.mainGroup); } catch {}
        }
      }
    } finally { busy = false; }
  }
  function start() { if (!timer) { timer = setInterval(() => tick().catch(() => console.error('Không cập nhật được lịch; kiểm tra data/control.json và dung lượng host.')), 1000); timer.unref?.(); } }
  if (autoStart) start();
  return { handle, isMain, tick, start, stop: () => { clearInterval(timer); timer = undefined; }, snapshot: () => structuredClone(state) };
}
