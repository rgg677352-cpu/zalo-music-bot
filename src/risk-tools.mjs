// Arithmetic helpers. No broker contract size, commission or fill is inferred.
export function positionBudget(equity, percent, stopDistance, costPerUnit = 0) {
  if (![equity, percent, costPerUnit].every(Number.isFinite) || equity <= 0 || percent <= 0 || percent > 100 || costPerUnit < 0) throw Error('Số vốn, % rủi ro hoặc chi phí không hợp lệ.');
  const budget = equity * (percent / 100);
  if (!Number.isFinite(budget) || budget <= 0 || budget > Number.MAX_SAFE_INTEGER) throw Error('Ngân sách không hợp lệ.');
  if (stopDistance === undefined) return { budget };
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) throw Error('Khoảng Entry–SL phải lớn hơn 0.');
  const lossPerUnit = stopDistance + costPerUnit, units = budget / lossPerUnit;
  if (!Number.isFinite(lossPerUnit) || !Number.isFinite(units) || units <= 0 || units > Number.MAX_SAFE_INTEGER / 1e6) throw Error('Khối lượng không hợp lệ.');
  return { budget, lossPerUnit, units };
}

export function rewardRisk(entry, sl, tp, costPerUnit = 0) {
  if (![entry, sl, tp, costPerUnit].every(Number.isFinite) || Math.min(entry, sl, tp) <= 0 || costPerUnit < 0 || !((sl < entry && tp > entry) || (sl > entry && tp < entry))) throw Error('Entry phải nằm giữa SL và TP; chi phí không âm.');
  const risk = Math.abs(entry - sl), reward = Math.abs(tp - entry), loss = risk + costPerUnit, win = reward - costPerUnit;
  if (![risk, reward, loss, win].every(Number.isFinite) || win <= 0) throw Error('TP không đủ bù chi phí đã nhập.');
  const netRR = win / loss;
  if (!Number.isFinite(netRR)) throw Error('R:R vượt giới hạn tính toán.');
  return { side: sl < entry ? 1 : -1, risk, reward, netRR, breakEvenWinRate: 1 / (1 + netRR) };
}

const number = x => Number(x).toLocaleString('en-US', { maximumFractionDigits: 6 });
const parse = value => /^\d+(?:[.,]\d+)?$/.test(value || '') ? Number(value.replace(',', '.')) : NaN;
export function riskCommand(name, args) {
  const riskUsage = '!risk vốn %rủi_ro [khoảng_Entry–SL phí_mỗi_đơn_vị]\nVí dụ: !risk 1000 0.5 100 2\nDùng cùng một đồng tiền; dấu chấm/phẩy là thập phân, không phân cách nghìn.';
  const rrUsage = '!rr Entry SL TP [phí_mỗi_đơn_vị]\nVí dụ: !rr 80000 79900 80150 2';
  try {
    const values = args.map(parse);
    if (name === 'RISK') {
      if (![2, 4].includes(args.length)) return riskUsage;
      const p = positionBudget(values[0], values[1], values[2], values[3] ?? 0);
      const lines = [`Ngân sách SL: ${number(p.budget)} (${number(values[1])}% vốn).`];
      if (p.units !== undefined) {
        // Round down for display, never up past the requested risk budget.
        const shown = Math.floor(p.units * 1e6) / 1e6;
        lines.push(shown > 0 ? `Khối lượng ≤${number(shown)} đơn vị cơ sở; chưa đổi sang lot.` : 'Khối lượng <0.000001 đơn vị cơ sở; không làm tròn tăng.');
        lines.push(`Mỗi đơn vị: SL ${number(values[2])} + phí/trượt ${number(values[3])}.`);
        lines.push('Phải kiểm tra contract size, bước/min lot và margin trên sàn; gap có thể vượt ngân sách.');
      } else lines.push('Thêm khoảng Entry–SL và phí mỗi đơn vị để tính khối lượng.');
      return lines.join('\n');
    }
    if (![3, 4].includes(args.length)) return rrUsage;
    const p = rewardRisk(...values);
    return `${p.side === 1 ? 'BUY' : 'SELL'} · R:R sau phí nhập 1:${number(p.netRR)}\nTỷ lệ thắng hòa vốn: ${(100 * p.breakEvenWinRate).toFixed(1)}% nếu lệnh chỉ kết thúc ở TP/SL.\nPhí/trượt thêm mỗi đơn vị: ${number(values[3] ?? 0)}. Spread đã nằm trong Entry thực tế thì không cộng lại.\nĐây là phép tính, không phải xác suất thắng dự báo.`;
  } catch (error) { return error.message + '\n' + (name === 'RISK' ? riskUsage : rrUsage); }
}

// Confirmed, unbroken pivots from closed reference candles only. These are
// context, not a new signal filter or a proven replacement for existing exits.
export function priceActionContext(plan, bars, anchor, now) {
  if (plan?.status !== 'setup') return plan;
  if (!Array.isArray(bars) || bars.length < 10 || !anchor || anchor.source !== 'Bitget' || plan.source !== 'Exness công khai' || ![anchor.bid, anchor.ask, anchor.t, plan.quote_bid, plan.quote_ask, plan.quote_time, plan.risk, plan.entry, plan.tp, plan.sl, now].every(Number.isFinite) || anchor.bid <= 0 || anchor.ask < anchor.bid || plan.quote_bid <= 0 || plan.quote_ask < plan.quote_bid || plan.risk <= 0 || ![1, -1].includes(plan.side) || now - anchor.t > 5 || anchor.t > now + 3 || now - plan.quote_time > 5 || plan.quote_time > now + 3 || Math.abs(anchor.t - plan.quote_time) > 5) return plan;
  const step = plan.frame === 'SCALP' ? 60 : ({M15:900, M30:1800, H1:3600, H4:14400})[plan.frame];
  if (!step || bars.some((b,i) => ![b.t,b.o,b.h,b.l,b.c].every(Number.isFinite) || b.l <= 0 || b.h < Math.max(b.o,b.c) || b.l > Math.min(b.o,b.c) || b.t + step + 2 > now || i && b.t - bars[i-1].t !== step)) return plan;
  const ratio = (plan.quote_bid + plan.quote_ask) / (anchor.bid + anchor.ask);
  if (ratio < .98 || ratio > 1.02) return plan;
  const rows = bars.slice(-60), pivots = [];
  for (let i = 2; i < rows.length - 2; i++) {
    const window = rows.slice(i-2, i+3), b = rows[i], later = rows.slice(i+1);
    // A pivot becomes known only after its two right-hand candles have closed.
    if (window.every((x,j) => j === 2 || x.h < b.h) && later.every(x => x.h < b.h)) pivots.push({side:-1, price:b.h*ratio, candle:b.t, confirmed:rows[i+2].t+step+2});
    if (window.every((x,j) => j === 2 || x.l > b.l) && later.every(x => x.l > b.l)) pivots.push({side:1, price:b.l*ratio, candle:b.t, confirmed:rows[i+2].t+step+2});
  }
  const opposing = pivots.filter(p => p.side === -plan.side && (p.price-plan.entry)*plan.side > 0).sort((a,b) => (a.price-b.price)*plan.side)[0];
  const support = pivots.filter(p => p.side === plan.side && (plan.entry-p.price)*plan.side > 0).sort((a,b) => (b.price-a.price)*plan.side)[0];
  const context = {source:'Bitget tham chiếu, quy đổi gần đúng', lookback:60, pivot_right:2, closed_at:rows.at(-1).t+step+2, spread_r:(plan.quote_ask-plan.quote_bid)/plan.risk, opposing:opposing || null, support:support || null};
  context.tp_beyond_obstacle = Boolean(opposing && (plan.tp-opposing.price)*plan.side > 0);
  context.sl_inside_structure = Boolean(support && (plan.sl-support.price)*plan.side > 0);
  if (opposing) context.headroom_r = (opposing.price-plan.entry)*plan.side/plan.risk;
  return {...plan, context};
}
