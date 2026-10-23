import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const font = fileURLToPath(new URL('../fonts/BeVietnamPro-Regular.ttf', import.meta.url));
const width = 1080, height = 380;
const clean = value => String(value || '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
const xml = value => clean(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export function durationLabel(seconds) {
  const value = Number(seconds);
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

function titleLines(title) {
  const words = clean(title || 'Nhạc SoundCloud').split(/\s+/);
  const lines = []; let line = '';
  const fit = value => Array.from(value).length <= 30;
  const clip = value => Array.from(value).slice(0, 29).join('') + '…';
  for (let i = 0; i < words.length; i++) {
    const joined = line ? `${line} ${words[i]}` : words[i];
    if (fit(joined)) { line = joined; continue; }
    if (!line) { line = clip(words[i]); }
    else if (lines.length === 0) { lines.push(line); line = fit(words[i]) ? words[i] : clip(words[i]); continue; }
    else { line = clip(joined); break; }
    if (lines.length === 1 || i < words.length - 1 && line.endsWith('…')) break;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export async function coverDataUrl(value, fetcher = fetch) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(url.hostname === 'sndcdn.com' || url.hostname.endsWith('.sndcdn.com'))) return null;
  try {
    const response = await fetcher(url.href, { signal: AbortSignal.timeout(7000), redirect: 'error' });
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
      await response.body?.cancel();
      return null;
    }
    const max = 3 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > max) { await response.body?.cancel(); return null; }
    const reader = response.body.getReader(), chunks = [];
    let size = 0;
    for (;;) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > max) { await reader.cancel(); return null; }
      chunks.push(Buffer.from(chunk));
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
  } catch { return null; }
}

export async function createMusicCard(track, options = {}) {
  await access(font);
  const cover = await coverDataUrl(track.thumbnail, options.fetcher);
  const lines = titleLines(track.title);
  const artist = clean(track.artist || 'SoundCloud');
  const artistText = artist.length > 46 ? `${artist.slice(0, 43)}…` : artist;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#18283d"/><stop offset="1" stop-color="#0b1221"/></linearGradient>
    <linearGradient id="art" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff9850"/><stop offset="1" stop-color="#d84d34"/></linearGradient>
    <clipPath id="cover"><rect x="36" y="50" width="280" height="280" rx="22"/></clipPath>
  </defs>
  <rect width="1080" height="380" rx="30" fill="url(#bg)"/>
  <circle cx="1040" cy="36" r="180" fill="#365070" opacity=".12"/>
  <rect x="36" y="50" width="280" height="280" rx="22" fill="url(#art)"/>
  ${cover ? `<image x="36" y="50" width="280" height="280" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover)" xlink:href="${cover}"/>` : `<circle cx="176" cy="190" r="87" fill="#172136"/><circle cx="176" cy="190" r="60" fill="none" stroke="#40506b" stroke-width="2"/><circle cx="176" cy="190" r="31" fill="#fa8850"/><circle cx="176" cy="190" r="7" fill="#172136"/>`}
  <g font-family="Be Vietnam Pro" font-weight="400">
    <text x="358" y="76" font-size="17" fill="#ff9d6c" letter-spacing="3">SOUNDCLOUD</text>
    ${lines.map((line, i) => `<text x="355" y="${140 + i * 52}" font-size="38" fill="#f8fafc">${xml(line)}</text>`).join('')}
    <text x="358" y="247" font-size="22" fill="#b4c3d6">${xml(artistText)}</text>
    <rect x="358" y="280" width="109" height="43" rx="13" fill="#25374d"/>
    <text x="378" y="309" font-size="20" fill="#e4edf7">${durationLabel(track.duration)}</text>
  </g>
  <g transform="translate(900 280)" fill="#ff9d6c">
    ${[10, 22, 36, 19, 30, 43, 26, 16, 33, 21, 11].map((h, i) => `<rect x="${i * 10}" y="${(43 - h) / 2}" width="5" height="${h}" rx="2.5"/>`).join('')}
  </g>
  </svg>`;
  const renderer = new Resvg(svg, { font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: 'Be Vietnam Pro' } });
  const png = Buffer.from(renderer.render().asPng());
  return { data: png, filename: 'music-card.png', metadata: { width, height, totalSize: png.length } };
}
