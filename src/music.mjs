import { mkdtemp, readdir, stat, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { run } from './process.mjs';

export const downloader = fileURLToPath(new URL('../bin/yt-dlp', import.meta.url));
export const tempRoot = fileURLToPath(new URL('../tmp/', import.meta.url));
export const runtimeTemp = join(tempRoot, 'native');
const common = ['--ignore-config', '--no-cache-dir', '--no-playlist', '--playlist-items', '1', '--no-warnings',
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
    if (/\.(?:mjs|js|py|zip)$/i.test(url.pathname)) {
      throw new Error('Link đang dính tên file code (ví dụ index.mjs). Hãy sao chép lại link bài hát từ SoundCloud.');
    }
    if (url.hostname === 'm.soundcloud.com' || url.hostname === 'www.soundcloud.com') url.hostname = 'soundcloud.com';
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

export async function runDownloader(args, options = {}, execute = run) {
  // PyInstaller cần thư mục có thể chạy file; không phụ thuộc /tmp của container.
  await mkdir(runtimeTemp, { recursive: true, mode: 0o700 });
  const settings = { ...options, env: { ...options.env, TMPDIR: runtimeTemp } };
  try {
    return await execute(downloader, [...common, ...args], settings);
  } catch (error) {
    // Một số host dùng CA hệ thống/proxy; chỉ đổi kho CA khi gặp đúng lỗi TLS.
    // Không bao giờ tắt kiểm tra chứng chỉ HTTPS.
    if (error.reason !== 'TLS') throw error;
    console.log(`[${options.stage || 'runtime'}] Đang thử lại với kho chứng chỉ hệ thống.`);
    return execute(downloader, ['--compat-options', 'no-certifi', ...common, ...args], settings);
  }
}

export async function inspectTrack(input, maxDuration = 600) {
  const target = soundCloudTarget(input);
  const info = await runDownloader(['--dump-single-json', '--skip-download', '--', target], { timeout: 70_000, stage: 'tim-nhac' });
  return pickTrack(JSON.parse(info), maxDuration);
}

export async function checkTools() {
  const ytVersion = await runDownloader(['--version'], { timeout: 25_000, stage: 'kiem-tra-yt-dlp' });
  const ffVersion = (await run(ffmpeg, ['-version'], { timeout: 20_000, stage: 'kiem-tra-ffmpeg' })).split('\n')[0];
  return { ytVersion, ffVersion };
}

export async function prepareMusic(input, maxDuration = 600) {
  const track = await inspectTrack(input, maxDuration);
  await mkdir(tempRoot, { recursive: true });
  const directory = await mkdtemp(join(tempRoot, 'track-'));
  try {
    await runDownloader(['--format', 'bestaudio/best', '--max-filesize', '30M',
      '--match-filter', `duration <= ${maxDuration}`, '--ffmpeg-location', ffmpeg,
      '--output', join(directory, 'source.%(ext)s'), '--', track.webpage_url], { stage: 'tai-nhac' });
    const names = (await readdir(directory)).filter(x => x.startsWith('source.') && !x.endsWith('.part') && !x.endsWith('.ytdl'));
    if (names.length !== 1) throw new Error('Không tải được bài hát hoặc bài vượt giới hạn dung lượng.');
    const source = join(directory, names[0]);
    if ((await stat(source)).size > maxFileSize) throw new Error('Bài hát vượt giới hạn 30 MB.');
    const audioPath = join(directory, 'voice.aac');
    await run(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
      '-vn', '-t', String(maxDuration), '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', '-f', 'adts', audioPath], { stage: 'chuyen-aac' });
    return {
      audioPath,
      title: String(track.title || 'Nhạc SoundCloud').replace(/[\r\n]/g, ' ').slice(0, 180),
      artist: String(track.artist || track.uploader || track.creator || 'SoundCloud').slice(0, 100),
      thumbnail: track.thumbnail || track.thumbnails?.at(-1)?.url || null,
      url: track.webpage_url,
      duration: track.duration,
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
