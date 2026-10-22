import 'dotenv/config';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Zalo, LoginQRCallbackEventType } from 'zca-js';
import { createHandler } from './src/handler.mjs';
import { checkTools } from './src/music.mjs';
import { diagnosticMessage } from './src/process.mjs';

const dataDir = fileURLToPath(new URL('./data/', import.meta.url));
const sessionPath = `${dataDir}session.json`;
const qrPath = `${dataDir}qr.png`;
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const list = value => new Set(String(value || '').split(',').map(x => x.trim()).filter(Boolean));
const maxDuration = Number(process.env.MAX_DURATION_SECONDS || 600);
if (!Number.isInteger(maxDuration) || maxDuration < 30 || maxDuration > 600) {
  throw new Error('MAX_DURATION_SECONDS cần là số từ 30 đến 600.');
}
const prefix = process.env.PREFIX || '!';
if (!/^[!./#$?]{1,3}$/.test(prefix)) throw new Error('PREFIX cần từ 1–3 ký tự, ví dụ ! hoặc /.');

const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: false });
function saveSession(data) {
  writeFileSync(`${sessionPath}.new`, JSON.stringify(data), { mode: 0o600 });
  renameSync(`${sessionPath}.new`, sessionPath);
}
async function login() {
  if (existsSync(sessionPath)) {
    try {
      console.log('Đang khôi phục phiên Zalo đã lưu...');
      return await zalo.login(JSON.parse(readFileSync(sessionPath, 'utf8')));
    } catch {
      console.log('Phiên cũ không dùng được. Sẽ đăng nhập QR lại.');
      rmSync(sessionPath, { force: true });
    }
  }
  console.log('Đang tạo QR. Vào Files → data → qr.png để tải/mở ảnh rồi quét bằng Zalo.');
  return zalo.loginQR({ qrPath }, event => {
    if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
      writeFileSync(qrPath, Buffer.from(event.data.image, 'base64'), { mode: 0o600 });
      console.log('QR ĐÃ SẴN SÀNG: Files → data/qr.png. Quét và xác nhận trên điện thoại.');
    } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
      console.log('QR hết hạn. Đang tạo ảnh mới; hãy tải lại data/qr.png.');
      event.actions.retry();
    } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
      console.log('Đã quét QR. Hãy xác nhận đăng nhập trên điện thoại.');
    } else if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
      console.log('Đăng nhập đã bị từ chối. Dừng bot và chạy lại khi muốn đăng nhập.');
      event.actions.abort();
    } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
      saveSession(event.data);
      rmSync(qrPath, { force: true });
    }
  });
}

try {
  console.log('Zalo Music Bot 1.0.1 — đang kiểm tra công cụ nhạc...');
  try {
    const tools = await checkTools();
    console.log(`yt-dlp ${tools.ytVersion}; FFmpeg OK.`);
  } catch (error) {
    console.error(diagnosticMessage(error));
    if (error.detail) console.error('Chi tiết:', error.detail);
    console.error('Bot vẫn đăng nhập được; dùng !kiemtra để kiểm tra lại công cụ.');
  }
  const api = await login();
  const handler = createHandler(api, {
    prefix, maxDuration, groups: list(process.env.ALLOWED_GROUP_IDS), users: list(process.env.ALLOWED_USER_IDS),
  });
  // Lưu cookie được làm mới sau lần đăng nhập này.
  const credentials = JSON.parse(readFileSync(sessionPath, 'utf8'));
  credentials.cookie = api.getCookie().toJSON().cookies;
  saveSession(credentials);
  api.listener.on('message', event => {
    handler(event).catch(() => console.error('Không gửi được phản hồi. Kiểm tra kết nối Zalo.'));
  });
  api.listener.on('connected', () => console.log(`BOT SẴN SÀNG. Trong nhóm, gõ ${prefix}help hoặc ${prefix}nhac tên bài hát.`));
  api.listener.on('disconnected', () => console.log('Kết nối Zalo bị ngắt. Nếu không tự kết nối lại, hãy restart bot.'));
  api.listener.on('error', () => console.error('Kết nối Zalo báo lỗi. Không chia sẻ file session.json.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    api.listener.stop();
    process.exit(0);
  });
  api.listener.start({ retryOnClose: true });
} catch (error) {
  console.error('Không khởi động/đăng nhập được:', error.name || 'Error');
  console.error('Kiểm tra mạng của host và thử restart. Nếu phiên lỗi, xóa data/session.json để quét QR lại.');
  process.exitCode = 1;
}
