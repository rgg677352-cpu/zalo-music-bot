import { ThreadType } from 'zca-js';
import { prepareMusic, checkTools, inspectTrack } from './music.mjs';
import { diagnosticMessage, redactDiagnostics } from './process.mjs';

export function createHandler(api, config, prepare = prepareMusic) {
  const seen = new Set();
  let busy = false;
  const cooldown = new Map();
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
    if (name === 'help' || (!words.length && name !== 'kiemtra')) {
      return say(`Bot nhạc SoundCloud\n${config.prefix}nhac tên bài hát - ca sĩ\n${config.prefix}scl link SoundCloud\n${config.prefix}id — xem ID nhóm và UID\n${config.prefix}kiemtra — kiểm tra công cụ và kết nối SoundCloud\nTối đa ${Math.floor(config.maxDuration / 60)} phút/bài. Gửi dưới dạng tin nhắn thoại.`);
    }
    if (busy) return say('Bot đang xử lý một bài nhạc. Bạn đợi xong rồi gửi lại nhé.');
    if (Date.now() - (cooldown.get(author) || 0) < 15_000) return;
    cooldown.set(author, Date.now());
    if (cooldown.size > 500) cooldown.delete(cooldown.keys().next().value);
    busy = true;
    let audio;
    try {
      if (name === 'kiemtra') {
        await say('Đang kiểm tra công cụ nhạc và kết nối SoundCloud…');
        const tools = await checkTools();
        console.log('Công cụ:', JSON.stringify(tools));
        const sample = await inspectTrack(words.join(' ') || 'https://soundcloud.com/kevin-9-1/carefree');
        return await say(`Công cụ OK: yt-dlp ${tools.ytVersion}, FFmpeg OK.\nKết nối/tìm SoundCloud OK: ${sample.title}\nBước kiểm tra này chưa tải toàn bộ bài hoặc gửi voice.`);
      }
      await say('Đang tìm và tải nhạc…');
      audio = await prepare(words.join(' '), config.maxDuration);
      const uploads = await api.uploadAttachment(audio.audioPath, group, event.type);
      const attachment = uploads.find(x => x.fileType === 'others' && x.fileUrl);
      if (!attachment) throw new Error('Zalo chưa trả về đường dẫn âm thanh sau khi tải lên.');
      // Upload chỉ lấy URL; sendVoice quyết định giao diện voice trong nhóm.
      await api.sendVoice({ voiceUrl: attachment.fileUrl }, group, event.type);
      await say(`🎵 ${audio.title}\n${audio.url}`);
      console.log('Đã gửi một bài nhạc dạng voice.');
    } catch (error) {
      console.error('Lỗi xử lý nhạc:', error.code || error.name || 'Error', error.exitCode ?? '',
        error.stage || '', error.tool || '', error.reason || '');
      if (error.detail) console.error('Chi tiết (đã ẩn URL/credential):', redactDiagnostics(error.detail));
      await say(error.code === 'MEDIA_PROCESS_FAILED'
        ? diagnosticMessage(error)
        : (error.name === 'ZaloApiError'
          ? 'Zalo chưa nhận được tin nhắn thoại. Hãy kiểm tra quyền gửi tin và thử restart bot.'
          : (error.message || 'Không gửi được nhạc. Hãy thử lại sau.')));
    } finally {
      try { await audio?.cleanup(); } catch { console.warn('Không xóa được file nhạc tạm.'); }
      busy = false;
    }
  };
}
