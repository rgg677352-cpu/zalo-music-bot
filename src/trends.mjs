import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import { runDownloader, soundCloudTarget } from './music.mjs';

const HOUR = 3600000;
const countries = ['vn', 'us', 'gb', 'kr'];
export const normalized = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const baseTitle = value => normalized(String(value).replace(/\s*[([](?:feat\.?|ft\.?)[^\])]*[\])]/gi, ''));
const identity = (title, artist) => `${baseTitle(title)}::${normalized(artist)}`;
const trendError = message => Object.assign(new Error(message), { code: 'TREND_UNAVAILABLE' });

async function jsonBody(response) {
  if (!response.ok) throw new Error('Chart HTTP error');
  if (Number(response.headers.get('content-length')) > 1000000) throw new Error('Chart too large');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1000000) throw new Error('Chart too large'); chunks.push(Buffer.from(value)); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}

export function parseChart(data, country, now) {
  const feed = data?.feed, updated = Date.parse(feed?.updated);
  if (!Number.isFinite(updated) || updated > now + 24 * HOUR || now - updated > 7 * 24 * HOUR || !Array.isArray(feed?.results)) throw new Error('Chart stale or invalid');
  const seen = new Set();
  const tracks = feed.results.slice(0, 100).flatMap(t => {
    if (typeof t.name !== 'string' || !t.name.trim() || typeof t.artistName !== 'string' || !t.artistName.trim()) return [];
    const title = t.name.trim().slice(0, 200), artist = t.artistName.trim().slice(0, 150), key = identity(title, artist);
    if (seen.has(key)) return []; seen.add(key);
    return [{ title, artist, key, country, updated }];
  });
  if (!tracks.length) throw new Error('Chart empty');
  return tracks;
}

export function matchSoundCloud(entries, song, maxDuration) {
  const title = baseTitle(song.title).split(' ').filter(Boolean), artist = normalized(song.artist).split(' ').filter(w => w.length > 2);
  return (entries || []).flatMap(t => {
    const url = t.webpage_url || t.url;
    try { if (!/^https:\/\//.test(url)) return []; soundCloudTarget(url); } catch { return []; }
    if (!Number.isFinite(t.duration) || t.duration < 90 || t.duration > maxDuration) return [];
    const candidate = normalized(t.title), combined = `${candidate} ${normalized(t.uploader || t.artist)}`;
    const extras = ['mashup', 'remix', 'slowed', 'sped', 'nightcore', 'cover', 'karaoke', 'instrumental'];
    if (extras.some(w => candidate.split(' ').includes(w) && !normalized(song.title).split(' ').includes(w))) return [];
    const coverage = title.filter(w => candidate.split(' ').includes(w)).length / Math.max(1, title.length);
    const words = candidate.split(' ').filter(w => !artist.includes(w) && !['official', 'audio', 'video', 'lyrics', 'lyric', 'mv', 'hd', 'hq', 'full', 'music', 'vietsub'].includes(w));
    if (title.length <= 2 && !artist.some(w => combined.includes(w))) return [];
    if (!title.length || coverage < 0.8 || title.length / Math.max(1, words.length) < 0.5) return [];
    return [{ ...t, webpage_url: url, score: coverage + (artist.some(w => combined.includes(w)) ? 0.5 : 0) }];
  }).sort((a, b) => b.score - a.score);
}

export function createTrending({ dataDir, fetcher = fetch, now = Date.now, choose = n => randomInt(n), execute = runDownloader } = {}) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const cachePath = join(dataDir, 'trends-cache.json'), historyPath = join(dataDir, 'music-history.json');
  let cache = {}, groups = {}, refreshing;
  try { cache = JSON.parse(readFileSync(cachePath, 'utf8')); if (!cache || Array.isArray(cache) || typeof cache !== 'object') cache = {}; } catch {}
  if (existsSync(historyPath)) {
    try {
      groups = JSON.parse(readFileSync(historyPath, 'utf8'));
      if (!groups || Array.isArray(groups) || typeof groups !== 'object') throw new Error();
      for (const [id, h] of Object.entries(groups)) if (!/^\d+$/.test(id) || !Array.isArray(h.keys) || !Array.isArray(h.urls) || h.keys.some(k => typeof k !== 'string') || h.urls.some(k => typeof k !== 'string') || h.keys.length > 80 || h.urls.length > 80 || !['vn', 'intl'].includes(h.lastRegion)) throw new Error();
    } catch { throw Object.assign(new Error('Không đọc được data/music-history.json. Giữ bản sao và kiểm tra file.'), { code: 'MUSIC_HISTORY_INVALID' }); }
  }
  const save = (path, value) => { writeFileSync(`${path}.new`, JSON.stringify(value), { mode: 0o600 }); renameSync(`${path}.new`, path); };
  function cached(country, age) {
    const entry = cache?.[country];
    if (!entry || !Number.isFinite(entry.at) || entry.at > now() || now() - entry.at > age) return null;
    try { return parseChart(entry.data, country, now()); } catch { return null; }
  }
  async function charts() {
    const ready = countries.flatMap(country => cached(country, 6 * HOUR) || []);
    if (ready.some(t => t.country === 'vn') && ready.some(t => t.country !== 'vn')) return ready;
    if (!refreshing) refreshing = (async () => {
      const results = await Promise.allSettled(countries.map(async country => {
        const fresh = cached(country, 6 * HOUR); if (fresh) return fresh;
        try {
          const response = await fetcher(`https://rss.marketingtools.apple.com/api/v2/${country}/music/most-played/100/songs.json`, { signal: AbortSignal.timeout(12000), redirect: 'error' });
          const data = await jsonBody(response), tracks = parseChart(data, country, now());
          cache[country] = { at: now(), data }; return tracks;
        } catch { const old = cached(country, 48 * HOUR); if (old) return old; throw new Error('Chart unavailable'); }
      }));
      try { save(cachePath, cache); } catch { console.warn('Không lưu được cache bảng xếp hạng.'); }
      const tracks = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      if (!tracks.some(t => t.country === 'vn') || !tracks.some(t => t.country !== 'vn')) throw trendError('Chưa lấy được bảng xếp hạng Việt Nam và quốc tế. Thử lại sau hoặc gửi tên bài.');
      return tracks;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function prepare(group, maxDuration, prepareMusic, current = () => true) {
    const tracks = await charts();
    if (!current()) throw Object.assign(new Error('Request cancelled'), { code: 'REQUEST_CANCELLED' });
    const h = groups[group] || { keys: [], urls: [], lastRegion: 'intl' };
    const preferred = h.lastRegion === 'vn' ? 'intl' : 'vn';
    const tried = new Set();
    // Tối đa ba bài xếp hạng, mỗi bài xét tối đa ba bản SoundCloud.
    for (let attempt = 0; attempt < 3; attempt++) {
      const region = attempt % 2 === 0 ? preferred : preferred === 'vn' ? 'intl' : 'vn';
      const pool = [...new Map(tracks.filter(t => (t.country === 'vn' ? 'vn' : 'intl') === region).map(t => [t.key, t])).values()];
      const available = pool.filter(t => !h.keys.includes(t.key) && !tried.has(t.key));
      // Không quay lại bài trong lịch sử gần đây chỉ vì nguồn có ít bài.

      if (!available.length) continue;
      const song = available[choose(available.length)]; tried.add(song.key);
      const query = `${song.title.replace(/\s*[([](?:feat\.?|ft\.?)[^\])]*[\])]/gi, '')} ${song.artist}`.slice(0, 350);
      let candidates;
      try {
        const result = await execute(['--flat-playlist', '--playlist-items', '1:3', '--dump-single-json', '--skip-download', '--', `scsearch3:${query}`], { timeout: 30000, stage: 'tim-nhac-thinh-hanh' });
        candidates = matchSoundCloud(JSON.parse(result).entries, song, maxDuration);
      } catch { continue; }
      if (!current()) throw Object.assign(new Error('Request cancelled'), { code: 'REQUEST_CANCELLED' });
      const candidate = candidates.find(t => !h.urls.includes(t.webpage_url));
      if (!candidate) continue;
      let audio;
      try { audio = await prepareMusic(candidate.webpage_url, maxDuration); } catch (error) { if (error.reason === 'RATE_LIMIT') throw error; continue; }
      // Chặn bản xem trước và kết quả đổi metadata khi truy xuất đầy đủ.
      if (!matchSoundCloud([{ ...audio, webpage_url: audio.url, uploader: audio.artist }], song, maxDuration).length || h.urls.includes(audio.url)) { await audio.cleanup(); continue; }
      if (!current()) { await audio.cleanup(); throw Object.assign(new Error('Request cancelled'), { code: 'REQUEST_CANCELLED' }); }
      const next = { keys: [...h.keys, song.key].slice(-80), urls: [...h.urls, audio.url].slice(-80), lastRegion: region };
      // Ghi trước gửi để không lặp bài sau timeout/khởi động lại. Lượt gửi thất bại có thể bị bỏ qua.
      const updated = { ...groups, [group]: next };
      try { save(historyPath, updated); groups = updated; } catch (error) { await audio.cleanup(); throw error; }
      console.log(`Nhạc random: bảng Apple Music ${song.country.toUpperCase()}, cập nhật ${new Date(song.updated).toISOString().slice(0, 10)}; phát từ SoundCloud.`);
      return { ...audio, title: song.title, artist: song.artist };
    }
    throw trendError('Chưa tìm được bản SoundCloud phù hợp, đủ dài và chưa phát gần đây. Thử random lại hoặc gửi tên bài.');
  }
  return { prepare, charts };
}
