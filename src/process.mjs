import { spawn } from 'node:child_process';

export function run(command, args, { timeout = 180_000, maxOutput = 2_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '', stderr = '', bytes = 0, failure;
    const timer = setTimeout(() => {
      failure = new Error('Xử lý quá lâu. Hãy thử bài khác hoặc thử lại sau.');
      child.kill('SIGKILL');
    }, timeout);
    for (const [stream, isError] of [[child.stdout, false], [child.stderr, true]]) {
      stream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxOutput) {
          failure = new Error('Dữ liệu phản hồi quá lớn.');
          child.kill('SIGKILL');
          return;
        }
        if (isError) stderr += chunk.toString(); else stdout += chunk.toString();
      });
    }
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (failure) return reject(failure);
      if (code !== 0) {
        // Không đưa URL tải có chữ ký, cookie hay output thô lên chat/log.
        const error = new Error('Không lấy được âm thanh. Nguồn nhạc hoặc kết nối có thể đang lỗi.');
        error.code = 'MEDIA_PROCESS_FAILED';
        error.exitCode = code;
        error.tool = command.split('/').pop();
        error.detail = /unsupported url/i.test(stderr) ? 'unsupported-url' : 'process-failed';
        return reject(error);
      }
      resolve(stdout.trim());
    });
  });
}
