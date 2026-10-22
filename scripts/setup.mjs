import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, chmod, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Bản độc lập kèm Python: không cần apt, sudo hoặc Python của máy chủ.
const release = '2026.10.21';
const assets = {
  x64: ['yt-dlp_linux', 'd8bd33fca9d5b23bd5b9952b3fca36db5c46331933fda9f598a3da14ce2c243f'],
  arm64: ['yt-dlp_linux_aarch64', 'e137c2171b0b8ef648e6136e86aa70c65923e93e434f01c93901d64744b190aa'],
};
if (process.platform !== 'linux' || !assets[process.arch]) {
  throw new Error('Bản ZIP này dùng cho Linux x64/arm64, ví dụ máy chạy Node.js của Botkeep.');
}
const [asset, expected] = assets[process.arch];
const dir = fileURLToPath(new URL('../bin/', import.meta.url));
const destination = `${dir}yt-dlp`;
await mkdir(dir, { recursive: true });
const sha = data => createHash('sha256').update(data).digest('hex');
let installed = false;
try { installed = sha(await readFile(destination)) === expected; } catch {}
if (!installed) {
  console.log('Đang tải công cụ nhạc (~41 MB) từ dự án yt-dlp chính thức...');
  const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${release}/${asset}`, {
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Không tải được yt-dlp: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha(bytes) !== expected) throw new Error('yt-dlp không khớp SHA-256; không cài.');
  await writeFile(`${destination}.part`, bytes, { mode: 0o700 });
  await rename(`${destination}.part`, destination);
}
await chmod(destination, 0o700);
await rm(`${destination}.part`, { force: true });
// Font hỗ trợ tiếng Việt, tải đúng bản cố định và kiểm tra SHA-256.
const fontDir = fileURLToPath(new URL('../fonts/', import.meta.url));
const fontPath = `${fontDir}BeVietnamPro-Regular.ttf`;
const fontSha = 'cd1ef6e9d7db28ad5cdb88a65ccbe693870e60d340b791f349d248342b4fe4c3';
await mkdir(fontDir, { recursive: true });
let fontInstalled = false;
try { fontInstalled = sha(await readFile(fontPath)) === fontSha; } catch {}
if (!fontInstalled) {
  const response = await fetch('https://raw.githubusercontent.com/google/fonts/1cfe4cb468a703a247ca2d02410f80841b496218/ofl/bevietnampro/BeVietnamPro-Regular.ttf', { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Không tải được font ảnh nhạc: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha(bytes) !== fontSha) throw new Error('Font không khớp SHA-256; không cài.');
  await writeFile(`${fontPath}.part`, bytes);
  await rename(`${fontPath}.part`, fontPath);
}
console.log('Cài xong. Chạy npm run doctor để kiểm tra, npm start để đăng nhập QR.');
