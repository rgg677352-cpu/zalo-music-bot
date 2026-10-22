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

test('gửi đúng voice vào nhóm, không gửi audio như file, xóa file tạm và bỏ bản tin lặp', async () => {
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
  });
  await handler(message('!nhac Carefree Kevin MacLeod'));
  await handler(message('!nhac Carefree Kevin MacLeod'));
  assert.equal(prepared, 1);
  assert.equal(cleaned, 1);
  assert.deepEqual(calls.find(x => x[0] === 'voice'), [
    'voice', { voiceUrl: 'https://example.org/voice.aac' }, 'group-123', ThreadType.Group,
  ]);
  assert.ok(calls.filter(x => x[0] === 'text').every(x => typeof x[1] === 'string'));
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
  }));
  await handler(message('!scl https://soundcloud.com/a/b'));
  assert.equal(cleaned, true);
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
