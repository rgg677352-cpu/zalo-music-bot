import { mkdtemp, readdir, stat, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { run } from './process.mjs';

export const downloader = fileURLToPath(new URL('../bin/yt-dlp', import.meta.url));
export const tempRoot = fileURLToPath(new URL('../tmp/', import.meta.url));
const common = ['--ignore-config', '--compat-options', 'no-certifi', '--no-cache-dir', '--no-playlist', '--playlist-items', '1', '--no-warnings',
  '--no-progress', '--no-colors', '--socket-timeout', '15', '--retries', '2', '--extractor-retries', '1'];
const maxFileSize = 30 * 1024 * 1024;

export function soundCloudTarget(input) {
  const text = String(input).trim();
  if (!text || text.length > 400) throw new Error('Nhập tên bài hát hoặc link SoundCloud (tối đa 400 ký tự).');
  if (/^https?:\/\//i.test(text)) {
    let url;
    try { url = new URL(text); } catch { throw new Error('Link không hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !(url.hostname === 'soundcloud.com' || url.hostname.endsWith('.soundcloud.com'))) {
      throw new Error('Bản này nhận link HTTPS của SoundCloud. Bạn cũng có thể nhập tên bài hát.');
    }
    return url.href;
  }
  return `scsearch1:${text}`;
}

export function pickTrack(result, maxDuration) {
  const track = result.entries ? result.entries[0] : result;
  if (!track || !track.webpage_url) throw new Error('Không tìm thấy bài hát.');
  soundCloudTarget(track.webpage_url);
  if (!Number.isFinite(track.duration) || track.duration <= 0) {
    throw new Error('Không xác định được thời lượng. Hãy chọn link một bài hát khác.');
  }
  if (track.duration > maxDuration) throw new Error(`Bài dài quá ${Math.floor(maxDuration / 60)} phút. Hãy chọn bài ngắn hơn.`);
  return track;
}

export async function prepareMusic(input, maxDuration = 600) {
  const target = soundCloudTarget(input);
  const info = await run(downloader, [...common, '--dump-single-json', '--skip-download', '--', target], { timeout: 70_000 });
  const track = pickTrack(JSON.parse(info), maxDuration);
  await mkdir(tempRoot, { recursive: true });
  const directory = await mkdtemp(join(tempRoot, 'track-'));
  try {
    await run(downloader, [...common, '--format', 'bestaudio/best', '--max-filesize', '30M',
      '--match-filter', `duration <= ${maxDuration}`, '--ffmpeg-location', ffmpeg,
      '--output', join(directory, 'source.%(ext)s'), '--', track.webpage_url]);
    const names = (await readdir(directory)).filter(x => x.startsWith('source.') && !x.endsWith('.part') && !x.endsWith('.ytdl'));
    if (names.length !== 1) throw new Error('Không tải được bài hát hoặc bài vượt giới hạn dung lượng.');
    const source = join(directory, names[0]);
    if ((await stat(source)).size > maxFileSize) throw new Error('Bài hát vượt giới hạn 30 MB.');
    const audioPath = join(directory, 'voice.aac');
    await run(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
      '-vn', '-t', String(maxDuration), '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', '-f', 'adts', audioPath]);
    return {
      audioPath,
      title: String(track.title || 'Nhạc SoundCloud').replace(/[\r\n]/g, ' ').slice(0, 180),
      url: track.webpage_url,
      duration: track.duration,
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
