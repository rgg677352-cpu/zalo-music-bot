import { checkTools, inspectTrack } from '../src/music.mjs';
import { diagnosticMessage } from '../src/process.mjs';
import { Zalo } from 'zca-js';
if (typeof Zalo !== 'function') throw new Error('Thiếu zca-js.');
console.log('Node:', process.version, process.platform, process.arch);
try {
  console.log(await checkTools());
  if (process.argv.includes('--network')) {
    const track = await inspectTrack('https://soundcloud.com/kevin-9-1/carefree');
    console.log('Kết nối SoundCloud OK:', track.title);
  }
  console.log('Công cụ chạy được. Chưa kiểm tra đăng nhập Zalo hoặc gửi vào nhóm thật.');
} catch (error) {
  console.error(diagnosticMessage(error));
  if (error.detail) console.error('Chi tiết:', error.detail);
  process.exitCode = 1;
}
