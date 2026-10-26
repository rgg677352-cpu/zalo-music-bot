// Gold-only DEMO hypotheses. These parameters have not passed profit qualification.
// Reference: XAUUSDT perpetual M1. Execution levels: public Exness XAUUSD USD.
import { aggregate5 } from './scalp-session.mjs';
import { quoteProblem } from './exness-quotes.mjs';

export const GOLD_SCALP = Object.freeze({
  version: 'gold-limit-demo-v1', pendingSeconds: 180, holdSeconds: 180,
  depthATR5: .2, minRiskATR5: .8, maxRiskATR5: 2, maxSpreadRisk: .2,
  targetR: 1.2, minimumR: .7, accepted: false,
});
const zones = Object.fromEntries(['America/New_York','Europe/London'].map(zone => [zone,
  new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})]));
function local(t, zone) {
  const p=Object.fromEntries(zones[zone].formatToParts(new Date(t*1000)).map(p=>[p.type,p.value]));
  return {day:p.weekday, minute:Number(p.hour)*60+Number(p.minute), second:Number(p.second)};
}
export function goldSession(t) {
  const ny=local(t,'America/New_York'), london=local(t,'Europe/London');
  const end=(minute,p)=>Math.floor(t)+(minute-p.minute)*60-p.second;
  // Conservative strategy window, not an authoritative account holiday calendar.
  if(ny.day==='Sat'||ny.day==='Sun'&&ny.minute<18*60+15||ny.day==='Fri'&&ny.minute>=16*60+45)
    return {id:'closed',active:false,reason:'Vàng đang ngoài lịch ngày thường; chờ mở cửa và giá Exness mới.'};
  if(ny.minute>=16*60+45&&ny.minute<18*60+15)
    return {id:'rollover',active:false,reason:'Tạm nghỉ scalp vàng quanh rollover New York.'};
  if(ny.minute>=18*60+15&&((t%86400)+86400)%86400>=18*3600)
    return {id:'quiet',active:false,reason:'Tạm nghỉ scalp vàng đầu ngày mới; theo dõi lại từ 07h VN.'};
  if(london.minute<8*60)return {id:'asia',active:true,ends:end(8*60,london),rule:'XAU · Bollinger 20/2 · hồi vào dải'};
  if(ny.minute<8*60)return {id:'europe',active:true,ends:end(8*60,ny),rule:'XAU · EMA 8/34 · hồi theo xu hướng'};
  if(london.minute<17*60)return {id:'overlap',active:true,ends:end(17*60,london),rule:'XAU · EMA 8/34 · hồi theo xu hướng'};
  return {id:'us_late',active:true,ends:end(16*60+45,ny),rule:'XAU · quét đỉnh/đáy 20 nến'};
}
const ema=(a,n)=>{let v=a[0];return a.map(x=>(v+=2/(n+1)*(x-v)))};
function atr(b,n=14) {
  let a=0;return b.map((x,i)=>{
    if(!i)return NaN;
    const tr=Math.max(x.h-x.l,Math.abs(x.h-b[i-1].c),Math.abs(x.l-b[i-1].c));
    a=i<=n?a+tr/n:(a*(n-1)+tr)/n;
    return i>=n?a:NaN;
  });
}
function bands(c,i) {
  if(i<19)return {low:NaN,high:NaN,mean:NaN};
  const a=c.slice(i-19,i+1),mean=a.reduce((s,x)=>s+x,0)/20;
  const sd=Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/20);
  return {mean,low:mean-2*sd,high:mean+2*sd};
}
export function goldHistory(bars) {
  const c=bars.map(b=>b.c),fast=ema(c,8),slow=ema(c,34),a1=atr(bars),five=aggregate5(bars),a5=atr(five),out=[];
  let k=-1;
  for(let i=0;i<bars.length;i++) {
    const b=bars[i],p=bars[i-1],available=b.t+62,session=goldSession(available);
    while(k+1<five.length&&five[k+1].t+302<=available)k++;
    const known=i>=219&&b.t-bars[i-219].t===219*60&&a5[k]>0&&a1[i]>0;
    let buy=false,sell=false;
    if(known&&session.active) {
      const move=c.slice(i-19,i+1).reduce((sum,x,j)=>sum+Math.abs(x-c[i-20+j]),0);
      const er=move>0?Math.abs(c[i]-c[i-20])/move:0;
      if(session.id==='asia') {
        const old=bands(c,i-1),cur=bands(c,i);
        buy=p.c<old.low&&b.c>=cur.low&&b.c<cur.mean&&er<.4;
        sell=p.c>old.high&&b.c<=cur.high&&b.c>cur.mean&&er<.4;
      } else if(['europe','overlap'].includes(session.id)) {
        buy=fast[i]>slow[i]&&slow[i]>slow[i-3]&&p.c<=fast[i-1]&&b.c>fast[i]&&b.c-b.o>.1*a1[i];
        sell=fast[i]<slow[i]&&slow[i]<slow[i-3]&&p.c>=fast[i-1]&&b.c<fast[i]&&b.c-b.o<-.1*a1[i];
      } else {
        const prior=bars.slice(i-20,i),lo=Math.min(...prior.map(x=>x.l)),hi=Math.max(...prior.map(x=>x.h)),body=b.c-b.o;
        buy=b.l<lo-.05*a1[i]&&b.c>lo&&body>0&&Math.min(b.o,b.c)-b.l>1.5*Math.max(Math.abs(body),.1*a1[i])&&b.h-b.l<3*a1[i];
        sell=b.h>hi+.05*a1[i]&&b.c<hi&&body<0&&b.h-Math.max(b.o,b.c)>1.5*Math.max(Math.abs(body),.1*a1[i])&&b.h-b.l<3*a1[i];
      }
    }
    const room=session.active&&goldSession(b.t).id===session.id&&available+GOLD_SCALP.pendingSeconds+GOLD_SCALP.holdSeconds<session.ends;
    // Fresh reference candles alone do not prove that the broker is open.
    const warmed=known&&bars.slice(i-14,i+1).every(x=>goldSession(x.t).active);
    out.push({t:b.t,available,known,side:warmed&&room?(buy?1:sell?-1:0):0,atr:a5[k],
      session:session.id,rule:session.rule||'XAU · nghỉ phiên',sessionInfo:session,
      checks:[['Lịch sử','M1 liên tục và ATR M5',known?'Đủ':'Chờ',known],
        ['Phiên vàng','Lịch DST London/New York',session.active?'Trong khung':'Nghỉ',session.active],
        ['Tín hiệu','Điều kiện riêng XAU',buy?'BUY':sell?'SELL':'Chờ',known?buy||sell:null],
        ['Cửa sổ đặt lệnh','Đủ thời gian chờ và giữ lệnh',room&&warmed?'Đủ':'Chờ',Boolean(room&&warmed)]]});
  }
  return out;
}
const rounded=x=>Math.round(x*100)/100;
const fresh=(q,now)=>q&&[q.bid,q.ask,q.t].every(Number.isFinite)&&q.bid>0&&q.ask>=q.bid&&now-q.t<=5&&q.t<=now+3;
export function goldLimitSetup({bars,event,quote,anchor,now,saved}) {
  const base={asset:'XAUUSD',frame:'SCALP',candle:event?.t,rule:event?.rule,session:event?.session,
    checks:event?.checks,signal_time:event?.side?event.available:undefined,signal_side:event?.side,
    candle_source:'Bitget XAUUSDT perpetual'};
  const wait=reason=>({...base,status:'waiting',reason});
  const stale=reason=>({...base,status:'stale',reason});
  const current=goldSession(now);
  if(!current.active)return wait(current.reason);
  if(!Array.isArray(bars)||bars.length<220||bars.some((b,i)=>![b.t,b.o,b.h,b.l,b.c,b.v].every(Number.isFinite)||b.t%60||b.l<=0||b.v<0||b.h<Math.max(b.o,b.c)||b.l>Math.min(b.o,b.c)||b.t+62>now||i&&b.t-bars[i-1].t!==60))return stale('Nến vàng M1 thiếu, chưa đóng hoặc không liên tục.');
  if(bars.at(-1).t+60<Math.floor((now-2)/60)*60)return stale('Đang chờ nến vàng M1 mới.');
  if(!event?.known||event.t!==bars.at(-1).t)return stale('Chưa đủ lịch sử tính scalp vàng.');
  if(!event.side)return wait('Đang chờ tín hiệu scalp vàng M1 mới.');
  // A zone may be announced only on its signal candle; never turn an old touch into a new order.
  if(now<event.available||now>=event.available+45||current.id!==event.session)return wait('Tín hiệu vàng đã cũ hoặc đổi phiên; chờ setup mới.');
  if(!fresh(quote,now)||quote.source!=='Exness công khai'||quote.instrument!=='XAUUSD'||!fresh(anchor,now)||anchor.source!=='Bitget'||Math.abs(quote.t-anchor.t)>5)return stale('Chưa có Bid/Ask XAUUSD Exness và giá vàng tham chiếu mới cùng thời điểm.');
  const ratio=(quote.bid+quote.ask)/(anchor.bid+anchor.ask);
  if(ratio<.98||ratio>1.02)return stale('Chênh lệch vàng tham chiếu và Exness quá 2%; tạm dừng setup.');
  const side=event.side,spread=quote.ask-quote.bid,vol=event.atr*ratio;
  if(!(vol>0))return stale('ATR M5 vàng không hợp lệ.');
  let plan=saved;
  if(!plan) {
    const recent=bars.slice(-5),ref=bars.at(-1).c*ratio;
    const entry=rounded(ref-side*GOLD_SCALP.depthATR5*vol);
    const swing=(side===1?Math.min(...recent.map(b=>b.l)):Math.max(...recent.map(b=>b.h)))*ratio;
    const risk=Math.max(GOLD_SCALP.minRiskATR5*vol,(entry-swing)*side+.15*vol);
    if(risk>GOLD_SCALP.maxRiskATR5*vol)return wait('Swing quá xa cho scalp vàng; bỏ setup này.');
    const sl=rounded(entry-side*risk),actualRisk=(entry-sl)*side;
    let reward=GOLD_SCALP.targetR*actualRisk;
    const rows=bars.slice(-60),pivots=[];
    for(let i=2;i<rows.length-2;i++) {
      const level=side===1?rows[i].h:rows[i].l,window=rows.slice(i-2,i+3);
      if(window.every((b,j)=>j===2||(side===1?b.h<level:b.l>level))&&rows.slice(i+1).every(b=>side===1?b.h<level:b.l>level)) {
        const distance=(level*ratio-entry)*side;
        if(distance>0)pivots.push(distance);
      }
    }
    if(pivots.length)reward=Math.min(reward,Math.min(...pivots)-.1*vol);
    const tp=rounded(entry+side*reward),rr=(tp-entry)*side/actualRisk;
    if(!(actualRisk>0)||rr<GOLD_SCALP.minimumR||Math.min(entry,sl,tp)<=0)return wait('TP gần cản hoặc SL không hợp lệ; bỏ setup vàng.');
    plan={entry,sl,tp,rr,risk:actualRisk,low:entry-.03*actualRisk,high:entry+.03*actualRisk,
      expires:Math.floor((event.available+GOLD_SCALP.pendingSeconds)/60)*60};
  }
  if(now>=plan.expires)return wait('Vùng limit vàng đã hết hạn.');
  if(spread>plan.risk*GOLD_SCALP.maxSpreadRisk)return stale('Spread Exness quá lớn so với SL scalp vàng.');
  if((side===1?quote.ask-plan.entry:plan.entry-quote.bid)<Math.max(.01,spread))return wait('Giá đã tới/quá vùng limit vàng; không đuổi giá.');
  if((plan.tp-(side===1?quote.bid:quote.ask))*side<=0)return wait('Giá đã qua TP dự kiến; bỏ vùng limit vàng.');
  return {...base,...plan,status:'setup',id:'XAUUSD:scalp:'+event.t,side,hold:GOLD_SCALP.holdSeconds,
    created:now,quote_time:quote.t,quote_bid:quote.bid,quote_ask:quote.ask,quote_transport:quote.transport,
    instrument:'XAUUSD',order_type:side===1?'BUY LIMIT':'SELL LIMIT',source:quote.source,currency:'USD',
    reference:true,accepted:false,experimental:true,demo:true};
}
export function createGoldScalpClient({market,referenceQuote}) {
  let saved,plan,lastSignal;
  return {async snapshot() {
    const at=market.clock(),session=goldSession(at);
    if(!session.active)return {status:'waiting',asset:'XAUUSD',frame:'SCALP',reason:session.reason};
    const bars=await market.candles('XAUUSD','SCALP');
    if(saved?.bars!==bars) {
      const history=goldHistory(bars);saved={bars,event:history.at(-1)};plan=undefined;
      lastSignal=history.findLast(e=>e.side)?.available||lastSignal;
    }
    const initial=goldLimitSetup({bars,event:saved.event,now:market.clock()});
    const result=s=>({...s,last_signal:lastSignal});
    if(!saved.event?.side||initial.status==='waiting'||initial.reason?.startsWith('Nến')||initial.reason?.startsWith('Đang chờ nến'))return result(initial);
    let failure;const [firstAnchor,quote]=await Promise.all([market.quote('XAUUSD'),referenceQuote('XAUUSD').catch(e=>{failure=quoteProblem(e);return null})]);
    const anchor=quote&&market.clock()-firstAnchor.t>4?await market.quote('XAUUSD'):firstAnchor;
    const s=goldLimitSetup({bars,event:saved.event,quote,anchor,now:market.clock(),saved:plan});
    if(s.status==='setup')plan=s;
    return result(failure?{...s,status:'stale',reason:'Chưa có giá vàng Exness mới. '+failure}:s);
  }};
}
