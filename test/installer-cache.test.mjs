import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm, utimes, symlink, open, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { cleanFFmpegCache, ffmpegCacheBusy } from '../src/installer-cache.mjs';
import { createStorage } from '../src/storage.mjs';
import { createMaintenance } from '../src/maintenance.mjs';
import { run } from '../src/process.mjs';
import { ThreadType } from 'zca-js';

const key = 'a'.repeat(128), key2 = 'b'.repeat(128);
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'bot-ffmpeg-cache-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const root = join(dir, '.cache', 'ffmpeg-static-nodejs'), binary = join(dir, 'node_modules', 'ffmpeg-static', 'ffmpeg');
  await mkdir(root, { recursive: true }); await mkdir(join(dir, 'node_modules', 'ffmpeg-static'), { recursive: true });
  await writeFile(binary, 'INSTALLED BINARY');
  const paths = [join(root, key + '.body'), join(root, key + '.json')];
  for (const path of paths) { await writeFile(path, path.endsWith('.body') ? 'DOWNLOAD BACKUP' : '{}'); const old = new Date(Date.now() - 120000); await utimes(path, old, old); }
  const options = { root, binary, busy: async () => false, execute: async () => 'ffmpeg version test' };
  return { dir, root, binary, paths, options, clean: extra => cleanFFmpegCache({ ...options, ...extra }) };
}
const missing = path => assert.rejects(access(path), { code: 'ENOENT' });

test('clears completed HTTP cache files and old orphan bodies, preserving installed FFmpeg and unrelated state', async t => {
  const f = await fixture(t), orphan = join(f.root, key2 + '.body'); await writeFile(orphan, 'aborted'); const old = new Date(Date.now() - 120000); await utimes(orphan, old, old);
  await writeFile(join(f.root, 'user-notes.txt'), 'KEEP'); await mkdir(join(f.root, 'other-directory'));
  await mkdir(join(f.dir, 'data')); await writeFile(join(f.dir, 'data', 'session.json'), 'SESSION'); await writeFile(join(f.dir, '.env'), 'ENV');
  const result = await f.clean(); assert.equal(result.removed, 3); assert.equal(result.bytes, 24); assert.equal(result.skipped, 2);
  for (const path of [...f.paths, orphan]) await missing(path);
  assert.equal(await readFile(f.binary, 'utf8'), 'INSTALLED BINARY'); assert.equal(await readFile(join(f.root, 'user-notes.txt'), 'utf8'), 'KEEP'); assert.equal(await readFile(join(f.dir, 'data', 'session.json'), 'utf8'), 'SESSION'); assert.equal(await readFile(join(f.dir, '.env'), 'utf8'), 'ENV');
});

test('missing, failing, or unexpected FFmpeg version never permits cache deletion', async t => {
  const f = await fixture(t);
  for (const extra of [{ binary: join(f.dir, 'missing') }, { execute: async () => { throw Error('binary failed'); } }, { execute: async () => 'something else' }]) {
    const r = await f.clean(extra); assert.equal(r.removed, 0); assert.equal(r.reason, 'ffmpeg'); await access(f.paths[0]);
  }
});

test('refuses cache-root symlinks, cache file symlinks, and an installed binary pointing into cache', async t => {
  const f = await fixture(t), link = join(f.dir, 'cache-link'); await symlink(f.root, link);
  assert.equal((await f.clean({ root: link })).reason, 'unsafe'); await access(f.paths[0]);
  await rm(f.paths[0]); await symlink(f.binary, f.paths[0]); const a = await f.clean(); assert.equal(a.removed, 1); assert.equal(a.skipped, 1); assert.equal(await readFile(f.binary, 'utf8'), 'INSTALLED BINARY');
  const inside = join(f.root, 'installed-ffmpeg'); await writeFile(inside, 'INSIDE'); await rm(f.binary); await symlink(inside, f.binary);
  assert.equal((await f.clean()).reason, 'ffmpeg'); assert.equal(await readFile(inside, 'utf8'), 'INSIDE');
});

test('busy/unknown cache is postponed and files changed in the last minute are retained', async t => {
  const f = await fixture(t);
  for (const busy of [true, null]) { const r = await f.clean({ busy: async () => busy }); assert.equal(r.reason, 'busy'); assert.equal(r.removed, 0); }
  await utimes(f.paths[0], new Date(), new Date()); const r = await f.clean(); assert.equal(r.removed, 1); assert.equal(r.skipped, 1); await access(f.paths[0]);
});

test('real Linux open-file check protects cache while an installer holds a body open', { skip: process.platform !== 'linux' }, async t => {
  const f = await fixture(t), handle = await open(f.paths[0], 'r'); t.after(() => handle.close());
  assert.equal(await ffmpegCacheBusy(f.root), true); const r = await f.clean({ busy: ffmpegCacheBusy }); assert.equal(r.reason, 'busy'); assert.equal(r.removed, 0);
});

test('startup and !clean reclaim a 560.7 MB cache fixture even when temporary directories are empty', async t => {
  const f = await fixture(t), bytes = Math.round(560.7 * 1024 * 1024); await truncate(f.paths[0], bytes); const old = new Date(Date.now() - 120000); await utimes(f.paths[0], old, old);
  const manager = createStorage({ root: join(f.dir, 'tmp'), appRoot: f.dir, installerCache: () => f.clean() }); t.after(() => manager.stop());
  const r = await manager.start(); assert.equal(r.removed, 0); assert.equal(r.cache.removed, 2); assert.equal(r.cache.bytes, bytes + 2);
  await writeFile(f.paths[0], 'small cache'); await utimes(f.paths[0], old, old);
  const sent = [], handler = createMaintenance({ sendMessage: async text => sent.push(text) }, { manager });
  await handler.handle({ type: ThreadType.Group, threadId: '100', data: { content: '!clean', msgId: '1', uidFrom: '1' } });
  assert.match(sent[0], /Cache FFmpeg: xóa 1 file/); assert.match(sent[0], /Giữ phiên Zalo/); await missing(f.paths[0]);
});

test('real installed FFmpeg works before and after clearing an isolated download cache', async t => {
  const f = await fixture(t), before = await run(ffmpeg, ['-version']);
  const r = await f.clean({ binary: ffmpeg, execute: run, busy: ffmpegCacheBusy }); assert.equal(r.reason, undefined); assert.equal(r.removed, 2);
  assert.equal(await run(ffmpeg, ['-version']), before);
});
