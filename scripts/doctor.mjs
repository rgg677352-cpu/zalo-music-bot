import ffmpeg from 'ffmpeg-static';
import { run } from '../src/process.mjs';
import { downloader } from '../src/music.mjs';
import { Zalo } from 'zca-js';
if (typeof Zalo !== 'function') throw new Error('Thiếu zca-js.');
console.log('Node:', process.version, process.platform, process.arch);
console.log('yt-dlp:', await run(downloader, ['--version'], { timeout: 20_000 }));
console.log((await run(ffmpeg, ['-version'], { timeout: 20_000 })).split('\n')[0]);
console.log('Công cụ chạy được. Chưa kiểm tra đăng nhập Zalo hoặc gửi vào nhóm thật.');
