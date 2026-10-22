import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicCard, coverDataUrl, durationLabel } from '../src/card.mjs';

test('tạo PNG thông tin bài tiếng Việt đủ metadata để Zalo gửi ảnh từ buffer', async () => {
  const card = await createMusicCard({ title: 'Em Đừng Khóc — Chillies & Những ngày bình yên', artist: 'Chillies', duration: 258 });
  assert.equal(card.data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(card.data.readUInt32BE(16), 1080);
  assert.equal(card.data.readUInt32BE(20), 380);
  assert.equal(card.metadata.totalSize, card.data.length);
  assert.equal(durationLabel(258), '04:18');
});

test('chỉ tải ảnh bìa HTTPS từ CDN SoundCloud, bỏ ảnh lỗi nhưng vẫn tạo được card', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error('unreachable'); };
  assert.equal(await coverDataUrl('http://127.0.0.1/a.jpg', fetcher), null);
  assert.equal(await coverDataUrl('https://example.org/a.jpg', fetcher), null);
  assert.equal(calls, 0);
  const card = await createMusicCard({ title: '<script>& title', thumbnail: 'https://i1.sndcdn.com/test.jpg' }, { fetcher });
  assert.equal(calls, 1);
  assert.ok(card.data.length > 1000);
});

test('không tải ảnh quá dung lượng hoặc loại nội dung không phải ảnh', async () => {
  let cancelled = 0;
  const fetcher = async () => ({ ok: true, headers: new Headers({ 'content-type': 'image/jpeg', 'content-length': '99999999' }), body: { cancel: async () => cancelled++ } });
  assert.equal(await coverDataUrl('https://i1.sndcdn.com/a.jpg', fetcher), null);
  assert.equal(cancelled, 1);
});
