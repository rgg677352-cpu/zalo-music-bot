import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadType } from 'zca-js';
import { createControl, parseDuration, controlHelp } from '../src/control.mjs';
import { createHandler } from '../src/handler.mjs';
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'zalo-control-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const calls = []; let time = 0, seq = 0, fail = false;
  const api = { getOwnId: () => 'owner', getAllGroups: async () => ({ gridVerMap: { '100': '1', '200': '1' } }), getGroupInfo: async ids => ({ gridInfoMap: Object.fromEntries(ids.map(id => [id, { name: `Nhóm ${id}` }])) }), sendMessage: async (text, group) => { if (fail && group === '200') throw new Error('private sdk failure'); calls.push({ text, group }); } };
  const opts = { statePath: join(dir, 'control.json'), now: () => time, autoStart: false };
  const c = createControl(api, opts);
  const event = (content, group = '100', uidFrom = 'member') => ({ type: ThreadType.Group, threadId: group, data: { content, uidFrom, msgId: String(++seq) } });
  return { c, api, opts, calls, event, at: n => { time = n; }, fail: () => { fail = true; } };
}
test('thời gian có đơn vị và không chấp nhận giá trị sai', () => {
  assert.equal(parseDuration('30s'), 30000); assert.equal(parseDuration('2m'), 120000); assert.equal(parseDuration('1h'), 3600000); assert.equal(parseDuration('0s', true), 0);
  for (const v of ['0s','-1s','1','1m30s','1.5s','99999999999999h']) assert.throws(() => parseDuration(v));
});
test('chỉ chủ tài khoản setup; mọi thành viên nhóm chính điều khiển; chặn nhóm khác', async t => {
  const f = fixture(t);
  await f.c.handle(f.event('!setup')); assert.equal(f.c.snapshot().mainGroup, null);
  await f.c.handle(f.event('!setup', '100', 'owner')); assert.equal(f.c.snapshot().mainGroup, '100');
  await f.c.handle(f.event('!list')); assert.match(f.calls.at(-1).text, /Nhóm 200\nID: 200/);
  const n = f.calls.length; await f.c.handle(f.event('!gui 200 | hello', '200')); assert.equal(f.calls.length, n);
  await f.c.handle(f.event('!gui 200 | hello')); assert.deepEqual(f.calls.at(-2), { text: 'hello', group: '200' });
  await f.c.handle(f.event('!gui 999 | hello')); assert.match(f.calls.at(-1).text, /ID nhóm không hợp lệ/);
});
test('lịch gửi đúng khoảng, đủ số lần rồi nghỉ, restart không gửi bù dồn', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 2s | 2 | 10s | Xin chào | giữ dấu này'));
  const sent = () => f.calls.filter(x => x.group === '200');
  f.at(1999); await f.c.tick(); assert.equal(sent().length, 0);
  f.at(2000); await f.c.tick(); assert.equal(sent().length, 1); assert.equal(sent()[0].text, 'Xin chào | giữ dấu này');
  f.at(4000); await f.c.tick(); assert.equal(sent().length, 2); assert.equal(f.c.snapshot().jobs[0].nextAt, 14000);
  f.at(13999); await f.c.tick(); assert.equal(sent().length, 2);
  const restored = createControl(f.api, f.opts); f.at(900000); await restored.tick(); assert.equal(sent().length, 3); await restored.tick(); assert.equal(sent().length, 3);
  assert.equal(restored.snapshot().mainGroup, '100');
});
test('dừng, tiếp tục, đổi nhóm chính, xóa; thông báo không tự bắt đầu bằng tiền tố', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 1s | 1 | 0s | Tin thử'));
  await f.c.handle(f.event('!dung all')); f.at(10000); await f.c.tick(); assert.equal(f.calls.filter(x => x.group === '200').length, 0);
  await f.c.handle(f.event('!tieptuc L1')); assert.equal(f.c.snapshot().jobs[0].nextAt, 11000);
  await f.c.handle(f.event('!setup', '200', 'owner')); assert.equal(f.c.snapshot().jobs[0].paused, true);
  await f.c.handle(f.event('!xoa L1', '200')); assert.equal(f.c.snapshot().jobs.length, 0);
  assert.ok(f.calls.every(x => !x.text.startsWith('!')));
});
test('gửi lỗi tự dừng và chỉ báo một lần', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner')); await f.c.handle(f.event('!tudong 200 | 1s | 5 | 1m | Chào'));
  f.fail(); f.at(1000); await f.c.tick(); f.at(10000); await f.c.tick();
  assert.equal(f.c.snapshot().jobs[0].paused, true); assert.equal(f.calls.filter(x => /đã dừng vì/.test(x.text)).length, 1);
});
test('chặn gọi lệnh qua nội dung gửi, chống nhận lại sự kiện', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!gui 100 | !setup')); assert.match(f.calls.at(-1).text, /không được bắt đầu/);
  const e = f.event('!tudong 200 | 1m | 1 | 0s | Hi'); await f.c.handle(e); await f.c.handle(e); assert.equal(f.c.snapshot().jobs.length, 1);
});
test('handler chặn cả nhạc bên ngoài nhóm chính và bỏ giới hạn UID cũ ở nhóm chính', async t => {
  const f = fixture(t); const h = createHandler(f.api, { prefix: '!', groups: new Set(['old']), users: new Set(['old']), maxDuration: 600 }, async () => assert.fail('Không tải nhạc'), { control: f.c });
  await h(f.event('!setup', '100', 'owner')); const n = f.calls.length;
  await h(f.event('!nhac test', '200')); await h(f.event('!id', '200')); assert.equal(f.calls.length, n);
  await h(f.event('!id')); assert.match(f.calls.at(-1).text, /ID nhóm: 100/);
  assert.match(controlHelp(), /30s \| 5 \| 10m/);
});
