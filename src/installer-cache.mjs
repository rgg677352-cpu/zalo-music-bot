import { readdir, lstat, readFile, readlink, realpath, unlink } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import ffmpeg from 'ffmpeg-static';
import { run } from './process.mjs';

export const ffmpegCacheRoot = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ffmpeg-static-nodejs');
const inside = (path, root) => path === root || path.startsWith(root + sep);
const cacheFile = /^[a-f0-9]{128}\.(?:body|json)$/;

// Inspect open file paths only, never command lines or environment variables.
// If an installer might be using this cache, defer rather than interrupt it.
export async function ffmpegCacheBusy(root) {
  if (process.platform !== 'linux') return null;
  try {
    let budget = 30000, unknown = false;
    for (const pid of await readdir('/proc')) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        if (typeof process.getuid === 'function' && (await lstat('/proc/' + pid)).uid !== process.getuid()) continue;
        // Exited children may remain as zombies with unreadable fd directories;
        // zombies have already closed every file and cannot be cache users.
        const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
        if (/^[ZX] /.test(stat.slice(stat.lastIndexOf(')') + 2))) continue;
        for (const fd of await readdir(`/proc/${pid}/fd`)) {
          if (--budget < 0) return null;
          try { if (inside(await readlink(`/proc/${pid}/fd/${fd}`), root)) return true; }
          catch (e) { if (!['ENOENT', 'ESRCH', 'EINVAL'].includes(e.code)) unknown = true; }
        }
      } catch (e) { if (!['ENOENT', 'ESRCH'].includes(e.code)) unknown = true; }
    }
    return unknown ? null : false;
  } catch { return null; }
}

export async function cleanFFmpegCache({ root = ffmpegCacheRoot, binary = ffmpeg, now = Date.now, busy = ffmpegCacheBusy, execute = run, minAgeMs = 60000 } = {}) {
  const result = { removed: 0, bytes: 0, skipped: 0, reason: undefined };
  try {
    root = resolve(root);
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink()) return { ...result, reason: 'unsafe' };
    const canonical = await realpath(root), names = await readdir(root);
    // Invalidate metadata before removing bodies so a later installer gets a
    // cache miss instead of metadata pointing to an already removed body.
    const files = names.filter(n => cacheFile.test(n)).sort((a, b) => Number(a.endsWith('.body')) - Number(b.endsWith('.body')));
    result.skipped = names.length - files.length;
    if (!files.length) return result;
    // The installed executable must be a separate working file, not a symlink
    // pointing back into the download cache we are about to remove.
    if (typeof binary !== 'string') return { ...result, reason: 'ffmpeg' };
    try {
      const installed = await realpath(binary), stat = await lstat(installed);
      if (!stat.isFile() || inside(installed, canonical)) return { ...result, reason: 'ffmpeg' };
      const version = await execute(binary, ['-version'], { timeout: 15000, maxOutput: 100000, stage: 'kiem-tra-cache-ffmpeg' });
      if (!/^ffmpeg version\s/i.test(version)) return { ...result, reason: 'ffmpeg' };
    } catch { return { ...result, reason: 'ffmpeg' }; }
    if (await busy(canonical) !== false) return { ...result, reason: 'busy' };
    for (const name of files) {
      const path = join(root, name);
      try {
        // Do not follow symlinks or recurse into unexpected subdirectories.
        const before = await lstat(path);
        if (!before.isFile() || before.isSymbolicLink() || now() - before.mtimeMs < minAgeMs) { result.skipped++; continue; }
        if (await realpath(root) !== canonical) return { ...result, reason: 'unsafe' };
        const current = await lstat(path);
        if (!current.isFile() || current.ino !== before.ino || current.dev !== before.dev || current.size !== before.size || current.mtimeMs !== before.mtimeMs) { result.skipped++; continue; }
        await unlink(path);
        result.removed++; result.bytes += current.size;
      } catch (e) { if (e.code !== 'ENOENT') result.skipped++; }
    }
    return result;
  } catch (e) {
    return { ...result, reason: e.code === 'ENOENT' ? undefined : 'unavailable' };
  }
}
