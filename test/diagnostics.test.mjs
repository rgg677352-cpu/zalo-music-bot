import test from 'node:test';
import assert from 'node:assert/strict';
import { run, redactDiagnostics, classifyFailure, diagnosticMessage } from '../src/process.mjs';
import { runDownloader, soundCloudTarget } from '../src/music.mjs';

test('lỗi tiến trình giữ bước/công cụ/nguyên nhân và ẩn URL có chữ ký', async () => {
  await assert.rejects(run(process.execPath, ['-e',
    "console.error('ERROR: HTTP Error 403 Forbidden https://cdn.example/audio?token=private-value'); process.exit(1)"],
    { stage: 'tai-nhac' }), error => {
    assert.equal(error.stage, 'tai-nhac');
    assert.equal(error.exitCode, 1);
    assert.equal(error.reason, 'SOURCE_FORBIDDEN');
    assert.equal(error.code, 'MEDIA_PROCESS_FAILED');
    assert.ok(error.detail.includes('403'));
    assert.ok(!error.detail.includes('private-value'));
    assert.match(diagnosticMessage(error), /tai-nhac.*SOURCE_FORBIDDEN/);
    return true;
  });
});

test('ẩn URL, cookie và token JSON trong chi tiết lỗi', () => {
  const result = redactDiagnostics('https://name:password@proxy.example/a?sig=private\nCookie: sid=secret\n{"token": "json-secret", "error": 1}\naccess_token=bare-secret');
  for (const secret of ['password', 'private', 'sid=secret', 'json-secret', 'bare-secret']) {
    assert.ok(!result.includes(secret), secret);
  }
});

test('chỉ thử kho CA hệ thống khi có lỗi chứng chỉ, giữ xác minh TLS', async () => {
  const calls = [];
  const execute = async (command, args, settings) => {
    calls.push({ command, args, settings });
    if (calls.length === 1) throw Object.assign(new Error('TLS'), { reason: 'TLS' });
    return 'OK';
  };
  assert.equal(await runDownloader(['--version'], { stage: 'test' }, execute), 'OK');
  assert.equal(calls.length, 2);
  assert.ok(!calls[0].args.includes('no-certifi'));
  assert.ok(calls[1].args.includes('no-certifi'));
  assert.ok(calls.every(x => !x.args.includes('--no-check-certificates')));
  assert.match(calls[0].settings.env.TMPDIR, /tmp\/native$/);
});

test('không đổi CA/thử lặp khi gặp HTTP 403', async () => {
  let calls = 0;
  await assert.rejects(runDownloader(['--version'], {}, async () => {
    calls++;
    throw Object.assign(new Error('Forbidden'), { reason: 'SOURCE_FORBIDDEN' });
  }));
  assert.equal(calls, 1);
});

test('phân biệt container không chạy binary, TLS, mạng và hết đĩa', () => {
  assert.equal(classifyFailure('[PYI-27:ERROR] Failed to load Python shared library: libz.so not found'), 'RUNTIME');
  assert.equal(classifyFailure('CERTIFICATE_VERIFY_FAILED'), 'TLS');
  assert.equal(classifyFailure('Temporary failure in name resolution'), 'DNS');
  assert.equal(classifyFailure('No space left on device'), 'DISK_FULL');
  assert.equal(classifyFailure('', 'SIGKILL'), 'KILLED');
});

test('chặn link bị dính file code và chuẩn hóa link SoundCloud mobile', () => {
  assert.throws(() => soundCloudTarget('https://m.soundcloud.com/a/songindex.mjs'), /dính tên file code/);
  assert.equal(soundCloudTarget('https://m.soundcloud.com/a/b'), 'https://soundcloud.com/a/b');
});
