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
  await f.c.handle(f.event('!list')); assert.match(f.calls.at(-1).text, /Nhóm 200\n200/);
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
  assert.match(controlHelp(), /30m \| 4 \| 2h/);
});

test('luân phiên câu riêng, giữ vị trí qua restart và nghỉ, hết mới quay lại đầu', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 1s | 2 | 5s | Câu A || Câu B || Câu C'));
  f.at(1000); await f.c.tick(); f.at(2000); await f.c.tick();
  assert.equal(f.c.snapshot().jobs[0].nextAt, 7000);
  const restored = createControl(f.api, f.opts);
  f.at(7000); await restored.tick(); f.at(8000); await restored.tick();
  assert.deepEqual(f.calls.filter(x => x.group === '200').map(x => x.text), ['Câu A','Câu B','Câu C','Câu A']);
});

test('chỉ dùng câu người nhập, cho phép chữ @, chặn câu trống và lệnh', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 1m | 4 | 2h | @mọi người chào nhé || Câu tiếp'));
  assert.equal(f.c.snapshot().jobs[0].messages.length, 2);
  assert.equal(f.c.snapshot().jobs[0].messages[0], '@mọi người chào nhé');
  await f.c.handle(f.event('!tudong 200 | 1m | 4 | 2h | A || !setup'));
  await f.c.handle(f.event('!tudong 200 | 1m | 4 | 2h | A || '));
  assert.equal(f.c.snapshot().jobs.length, 1);
});

test('lịch bản 1.2.0 vẫn đọc và gửi bình thường', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 1s | 1 | 0s | Nội dung cũ'));
  const state = f.c.snapshot(); delete state.jobs[0].messages; delete state.jobs[0].cursor;
  const { writeFileSync } = await import('node:fs'); writeFileSync(f.opts.statePath, JSON.stringify(state));
  const restored = createControl(f.api, f.opts); f.at(1000); await restored.tick();
  assert.equal(f.calls.at(-1).text, 'Nội dung cũ');
});

test('lệnh không có msgId vẫn nhận độc lập, ID sự kiện trùng chỉ xử lý một lần', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  const a = f.event('!gui 200 | A'), b = f.event('!gui 200 | B'); delete a.data.msgId; delete b.data.msgId;
  await f.c.handle(a); await f.c.handle(b);
  assert.deepEqual(f.calls.filter(x => x.group === '200').map(x => x.text), ['A', 'B']);
});

test('list phân trang, không tải tên toàn bộ và không gửi nhiều trang cùng lúc', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  f.api.getAllGroups = async () => ({ gridVerMap: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [String(i + 100), '1'])) });
  let looked = 0; f.api.getGroupInfo = async ids => { looked += ids.length; return { gridInfoMap: {} }; };
  const before = f.calls.length; await f.c.handle(f.event('!list')); assert.equal(f.calls.length, before + 1); assert.equal(looked, 8);
  assert.match(f.calls.at(-1).text, /1\/4/); assert.match(f.calls.at(-1).text, /!list 2/);
  // Lệnh xem lặp quá nhanh không phát sinh thêm phản hồi.
  await f.c.handle(f.event('!list')); assert.equal(f.calls.length, before + 1);
  f.at(2000); await f.c.handle(f.event('!list 9')); assert.match(f.calls.at(-1).text, /Trang không hợp lệ/);
});

test('đổi nhóm chính khi đang lấy danh sách không trả nội dung về nhóm cũ', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  let release; f.api.getAllGroups = () => new Promise(resolve => { release = resolve; });
  const pending = f.c.handle(f.event('!list')); await new Promise(r => setImmediate(r));
  await f.c.handle(f.event('!setup', '200', 'owner')); const n = f.calls.length;
  release({ gridVerMap: { '100': '1' } }); await pending; assert.equal(f.calls.length, n);
});

test('stop giữa một lượt gửi không để scheduler gửi tiếp các lịch còn lại', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  await f.c.handle(f.event('!tudong 200 | 1s | 1 | 0s | A'));
  await f.c.handle(f.event('!tudong 200 | 1s | 1 | 0s | B'));
  let release; const dispatched = [];
  f.api.sendMessage = (text, group) => { dispatched.push({ text, group }); return new Promise(r => { release = r; }); };
  f.at(1000); const pending = f.c.tick(); await new Promise(r => setImmediate(r)); f.c.stop(); release(); await pending;
  assert.equal(dispatched.length, 1);
});

test('SDK treo làm lịch đó dừng, lịch khác vẫn xử lý, không thử gửi lại', async t => {
  const f = fixture(t); const c = createControl(f.api, { ...f.opts, requestTimeout: 10 });
  await c.handle(f.event('!setup', '100', 'owner')); await c.handle(f.event('!tudong 200 | 1s | 1 | 0s | A'));
  const original = f.api.sendMessage; f.api.sendMessage = (text, group) => group === '200' ? new Promise(() => {}) : original(text, group);
  f.at(1000); await c.tick(); assert.equal(c.snapshot().jobs[0].paused, true);
  f.at(2000); await c.tick(); assert.equal(f.calls.filter(x => /đã dừng vì/.test(x.text)).length, 1);
});

test('file lịch sai số đếm hoặc trùng mã bị chặn, không ghi đè file lỗi', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner')); await f.c.handle(f.event('!tudong 200 | 1s | 2 | 0s | A'));
  const { writeFileSync, readFileSync } = await import('node:fs');
  const state = f.c.snapshot(); state.jobs[0].sent = -1; const raw = JSON.stringify(state); writeFileSync(f.opts.statePath, raw);
  assert.throws(() => createControl(f.api, f.opts), { code: 'CONTROL_STATE_INVALID' }); assert.equal(readFileSync(f.opts.statePath, 'utf8'), raw);
});

test('đổi PREFIX không làm hỏng dữ liệu cũ; nội dung trùng tiền tố mới tự dừng', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner')); await f.c.handle(f.event('!tudong 200 | 1s | 2 | 0s | /setup'));
  const c = createControl(f.api, { ...f.opts, prefix: '/' }); f.at(1000); await c.tick();
  assert.equal(c.snapshot().jobs[0].paused, true); assert.equal(f.calls.filter(x => x.group === '200').length, 0);
});

test('đổi nhóm chính hủy cả bài đang tải lẫn bài xếp hàng, vẫn dọn file', async t => {
  const f = fixture(t); await f.c.handle(f.event('!setup', '100', 'owner'));
  let release, prepared = 0, cleaned = 0, uploaded = 0;
  const waiting = new Promise(r => { release = r; });
  f.api.uploadAttachment = async () => { uploaded++; return []; };
  const handler = createHandler(f.api, { prefix: '!', maxDuration: 600, groups: new Set(), users: new Set() }, async () => {
    prepared++; await waiting; return { audioPath: '/tmp/fixture.aac', cleanup: async () => cleaned++ };
  }, { control: f.c });
  const first = handler(f.event('!nhac A', '100', 'member1'));
  const second = handler(f.event('!nhac B', '100', 'member2'));
  await new Promise(r => setImmediate(r)); await f.c.handle(f.event('!setup', '200', 'owner')); release();
  await Promise.all([first, second]); assert.equal(prepared, 1); assert.equal(cleaned, 1); assert.equal(uploaded, 0);
});
