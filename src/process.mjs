import { spawn } from 'node:child_process';
import { basename } from 'node:path';
const children = new Set();
function terminate(child) {
  if (!child.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
  } catch { try { child.kill('SIGKILL'); } catch {} }
}
export function stopMediaProcesses() { for (const child of children) terminate(child); }
process.once('exit', stopMediaProcesses);

export function redactDiagnostics(value) {
  return String(value || '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/(?:https?|wss?):\/\/[^\s<>"']+/gi, '[URL]')
    .replace(/\b(?:authorization|cookie|set-cookie)["']?\s*[:=][^\r\n]*/gi, '[credential removed]')
    .replace(/\b(?:access_token|refresh_token|token|client_id|signature|sig)["']?\s*[:=]\s*["']?[^\s,;"']+/gi, '[secret removed]')
    .trim().slice(-1600);
}

export function classifyFailure(stderr, signal) {
  if (/CERTIFICATE_VERIFY_FAILED|certificate verify failed|unable to get local issuer/i.test(stderr)) return 'TLS';
  if (/HTTP Error 429|Too Many Requests/i.test(stderr)) return 'RATE_LIMIT';
  if (/HTTP Error 40[13]|Forbidden|Unauthorized/i.test(stderr)) return 'SOURCE_FORBIDDEN';
  if (/GLIBC|failed to load Python|error loading Python|failed to map segment|\[PYI-|libpython|libz\.so|Permission denied|Operation not permitted/i.test(stderr)) return 'RUNTIME';
  if (/HTTP Error 404|not found|Unable to extract track id/i.test(stderr)) return 'NOT_FOUND';
  if (/unsupported url/i.test(stderr)) return 'UNSUPPORTED_URL';
  if (/No space left|Disk quota exceeded/i.test(stderr)) return 'DISK_FULL';
  if (/Name or service not known|Temporary failure in name resolution|getaddrinfo|resolve host/i.test(stderr)) return 'DNS';
  if (/timed out|Network is unreachable|Connection refused|Connection reset|Remote end closed/i.test(stderr)) return 'NETWORK';
  if (/No video formats|Requested format is not available|not available in your country|not available in your region|track is not available/i.test(stderr)) return 'UNAVAILABLE';
  if (signal === 'SIGKILL') return 'KILLED';
  return 'PROCESS_FAILED';
}

const hints = {
  TLS: 'Lỗi xác minh chứng chỉ HTTPS trên host.',
  RATE_LIMIT: 'Nguồn nhạc trả HTTP 429. Đợi một lúc rồi thử lại.',
  SOURCE_FORBIDDEN: 'Nguồn nhạc trả HTTP 401/403, từ chối yêu cầu từ host.',
  NOT_FOUND: 'Không tìm thấy bài/link này. Kiểm tra lại link SoundCloud.',
  UNSUPPORTED_URL: 'Link này không được công cụ tải hỗ trợ.',
  RUNTIME: 'Host không chạy được công cụ nhạc. Xem chi tiết trong Console.',
  DISK_FULL: 'Host hết dung lượng đĩa hoặc vượt hạn mức lưu trữ.',
  DNS: 'Host không phân giải được tên miền nguồn nhạc.',
  NETWORK: 'Kết nối từ host đến nguồn nhạc bị lỗi hoặc hết thời gian.',
  UNAVAILABLE: 'Bài không có định dạng tải được hoặc không khả dụng tại vùng máy chủ.',
  KILLED: 'Công cụ bị dừng bằng SIGKILL; cần kiểm tra giới hạn tài nguyên của host.',
  PROCESS_FAILED: 'Công cụ nhạc báo lỗi; Console hiện chi tiết đã ẩn URL và thông tin đăng nhập.',
};

export function diagnosticMessage(error) {
  if (!error?.stage && !error?.tool) return 'Không hoàn tất được kiểm tra. Xem Console.';
  const reason = error.reason || 'PROCESS_FAILED';
  return `[${error.stage || 'runtime'} / ${error.tool || 'tool'} / ${reason}] ${hints[reason] || hints.PROCESS_FAILED}`;
}

export function run(command, args, { timeout = 180_000, maxOutput = 2_000_000, stage = 'runtime', env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, detached: process.platform !== 'win32', env: { ...process.env, ...env } });
    children.add(child);
    let stdout = '', stderr = '', bytes = 0, failure;
    const timer = setTimeout(() => {
      failure = new Error('Xử lý quá lâu. Hãy thử bài khác hoặc thử lại sau.');
      failure.reason = 'NETWORK';
      terminate(child);
    }, timeout);
    for (const [stream, isError] of [[child.stdout, false], [child.stderr, true]]) {
      stream.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxOutput) {
          failure = new Error('Dữ liệu phản hồi quá lớn.');
          terminate(child);
          return;
        }
        if (isError) stderr += chunk.toString(); else stdout += chunk.toString();
      });
    }
    const decorate = error => {
      error.code = 'MEDIA_PROCESS_FAILED';
      error.stage = stage;
      error.tool = basename(command);
      error.reason ||= classifyFailure(stderr, error.signal);
      error.detail = redactDiagnostics(stderr);
      return error;
    };
    child.once('error', error => {
      clearTimeout(timer);
      children.delete(child);
      error.reason = 'RUNTIME';
      stderr ||= error.message;
      reject(decorate(error));
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      // Also stop descendants with ignored stdio; they must not outlive the job.
      terminate(child);
      children.delete(child);
      if (failure) return reject(decorate(failure));
      if (code !== 0) {
        const error = new Error('Không lấy được âm thanh. Nguồn nhạc hoặc kết nối có thể đang lỗi.');
        error.exitCode = code;
        error.signal = signal;
        return reject(decorate(error));
      }
      resolve(stdout.trim());
    });
  });
}
