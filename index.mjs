import 'dotenv/config';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Zalo, LoginQRCallbackEventType } from 'zca-js';
import { createHandler } from './src/handler.mjs';
import { createControl } from './src/control.mjs';
import { createTrending } from './src/trends.mjs';
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
const prefix = process.env.PREFIX || '?';
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
      // Giữ phiên đã lưu nếu host chỉ lỗi mạng; QR mới chỉ ghi đè sau xác nhận.
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
  console.log('Zalo Music Bot 1.5.0 — nhóm điều khiển + lịch gửi/nghỉ + nhạc.');
  const api = await login();
  const control = createControl(api, { statePath: `${dataDir}control.json`, prefix, maxDuration, autoStart: false });
  let trending;
  const randomMusic = (...args) => {
    trending ||= createTrending({ dataDir });
    return trending.prepare(...args);
  };
  const handler = createHandler(api, {
    prefix, maxDuration, groups: list(process.env.ALLOWED_GROUP_IDS), users: list(process.env.ALLOWED_USER_IDS),
  }, undefined, { control, trending: randomMusic });
  // Lưu cookie được làm mới sau lần đăng nhập này.
  const credentials = JSON.parse(readFileSync(sessionPath, 'utf8'));
  credentials.cookie = api.getCookie().toJSON().cookies;
  saveSession(credentials);
  api.listener.on('message', event => {
    handler(event).catch(() => console.error('Không gửi được phản hồi. Kiểm tra kết nối Zalo.'));
  });
  api.listener.on('connected', () => { control.start(); console.log(`BOT SẴN SÀNG 1.5.0. Tài khoản đang chạy bot gõ ?setup trong nhóm chính, rồi gõ ?help.`); });
  api.listener.on('disconnected', () => { control.stop(); console.log('Kết nối Zalo bị ngắt. Nếu không tự kết nối lại, hãy restart bot.'); });
  api.listener.on('error', () => console.error('Kết nối Zalo báo lỗi. Không chia sẻ file session.json.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    control.stop();
    api.listener.stop();
    process.exit(0);
  });
  api.listener.start({ retryOnClose: true });
  // Đăng nhập và lệnh chữ không phải chờ kiểm tra công cụ nhạc.
  checkTools().then(tools => console.log(`yt-dlp ${tools.ytVersion}; FFmpeg OK.`)).catch(error => {
    console.error(diagnosticMessage(error));
    console.error(`Dùng ${prefix}kiemtra trong nhóm chính để thử lại.`);
  });
} catch (error) {
  console.error('Không khởi động/đăng nhập được:', error.code || error.name || 'Error');
  if (error.code === 'CONTROL_STATE_INVALID') console.error(error.message);
  console.error('Kiểm tra mạng, dung lượng và quyền ghi data. Nếu data/control.json lỗi, giữ bản sao và sửa file. Chỉ xóa data/session.json khi xác định phiên đăng nhập lỗi.');
  process.exitCode = 1;
}
