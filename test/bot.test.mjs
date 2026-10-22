import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreadType } from 'zca-js';
import { createHandler } from '../src/handler.mjs';
import { soundCloudTarget, pickTrack } from '../src/music.mjs';

const config = { prefix: '!', maxDuration: 600, groups: new Set(), users: new Set() };
const message = (content, id = '1') => ({
  type: ThreadType.Group, threadId: 'group-123',
  data: { content, uidFrom: 'user-1', msgId: id },
});

const fakeCard = async () => ({ data: Buffer.from('image fixture'), filename: 'music-card.png', metadata: { width: 1080, height: 380, totalSize: 13 } });

test('chỉ gửi một voice và một ảnh, không tin đang tải/link chữ, bỏ tin lặp', async () => {
  const calls = [];
  const api = {
    sendMessage: async (...args) => calls.push(['text', ...args]),
    uploadAttachment: async (...args) => {
      calls.push(['upload', ...args]);
      return [{ fileType: 'others', fileUrl: 'https://example.org/voice.aac' }];
    },
    sendVoice: async (...args) => calls.push(['voice', ...args]),
  };
  let cleaned = 0, prepared = 0;
  const handler = createHandler(api, config, async input => {
    prepared++;
    assert.equal(input, 'Carefree Kevin MacLeod');
    return { title: 'Carefree', url: 'https://soundcloud.com/a/b', audioPath: '/tmp/voice.aac', cleanup: async () => cleaned++ };
  }, { card: fakeCard });
  await handler(message('!nhac Carefree Kevin MacLeod'));
  await handler(message('!nhac Carefree Kevin MacLeod'));
  assert.equal(prepared, 1);
  assert.equal(cleaned, 1);
  assert.deepEqual(calls.find(x => x[0] === 'voice'), [
    'voice', { voiceUrl: 'https://example.org/voice.aac' }, 'group-123', ThreadType.Group,
  ]);
  const messages = calls.filter(x => x[0] === 'text');
  assert.equal(messages.length, 1);
  assert.equal(messages[0][1].msg, '');
  assert.equal(messages[0][1].attachments[0].filename, 'music-card.png');
  assert.equal(calls.filter(x => x[0] === 'voice').length, 1);
});

test('xóa file cả khi gửi thất bại', async () => {
  let cleaned = false;
  const api = {
    sendMessage: async () => {},
    uploadAttachment: async () => [{ fileType: 'others', fileUrl: 'https://example.org/voice.aac' }],
    sendVoice: async () => { throw new Error('Send failed'); },
  };
  const handler = createHandler(api, config, async () => ({
    audioPath: '/tmp/voice.aac', cleanup: async () => { cleaned = true; },
  }), { card: fakeCard });
  await handler(message('!scl https://soundcloud.com/a/b'));
  assert.equal(cleaned, true);
});

test('hai yêu cầu chạy lần lượt và gộp yêu cầu trùng, không gửi tin chờ', async () => {
  const order = [], texts = [];
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const api = {
    sendMessage: async value => texts.push(value),
    uploadAttachment: async () => [{ fileType: 'others', fileUrl: 'https://example.org/a.aac' }],
    sendVoice: async () => order.push('voice'),
  };
  const handler = createHandler(api, config, async input => {
    order.push(input);
    if (input === 'first') await waiting;
    return { title: input, audioPath: '/tmp/song.aac', cleanup: async () => order.push(`clean ${input}`) };
  }, { card: fakeCard });
  const first = handler(message('!nhac first', 'q1'));
  const secondEvent = message('!scl second', 'q2'); secondEvent.data.uidFrom = 'user-2';
  const second = handler(secondEvent);
  const duplicate = message('!scl first', 'q3'); duplicate.data.uidFrom = 'user-3';
  await handler(duplicate);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(order, ['first']);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first', 'voice', 'clean first', 'second', 'voice', 'clean second']);
  assert.equal(texts.length, 2);
  assert.ok(texts.every(value => value.msg === '' && value.attachments));
});

test('gửi voice thành công nhưng ảnh lỗi thì chỉ thêm một dòng tên bài, không báo lỗi cả bài', async () => {
  const messages = []; let voices = 0;
  const handler = createHandler({
    uploadAttachment: async () => [{ fileType: 'others', fileUrl: 'https://example.org/a.aac' }],
    sendVoice: async () => voices++,
    sendMessage: async value => { if (value.attachments) throw new Error('Image upload failed'); messages.push(value); },
  }, config, async () => ({ title: 'Bài hát', artist: 'Ca sĩ', duration: 125, audioPath: '/tmp/a.aac', cleanup: async () => {} }), { card: fakeCard });
  await handler(message('!nhac test'));
  assert.equal(voices, 1);
  assert.deepEqual(messages, ['🎵 Bài hát · Ca sĩ · 02:05']);
});

test('không đẩy lỗi kỹ thuật và URL lên nhóm, giới hạn tin báo lỗi lặp', async () => {
  const messages = [];
  const handler = createHandler({ sendMessage: async value => messages.push(value) }, config, async () => {
    throw Object.assign(new Error('HTTP 403 https://example.org/?token=fake'), { code: 'MEDIA_PROCESS_FAILED', reason: 'SOURCE_FORBIDDEN', stage: 'tai-nhac' });
  }, { card: fakeCard });
  await handler(message('!nhac first', 'e1'));
  const next = message('!nhac second', 'e2'); next.data.uidFrom = 'user-2';
  await handler(next);
  assert.equal(messages.length, 1);
  assert.ok(!/403|token|https|tai-nhac|MEDIA_PROCESS_FAILED/.test(messages[0]));
});

test('bot không tự nhận tin help vừa gửi thành một lệnh nhạc mới khi selfListen bật', async () => {
  const sent = [];
  const handler = createHandler({ sendMessage: async value => sent.push(value) }, config,
    async () => assert.fail('Không được tải nhạc từ tin help của bot'), { card: fakeCard });
  await handler(message('!help', 'h1'));
  assert.equal(sent.length, 1);
  assert.ok(!sent[0].startsWith('!'));
  await handler(message(sent[0], 'h2'));
  assert.equal(sent.length, 1);
});

test('giới hạn nhóm và người dùng trước khi tải nhạc', async () => {
  const api = { sendMessage: async () => assert.fail('Không được phản hồi') };
  const prepare = async () => assert.fail('Không được tải nhạc');
  await createHandler(api, { ...config, groups: new Set(['other']) }, prepare)(message('!nhac test'));
  await createHandler(api, { ...config, users: new Set(['other']) }, prepare)(message('!nhac test'));
});

test('chỉ nhận SoundCloud HTTPS và không truyền đầu vào qua shell', () => {
  assert.equal(soundCloudTarget('hello $(touch x)'), 'scsearch1:hello $(touch x)');
  assert.equal(soundCloudTarget('https://on.soundcloud.com/test'), 'https://on.soundcloud.com/test');
  for (const url of ['https://localhost/test', 'http://soundcloud.com/a/b', 'https://soundcloud.com.evil.example/a', 'https://u:p@soundcloud.com/a']) {
    assert.throws(() => soundCloudTarget(url));
  }
});

test('từ chối bài quá dài, không rõ thời lượng hoặc tìm kiếm rỗng', () => {
  assert.throws(() => pickTrack({ entries: [] }, 600));
  assert.throws(() => pickTrack({ webpage_url: 'https://soundcloud.com/a/b', duration: 601 }, 600));
  assert.throws(() => pickTrack({ webpage_url: 'https://soundcloud.com/a/b' }, 600));
  assert.equal(pickTrack({ entries: [{ webpage_url: 'https://soundcloud.com/a/b', duration: 120 }] }, 600).duration, 120);
});
