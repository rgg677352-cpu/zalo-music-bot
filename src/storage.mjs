import { mkdir, mkdtemp, readdir, lstat, readFile, readlink, writeFile, rename, rm, realpath } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { cleanFFmpegCache, ffmpegCacheRoot } from './installer-cache.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const tempRoot = join(projectRoot, 'tmp');
export const runtimeTemp = join(tempRoot, 'native');
const leaseName = '.bot-temp.json', hour = 3600000;
// Shared across manager instances so another local sweep cannot delete a live job.
const active = new Set();
const marker = 'zalo-bot-temp-v1';
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
async function identity(pid) {
  try {
    const raw = await readFile(`/proc/${pid}/stat`, 'utf8');
    const boot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
    return boot + ':' + raw.slice(raw.lastIndexOf(')') + 2).split(/\s+/)[19];
  } catch { return null; }
}

// Old PyInstaller directories have no lease. Do not reclaim them while a media
// executable is still running, including children orphaned by an older bot.
export async function hasLiveMedia() {
  if (process.platform !== 'linux') return null;
  try {
    const entries = await readdir('/proc');
    let unknown = false;
    for (const entry of entries) {
      if (!/^\d+$/.test(entry)) continue;
      try {
        if (typeof process.getuid === 'function' && (await lstat('/proc/' + entry)).uid !== process.getuid()) continue;
        const exe = (await readlink(`/proc/${entry}/exe`)).replace(/ \(deleted\)$/, '');
        if (/^(?:yt-dlp(?:_linux(?:_aarch64)?)?|ffmpeg)$/.test(basename(exe))) return true;
      } catch (e) { if (e.code === 'EPERM' || e.code === 'EACCES') unknown = true; }
    }
    return unknown ? null : false;
  } catch { return null; }
}

async function directory(path, create = false) {
  if (create) await mkdir(path, { recursive: true, mode: 0o700 });
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isDirectory()) throw Object.assign(new Error('Thư mục tạm không an toàn.'), { code: 'TEMP_ROOT_UNSAFE' });
  return realpath(path);
}

async function sizeOf(path, budget = { left: 50000 }) {
  if (--budget.left < 0) return { bytes: 0, latest: 0, partial: true };
  try {
    const s = await lstat(path);
    if (s.isSymbolicLink()) return { bytes: 0, latest: s.mtimeMs, partial: false };
    if (!s.isDirectory()) return { bytes: s.size, latest: s.mtimeMs, partial: false };
    let bytes = 0, latest = s.mtimeMs, partial = false;
    for (const name of await readdir(path)) {
      const child = await sizeOf(join(path, name), budget);
      bytes += child.bytes; latest = Math.max(latest, child.latest); partial ||= child.partial;
      if (budget.left <= 0) { partial = true; break; }
    }
    return { bytes, latest, partial };
  } catch (e) { return { bytes: 0, latest: 0, partial: e.code !== 'ENOENT' }; }
}

export function createStorage({ root = tempRoot, appRoot = projectRoot, now = Date.now, mediaRunning = hasLiveMedia, installerCache, intervalMs = 10 * 60000, onError = () => console.warn('Chưa dọn được file tạm/cache; dùng !storage để kiểm tra.') } = {}) {
  root = resolve(root); appRoot = resolve(appRoot);
  let canonical, timer, sweepPromise, lastSweep, usagePromise, usageCache;
  async function ready() {
    const path = await directory(root, true);
    if (canonical && path !== canonical) throw Object.assign(new Error('Thư mục tạm đã thay đổi.'), { code: 'TEMP_ROOT_UNSAFE' });
    canonical = path;
  }
  async function createJob(kind) {
    if (!['track', 'native'].includes(kind)) throw Error('Unknown temporary job type');
    await ready();
    const parent = kind === 'native' ? join(root, 'native') : root;
    if (kind === 'native') await directory(parent, true);
    const path = await mkdtemp(join(parent, kind === 'native' ? 'run-' : 'track-'));
    active.add(path);
    const lease = { marker, pid: process.pid, identity: await identity(process.pid), created: now(), released: false };
    const save = async () => { await writeFile(join(path, leaseName + '.new'), JSON.stringify(lease), { mode: 0o600 }); await rename(join(path, leaseName + '.new'), join(path, leaseName)); };
    try { await save(); } catch (e) { active.delete(path); await rm(path, { recursive: true, force: true }); throw e; }
    let cleanupPromise;
    return { directory: path, cleanup() {
      if (!cleanupPromise) cleanupPromise = (async () => {
        try {
          lease.released = true;
          try { await save(); } catch { /* Attempt removal even when the disk is full. */ }
          await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
        } finally { active.delete(path); }
      })();
      return cleanupPromise;
    } };
  }
  async function ownerLive(lease) {
    if (!Number.isSafeInteger(lease.pid) || lease.pid < 1) return false;
    // Same PID without a registered live job means this process already released
    // it, or an older container reused PID 1 after restart.
    if (lease.pid === process.pid) return false;
    if (!alive(lease.pid)) return false;
    const current = await identity(lease.pid);
    return !lease.identity || !current || current === lease.identity;
  }
  async function doSweep() {
    await ready();
    const candidates = [];
    for (const name of await readdir(root)) if (/^track-[a-zA-Z0-9_-]+$/.test(name)) candidates.push({ path: join(root, name), legacyNative: false });
    try {
      await directory(join(root, 'native'));
      for (const name of await readdir(join(root, 'native'))) if (/^(?:_MEI[a-zA-Z0-9_-]+|run-[a-zA-Z0-9_-]+)$/.test(name)) candidates.push({ path: join(root, 'native', name), legacyNative: name.startsWith('_MEI') });
    } catch (e) { if (e.code !== 'ENOENT' && e.code !== 'TEMP_ROOT_UNSAFE') throw e; }
    const media = candidates.length ? await mediaRunning() : false;
    const result = { removed: 0, bytes: 0, skipped: 0, partial: false, at: now() };
    for (const candidate of candidates) {
      const path = candidate.path;
      try {
        const s = await lstat(path);
        if (!s.isDirectory() || s.isSymbolicLink() || active.has(path)) { result.skipped++; continue; }
        let lease;
        try {
          const p = join(path, leaseName), st = await lstat(p);
          if (!st.isSymbolicLink() && st.isFile() && st.size <= 4096) {
            const parsed = JSON.parse(await readFile(p, 'utf8'));
            if (parsed.marker === marker) lease = parsed;
          }
        } catch {}
        if (lease && !lease.released && await ownerLive(lease)) { result.skipped++; continue; }
        // Unknown/active media can still use an old, unleased extraction.
        if (media !== false && !lease?.released) { result.skipped++; continue; }
        const usage = await sizeOf(path);
        if (usage.partial) { result.skipped++; result.partial = true; continue; }
        if (!lease && !candidate.legacyNative && now() - Math.max(s.mtimeMs, usage.latest) < hour) { result.skipped++; continue; }
        // New jobs are registered before being handed to download/upload code.
        if (active.has(path)) { result.skipped++; continue; }
        await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
        result.removed++; result.bytes += usage.bytes;
      } catch (e) { if (e.code !== 'ENOENT') { result.skipped++; result.partial = true; } }
    }
    if (installerCache) {
      try { result.cache = await installerCache(); }
      catch { result.cache = { removed: 0, bytes: 0, skipped: 0, reason: 'unavailable' }; }
    }
    lastSweep = result;
    usageCache = undefined;
    return result;
  }
  function sweep() {
    if (!sweepPromise) sweepPromise = doSweep().finally(() => { sweepPromise = undefined; });
    return sweepPromise;
  }
  async function measureUsage() {
    const categories = [];
    for (const [label, path] of [['File tạm', root], ['Thư viện Node', join(appRoot, 'node_modules')], ['Công cụ nhạc', join(appRoot, 'bin')], ['Dữ liệu đăng nhập/cấu hình', join(appRoot, 'data')], ['Cache npm trong bot', join(appRoot, '.npm')]]) categories.push({ label, ...(await sizeOf(path)) });
    const npm = join(homedir(), '.npm');
    if (resolve(npm) !== resolve(join(appRoot, '.npm'))) categories.push({ label: 'Cache npm ở thư mục home', ...(await sizeOf(npm)) });
    categories.push({ label: 'Cache tải FFmpeg', ...(await sizeOf(ffmpegCacheRoot)) });
    return { categories, nodeRSS: process.memoryUsage().rss, activeJobs: [...active].filter(p => p.startsWith(root + '/')).length, lastSweep };
  }
  function usage() {
    if (usageCache && now() - usageCache.at < 10000) return Promise.resolve(usageCache.value);
    if (!usagePromise) usagePromise = measureUsage().then(value => { usageCache = { at: now(), value }; return value; }).finally(() => { usagePromise = undefined; });
    return usagePromise;
  }
  return { createJob, sweep, usage, async start() { if (!timer) { timer = setInterval(() => void sweep().catch(onError), intervalMs); timer.unref?.(); } return sweep(); }, stop() { clearInterval(timer); timer = undefined; } };
}

export const storage = createStorage({ installerCache: cleanFFmpegCache });
export const sizeLabel = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
