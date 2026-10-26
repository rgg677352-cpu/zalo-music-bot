import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadType } from 'zca-js';
import { automaticSetupMessage, createTrading } from '../src/trading.mjs';

const setup = frame => ({ status: 'setup', accepted: false, demo: true, experimental: true, asset: 'BTC', frame, rule: 'Donchian55', source: 'Exness công khai', side: 1, entry: 100, low: 99.7, high: 100.3, sl: 90, tp: 115, risk: 10, rr: 1.5, hold: frame === 'SCALP' ? 180 : 7200, candle: 1792825200, created: 1792828800, quote_time: 1792828800, expires: 1792828890 });
test('real Zalo mention metadata only on requested automatic HTF setups', () => {
  for (const frame of ['M15', 'M30', 'H4']) {
    const p = automaticSetupMessage(setup(frame)); assert.equal(p.msg.slice(0, 4), '@All'); assert.deepEqual(p.mentions, [{ pos: 0, len: 4, uid: '-1' }]); assert.match(p.msg, /DEMO · CHƯA ĐẠT KIỂM CHỨNG/);
  }
  for (const frame of ['H1', 'SCALP']) assert.equal(typeof automaticSetupMessage(setup(frame)), 'string');
});
test('automatic group broadcast tags once, persists dedup; manual setup/status do not tag', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'bot-all-')); t.after(() => rmSync(dir, { recursive: true, force: true })); const sent = [];
  const api = { sendMessage: async (content, id) => sent.push({ content, id }) }, opts = { statePath: join(dir, 'state.json'), now: () => 1792828800000, pollMs: 600000, scalpPollMs: 600000, provider: { snapshot: async (_a, f) => setup(f) } };
  const bot = createTrading(api, opts); t.after(() => bot.stop()); let id = 0; const event = content => ({ type: ThreadType.Group, threadId: '123', data: { content, uidFrom: '1', msgId: String(++id) } });
  await bot.handle(event('!on BTC M15')); bot.start(); await bot.tick(); await new Promise(r => setImmediate(r));
  const tags = () => sent.filter(x => x.content?.mentions); assert.equal(tags().length, 1); assert.deepEqual(tags()[0].content.mentions, [{ pos: 0, len: 4, uid: '-1' }]);
  await bot.tick(); assert.equal(tags().length, 1); await bot.handle(event('!status')); assert.equal(typeof sent.at(-1).content, 'string');
  await bot.handle(event('!BTC M15')); assert.equal(typeof sent.at(-1).content, 'string'); assert.equal(tags().length, 1);
  bot.stop(); const restored = createTrading(api, opts); t.after(() => restored.stop()); restored.start(); await restored.tick(); assert.equal(tags().length, 1);
});
