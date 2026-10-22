import { ThreadType } from 'zca-js';
import { prepareMusic, checkTools, inspectTrack } from './music.mjs';
import { diagnosticMessage, redactDiagnostics } from './process.mjs';
import { createMusicCard, durationLabel } from './card.mjs';

export function createHandler(api, config, prepare = prepareMusic, options = {}) {
  const makeCard = options.card || createMusicCard;
  const toolsCheck = options.tools || checkTools;
  const inspect = options.inspect || inspectTrack;
  const now = options.now || Date.now;
  const seen = new Set();
  const cooldown = new Map();
  const recent = new Map();
  const lastError = new Map();
  let queue = Promise.resolve(), pending = 0;

  function logError(error) {
    console.error('Lỗi xử lý nhạc:', error.code || error.name || 'Error', error.exitCode ?? '',
      error.stage || '', error.tool || '', error.reason || '');
    if (error.code === 'MEDIA_PROCESS_FAILED') console.error(diagnosticMessage(error));
    if (error.detail) console.error('Chi tiết (đã ẩn URL/credential):', redactDiagnostics(error.detail));
  }

  function friendlyError(error) {
    if (/^(Nhập tên|Link |Bản này nhận|Không tìm thấy bài|Không xác định được thời lượng|Bài dài quá|Bài hát vượt)/.test(error.message || '')) return error.message;
    if (error.reason === 'RATE_LIMIT') return 'Nguồn nhạc đang giới hạn lượt tải. Bạn thử lại sau một lúc nhé.';
    if (['NOT_FOUND', 'UNSUPPORTED_URL', 'UNAVAILABLE'].includes(error.reason)) return 'Bài này không tải được. Bạn thử link SoundCloud khác nhé.';
    return 'Chưa gửi được bài này. Bạn thử bài khác hoặc thử lại sau nhé.';
  }

  return async function handle(event) {
    if (event.type !== ThreadType.Group || typeof event.data?.content !== 'string') return;
    const text = event.data.content.trim();
    if (!text.startsWith(config.prefix)) return;
    const [command, ...words] = text.slice(config.prefix.length).split(/\s+/);
    const name = command.toLowerCase();
    if (!['help', 'id', 'nhac', 'scl', 'kiemtra'].includes(name)) return;
    const group = String(event.threadId), author = String(event.data.uidFrom);
    if (config.groups.size && !config.groups.has(group)) return;
    if (config.users.size && !config.users.has(author)) return;
    const key = `${group}:${event.data.msgId ?? event.data.cliMsgId}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (seen.size > 300) seen.delete(seen.values().next().value);
    const say = msg => api.sendMessage(msg, group, event.type);
    if (name === 'id') return say(`ID nhóm: ${group}\nUID của bạn: ${author}`);
    if (name === 'help') {
      return say(`Lệnh nhạc:\n${config.prefix}nhac tên bài hoặc ${config.prefix}scl link SoundCloud\nBot gửi voice kèm ảnh bài hát, tối đa ${Math.floor(config.maxDuration / 60)} phút.\n${config.prefix}id: ID nhóm · ${config.prefix}kiemtra: kiểm tra kết nối.`);
    }
    if (!words.length && name !== 'kiemtra') return say(`Dùng ${config.prefix}${name} tên bài hát hoặc link SoundCloud.`);

    const input = words.join(' ');
    const request = `${group}:${name === 'kiemtra' ? 'check:' : ''}${input.toLowerCase()}`;
    const timestamp = now();
    if (recent.has(request) && timestamp - recent.get(request) < 30_000) return;
    if (cooldown.has(author) && timestamp - cooldown.get(author) < 10_000) return;
    // Một bài chạy, tối đa hai bài đợi. Bỏ yêu cầu trùng/quá giới hạn mà không spam nhóm.
    if (pending >= 3) return;
    recent.set(request, timestamp);
    cooldown.set(author, timestamp);
    if (cooldown.size > 500) cooldown.delete(cooldown.keys().next().value);
    if (recent.size > 500) recent.delete(recent.keys().next().value);
    pending++;
    const job = queue.then(async () => {
      let audio;
      try {
        if (name === 'kiemtra') {
          const tools = await toolsCheck();
          const sample = await inspect(input || 'https://soundcloud.com/kevin-9-1/carefree');
          console.log('Kiểm tra nhạc OK:', JSON.stringify(tools), 'SoundCloud tìm được bài.');
          return await say('Kiểm tra OK: công cụ nhạc và kết nối SoundCloud hoạt động.');
        }
        audio = await prepare(input, config.maxDuration);
        let card;
        try { card = await makeCard(audio); }
        catch { console.warn('Không tạo được ảnh bài hát; sẽ dùng một dòng thông tin ngắn.'); }
        const uploads = await api.uploadAttachment(audio.audioPath, group, event.type);
        const attachment = uploads.find(x => x.fileType === 'others' && x.fileUrl);
        if (!attachment) throw new Error('Zalo chưa trả về đường dẫn âm thanh sau khi tải lên.');
        await api.sendVoice({ voiceUrl: attachment.fileUrl }, group, event.type);
        // Lỗi ảnh sau khi voice đã gửi không được báo thành lỗi cả bài hoặc gửi voice lần nữa.
        let imageSent = false;
        if (card) {
          try {
            await api.sendMessage({ msg: '', attachments: [card] }, group, event.type);
            imageSent = true;
          } catch { console.warn('Voice đã gửi; ảnh chưa gửi được.'); }
        }
        if (!imageSent) {
          try { await say(`🎵 ${audio.title}${audio.artist ? ` · ${audio.artist}` : ''} · ${durationLabel(audio.duration)}`); }
          catch { console.warn('Voice đã gửi; không gửi được dòng thông tin kèm theo.'); }
        }
        console.log('Đã gửi một bài nhạc dạng voice', imageSent ? 'kèm ảnh.' : 'kèm thông tin chữ.');
      } catch (error) {
        logError(error);
        if (!lastError.has(group) || now() - lastError.get(group) >= 30_000) {
          lastError.set(group, now());
          if (lastError.size > 500) lastError.delete(lastError.keys().next().value);
          await say(friendlyError(error));
        }
      } finally {
        try { await audio?.cleanup(); } catch { console.warn('Không xóa được file nhạc tạm.'); }
        pending--;
      }
    });
    queue = job.catch(() => {});
    return job;
  };
}
