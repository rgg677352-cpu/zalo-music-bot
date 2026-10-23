import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTrending, parseChart, matchSoundCloud } from '../src/trends.mjs';
const start = Date.UTC(2026, 9, 23);
const fixtureChart = titles => ({ feed: { updated: new Date(start).toUTCString(), results: titles.map(name => ({ name, artistName: 'Test Artist' })) } });
function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), 'trends-test-')); t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  let time = start, calls = 0;
  const songs = ['Bài Một', 'Bài Hai', 'Song One', 'Song Two'];
  const ids = new Map(songs.map((title, index) => [title, `https://soundcloud.com/test/song-${index}`]));
  const opts = { dataDir, now: () => time, choose: () => 0,
    fetcher: async url => { calls++; return new Response(JSON.stringify(fixtureChart(url.includes('/vn/') ? songs.slice(0, 2) : songs.slice(2)))); },
    execute: async args => { const query = args.at(-1); const title = songs.find(s => query.includes(s)); return JSON.stringify({ entries: [{ title, uploader: 'Test Artist', duration: 180, url: ids.get(title) }] }); },
  };
  const prepare = async url => ({ url, title: [...ids].find(([, value]) => value === url)?.[0], artist: 'Test Artist', duration: 180, cleanup: async () => {} });
  return { opts, prepare, at: n => { time = n; }, calls: () => calls };
}

test('lọc bảng cũ, thiếu ngày cập nhật và item sai; khử bài trùng', () => {
  assert.throws(() => parseChart({ feed: { results: [] } }, 'vn', start));
  assert.throws(() => parseChart(fixtureChart(['A']), 'vn', start + 8 * 86400000));
  assert.equal(parseChart(fixtureChart(['A','A','B']), 'vn', start).length, 2);
});

test('lọc preview, remix không yêu cầu, URL lạ và kết quả chỉ trùng một từ', () => {
  const song = { title: 'Bài Hát Mới', artist: 'Test Artist' };
  const sample = { title: song.title, duration: 180, url: 'https://soundcloud.com/test/a', uploader: 'Test Artist' };
  assert.equal(matchSoundCloud([sample], song, 600).length, 1);
  assert.equal(matchSoundCloud([{ ...sample, duration: 30 }, { ...sample, title: 'Bài Hát Mới Remix' }, { ...sample, title: 'Bài khác' }, { ...sample, url: 'https://example.com/file' }], song, 600).length, 0);
  assert.equal(matchSoundCloud([{ ...sample, title: 'THĂNG x the boy is mine' }], { title: 'THĂNG', artist: 'UPRIZE' }, 600).length, 0);
});

test('luân phiên VN/quốc tế, không lặp và giữ lịch sử qua restart', async t => {
  const f = fixture(t); const s = createTrending(f.opts);
  const first = await s.prepare('100', 600, f.prepare); assert.equal(first.title, 'Bài Một');
  const second = await s.prepare('100', 600, f.prepare); assert.equal(second.title, 'Song One');
  const restored = createTrending(f.opts);
  assert.equal((await restored.prepare('100', 600, f.prepare)).title, 'Bài Hai');
  assert.equal((await restored.prepare('100', 600, f.prepare)).title, 'Song Two');
  await assert.rejects(restored.prepare('100', 600, f.prepare), { code: 'TREND_UNAVAILABLE' });
  assert.equal(f.calls(), 4); // Cached, không gọi mạng lại cho từng random.
});

test('mạng lỗi dùng cache còn mới, từ chối cache quá hạn thay vì nhạc cố định', async t => {
  const f = fixture(t); await createTrending(f.opts).charts();
  f.at(start + 7 * 3600000);
  const opts = { ...f.opts, fetcher: async () => { throw new Error('offline'); } };
  assert.ok((await createTrending(opts).charts()).length > 0);
  f.at(start + 49 * 3600000); await assert.rejects(createTrending(opts).charts(), { code: 'TREND_UNAVAILABLE' });
});

test('metadata đầy đủ đổi thành preview thì dọn audio, không ghi lịch sử', async t => {
  const f = fixture(t); let cleaned = 0;
  const s = createTrending(f.opts);
  await assert.rejects(s.prepare('100', 600, async url => ({ ...await f.prepare(url), duration: 30, cleanup: async () => cleaned++ })), { code: 'TREND_UNAVAILABLE' });
  assert.equal(cleaned, 3);
  assert.throws(() => readFileSync(join(f.opts.dataDir, 'music-history.json')));
});

test('lịch sử hỏng báo lỗi rõ, cache hỏng được tải lại', async t => {
  const f = fixture(t); writeFileSync(join(f.opts.dataDir, 'trends-cache.json'), 'null');
  assert.ok((await createTrending(f.opts).charts()).length > 0);
  writeFileSync(join(f.opts.dataDir, 'music-history.json'), '{bad json');
  assert.throws(() => createTrending(f.opts), { code: 'MUSIC_HISTORY_INVALID' });
});

test('yêu cầu hủy không tải nhạc hay ghi lịch sử', async t => {
  const f = fixture(t); const s = createTrending(f.opts);
  await assert.rejects(s.prepare('100', 600, async () => assert.fail('Không được tải'), () => false), { code: 'REQUEST_CANCELLED' });
});

test('tên ngắn phải khớp nghệ sĩ để tránh phát nhầm bài cùng tên', () => {
  assert.equal(matchSoundCloud([{ title: 'Hello', duration: 180, uploader: 'Other Singer', url: 'https://soundcloud.com/other/hello' }], { title: 'Hello', artist: 'Adele' }, 600).length, 0);
  assert.equal(matchSoundCloud([{ title: 'Adele - Hello', duration: 180, uploader: 'Music', url: 'https://soundcloud.com/music/hello' }], { title: 'Hello', artist: 'Adele' }, 600).length, 1);
});

test('đủ cache VN và một thị trường quốc tế thì không chờ nguồn tùy chọn đang lỗi', async t => {
  const f = fixture(t);
  await createTrending({ ...f.opts, fetcher: async url => { if (url.includes('/gb/') || url.includes('/kr/')) throw new Error('offline'); return f.opts.fetcher(url); } }).charts();
  let called = 0;
  const tracks = await createTrending({ ...f.opts, fetcher: async () => { called++; throw new Error('offline'); } }).charts();
  assert.equal(called, 0); assert.equal(tracks.length, 4);
});
