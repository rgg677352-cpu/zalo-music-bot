import { selectedFastHistory } from './fast-engine.mjs';
import { quoteProblem } from './exness-quotes.mjs';
import { priceActionContext } from './risk-tools.mjs';
export function scalpEvent(bars, asset, study) {
  return selectedFastHistory({ provider: 'Bitget', [asset.toLowerCase() + '1']: bars }, asset, study, { allDay: true }).at(-1);
}
export function scalpSetup({bars, asset, study, quote, anchor = quote, now = Date.now()/1000, event}) {
  const paused = reason => ({ status: 'stale', asset, frame: 'SCALP', reason });
  if (!['BTC', 'ETH'].includes(asset)) return { status: 'unavailable', reason: 'Scalp hiện hỗ trợ BTC và ETH.' };
  if (!Array.isArray(bars) || bars.length < 220 || bars.some((b,i) => ![b.t,b.o,b.h,b.l,b.c,b.v].every(Number.isFinite) || b.t%60 || b.l<=0 || b.h<Math.max(b.o,b.c) || b.l>Math.min(b.o,b.c) || b.t+62>now || i&&b.t-bars[i-1].t!==60)) return paused('Nến M1 thiếu, chưa đóng hoặc không liên tục.');
  if (bars.at(-1).t+60 < Math.floor((now-2)/60)*60) return paused('Đang chờ nến M1 mới.');
  const e = event || scalpEvent(bars,asset,study);
  if (!e || !e.known || e.t!==bars.at(-1).t) return paused('Chưa đủ dữ liệu tính chỉ báo scalp.');
  if (!e.side || !e.inSession) return { status:'waiting',asset,frame:'SCALP',reason:'Đang chờ tín hiệu scalp M1 mới.',rule:e.familyName };
  const expires=e.available+45;
  if (now<e.available || now>=expires) return { status:'waiting',asset,frame:'SCALP',reason:'Setup scalp cũ đã hết hạn; chờ tín hiệu mới.' };
  const validQuote = q => q && [q.bid,q.ask,q.t].every(Number.isFinite) && q.bid>0 && q.ask>=q.bid && now-q.t<=5 && q.t<=now+3;
  if (!validQuote(quote) || !validQuote(anchor) || anchor.source!=='Bitget' || !['Bitget','Exness công khai'].includes(quote.source) || Math.abs(quote.t-anchor.t)>5) return paused('Báo giá chưa mới hoặc khác nguồn dự kiến.');
  const ratio=(quote.bid+quote.ask)/(anchor.bid+anchor.ask);
  if (ratio<.98 || ratio>1.02) return paused('Chênh lệch giá tham chiếu quá lớn.');
  const atr=e.atr*ratio, risk=atr*e.stopMultiplier, reward=atr*e.targetMultiplier;
  if (!(risk>0) || quote.ask-quote.bid>atr*.5) return paused('Spread quá lớn so với ATR M5.');
  const entry=e.side===1?quote.ask:quote.bid, sl=entry-e.side*risk, tp=entry+e.side*reward;
  if (sl<=0 || tp<=0) return paused('Khoảng Entry/TP/SL không hợp lệ.');
  return { status:'setup',asset,frame:'SCALP',id:asset+':scalp:'+e.t,side:e.side,entry,low:entry-.03*risk,high:entry+.03*risk,sl,tp,risk,rr:reward/risk,hold:e.holdSeconds,candle:e.t,created:now,quote_time:quote.t,quote_bid:quote.bid,quote_ask:quote.ask,quote_transport:quote.transport,instrument:asset+(quote.source==='Bitget'?'USDT':'USD'),order_type:'MARKET',expires,rule:e.familyName,session:e.session,source:quote.source,candle_source:'Bitget',currency:quote.source==='Bitget'?'USDT':'USD',reference:true,accepted:e.accepted===true,experimental:e.accepted!==true,demo:true };
}
export function createScalpClient({market, study, referenceQuote}) {
  const cache=new Map();
  return { async snapshot(asset) {
    if (!['BTC','ETH'].includes(asset)) return {status:'unavailable',reason:'Scalp hiện hỗ trợ BTC và ETH.'};
    const bars=await market.candles(asset,'SCALP');
    let saved=cache.get(asset);
    if(saved?.bars!==bars){const series=selectedFastHistory({provider:'Bitget',[asset.toLowerCase()+'1']:bars},asset,study,{allDay:true});saved={bars,event:series.at(-1),lastSignal:series.findLast(e=>e.side&&e.known)?.available};cache.set(asset,saved)}
    const {event,lastSignal}=saved;
    const result=s=>({...s,candle:bars.at(-1)?.t,rule:s.rule||event?.familyName,checks:event?.checks,last_signal:lastSignal,signal_time:event?.known&&event.side&&event.inSession?event.available:undefined,signal_side:event?.side,candle_source:'Bitget'});
    const initialNow=market.clock();
    if(!event?.known || !event.side || !event.inSession || initialNow<event.available || initialNow>=event.available+45) return result(scalpSetup({bars,asset,study,now:initialNow,event}));
    let quoteFailure;const [initialAnchor,reference]=await Promise.all([market.quote(asset),referenceQuote?referenceQuote(asset).catch(error=>{quoteFailure=quoteProblem(error);return null}):null]);
    const anchor=market.clock()-initialAnchor.t>4?await market.quote(asset):initialAnchor;
    const now=market.clock();
    if(!reference || reference.source!=='Exness công khai' || now-reference.t>5 || reference.t>now+3 || Math.abs(reference.t-anchor.t)>5) return result({status:'stale',asset,frame:'SCALP',reason:'Chưa có giá Exness mới; tạm dừng setup, không dùng giá Bitget làm Entry.'+(quoteFailure?' '+quoteFailure:'')});
    return result(priceActionContext(scalpSetup({bars,asset,study,quote:reference,anchor,now,event}),bars,anchor,now));
  }};
}
