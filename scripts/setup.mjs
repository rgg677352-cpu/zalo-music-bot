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
console.log('Cài xong. Chạy npm run doctor để kiểm tra, npm start để đăng nhập QR.');
