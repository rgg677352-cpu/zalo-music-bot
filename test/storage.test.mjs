import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, utimes, symlink, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { ThreadType } from 'zca-js';
import { createStorage } from '../src/storage.mjs';
import { createMaintenance } from '../src/maintenance.mjs';
import { runDownloader } from '../src/music.mjs';
import { run } from '../src/process.mjs';

async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'bot-storage-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = join(dir, 'tmp'), manager = createStorage({ root, appRoot: dir, mediaRunning: async () => false, ...options });
  t.after(() => manager.stop());
  await mkdir(join(root, 'native'), { recursive: true });
  return { dir, root, manager };
}
const missing = async path => { await assert.rejects(access(path), { code: 'ENOENT' }); };

test('startup reclaims crashed extractor and aged tracks, never auth/state or an unrelated folder', async t => {
  const f = await fixture(t), old = join(f.root, 'track-legacy'), mei = join(f.root, 'native', '_MEIold123');
  for (const path of [old, mei, join(f.root, 'notes'), join(f.dir, 'data')]) await mkdir(path, { recursive: true });
  await writeFile(join(old, 'source.aac'), 'old audio'); await writeFile(join(mei, 'libpython.so'), 'runtime');
  for (const name of ['session.json', 'control.json', 'trading-subscriptions.json', 'music-history.json']) await writeFile(join(f.dir, 'data', name), 'KEEP ' + name);
  await writeFile(join(f.dir, '.env'), 'KEEP env'); await writeFile(join(f.root, 'notes', 'keep.txt'), 'KEEP notes');
  await mkdir(join(f.root, 'track-fresh'));
  const time = new Date(Date.now() - 2 * 3600000); await utimes(join(old, 'source.aac'), time, time); await utimes(old, time, time);
  const result = await f.manager.start(); assert.equal(result.removed, 2); assert.ok(result.bytes > 0);
  await missing(old); await missing(mei);
  await access(join(f.root, 'track-fresh'));
  for (const name of ['session.json', 'control.json', 'trading-subscriptions.json', 'music-history.json']) assert.equal(await readFile(join(f.dir, 'data', name), 'utf8'), 'KEEP ' + name);
  assert.equal(await readFile(join(f.dir, '.env'), 'utf8'), 'KEEP env'); assert.equal(await readFile(join(f.root, 'notes', 'keep.txt'), 'utf8'), 'KEEP notes');
});

test('active track/native jobs survive manual cleanup from another local manager; cleanup releases them', async t => {
  const f = await fixture(t), a = await f.manager.createJob('native'), b = await f.manager.createJob('track');
  await mkdir(join(a.directory, '_MEIworking')); await writeFile(join(b.directory, 'voice.aac'), 'still uploading');
  const second = createStorage({ root: f.root, appRoot: f.dir, mediaRunning: async () => false });
  const result = await second.sweep(); assert.equal(result.removed, 0); assert.equal(result.skipped, 2);
  assert.equal(await readFile(join(b.directory, 'voice.aac'), 'utf8'), 'still uploading');
  await Promise.all([a.cleanup(), b.cleanup()]); await missing(a.directory); await missing(b.directory);
});

test('dead owner lease is reclaimed, live media protects unleased legacy extraction', async t => {
  const f = await fixture(t), path = join(f.root, 'native', 'run-orphan'); await mkdir(path);
  await writeFile(join(path, '.bot-temp.json'), JSON.stringify({ marker: 'zalo-bot-temp-v1', pid: 2147483647, released: false }));
  assert.equal((await f.manager.sweep()).removed, 1);
  const legacy = join(f.root, 'native', '_MEIbusy'); await mkdir(legacy);
  const busy = createStorage({ root: f.root, mediaRunning: async () => true }); assert.equal((await busy.sweep()).removed, 0); await access(legacy);
});

test('a separate live bot process protects its leased job during manual cleanup', async t => {
  const f = await fixture(t), child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
  await once(child, 'spawn'); t.after(async () => { const done = once(child, 'close'); child.kill(); await done; });
  const path = join(f.root, 'native', 'run-other-bot'); await mkdir(path);
  await writeFile(join(path, '.bot-temp.json'), JSON.stringify({ marker: 'zalo-bot-temp-v1', pid: child.pid, released: false }));
  const result = await f.manager.sweep(); assert.equal(result.removed, 0); await access(path);
});

test('cleanup never follows a symlink into session/data, including a replaced native root', async t => {
  const f = await fixture(t); await mkdir(join(f.dir, 'data')); await writeFile(join(f.dir, 'data', 'session.json'), 'KEEP');
  await symlink(join(f.dir, 'data'), join(f.root, 'native', '_MEIlink')); await f.manager.sweep(); assert.equal(await readFile(join(f.dir, 'data', 'session.json'), 'utf8'), 'KEEP');
  await rm(join(f.root, 'native'), { recursive: true }); await symlink(join(f.dir, 'data'), join(f.root, 'native'));
  await assert.rejects(f.manager.createJob('native'), { code: 'TEMP_ROOT_UNSAFE' }); await f.manager.sweep(); assert.equal(await readFile(join(f.dir, 'data', 'session.json'), 'utf8'), 'KEEP');
});

test('extractor temporary directory is removed after success, rejection and a TLS retry completes', async () => {
  let path, release; const pending = new Promise(resolve => { release = resolve; }); let call = 0;
  const promise = runDownloader(['--version'], {}, async (_cmd, _args, settings) => {
    path = settings.env.TMPDIR; await mkdir(join(path, '_MEItest'), { recursive: true });
    if (++call === 1) throw Object.assign(new Error('TLS'), { reason: 'TLS' });
    await pending; return 'OK';
  });
  for (let i = 0; i < 100 && call < 2; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(call, 2); await access(path); release(); assert.equal(await promise, 'OK'); await missing(path);
  await assert.rejects(runDownloader(['--version'], {}, async (_c, _a, s) => { path = s.env.TMPDIR; await writeFile(join(path, 'partial'), 'partial'); throw Error('failed'); })); await missing(path);
  assert.equal(await runDownloader(['--version'], {}, async (_c, _a, s) => { path = s.env.TMPDIR; return 'success'; }), 'success'); await missing(path);
});

test('periodic sweep reclaims an orphan created after startup', async t => {
  const f = await fixture(t, { intervalMs: 15 }); await f.manager.start(); const path = join(f.root, 'native', '_MEIlater'); await mkdir(path);
  for (let i = 0; i < 100; i++) { try { await access(path); } catch { break; } await new Promise(resolve => setTimeout(resolve, 10)); }
  await missing(path);
});

test('storage/clean commands work without setup, do not expose file contents or repeat duplicate events', async t => {
  const f = await fixture(t), replies = [], handler = createMaintenance({ sendMessage: async text => replies.push(text) }, { manager: f.manager, prefix: '?' });
  const event = text => ({ type: ThreadType.Group, threadId: '123', data: { content: text, uidFrom: '1', msgId: text } });
  assert.equal(await handler.handle(event('!storage')), true); assert.match(replies[0], /Ổ đĩa/); assert.match(replies[0], /RAM/);
  await handler.handle(event('!storage')); assert.equal(replies.length, 1);
  await handler.handle(event('?clean')); assert.match(replies[1], /Giữ phiên Zalo/); assert.equal(await handler.handle(event('!BTC')), false);
});

test('timeout kills the whole process group, not just the extractor parent', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t), marker = join(f.dir, 'orphan-wrote.txt');
  const script = `const {spawn}=require('node:child_process');spawn(process.execPath,['-e',${JSON.stringify("setTimeout(()=>require('node:fs').writeFileSync(" + JSON.stringify(marker) + ", 'orphan'), 700)")}],{stdio:'ignore'});setInterval(()=>{},1000)`;
  await assert.rejects(run(process.execPath, ['-e', script], { timeout: 200, stage: 'test-kill' }), { code: 'MEDIA_PROCESS_FAILED' });
  await new Promise(resolve => setTimeout(resolve, 900)); await missing(marker);
});
