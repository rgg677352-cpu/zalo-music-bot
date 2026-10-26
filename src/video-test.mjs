// Opt-in forward experiment, not a qualified strategy or a clone of private video code.
// Bitget gold perpetual candles are references; order levels use a fresh Exness public quote.
import {goldSession} from './gold-scalp.mjs';
import {quoteProblem} from './exness-quotes.mjs';

export const VIDEO_TEST = Object.freeze({
  version:'gold-pivot-confluence-reference-v1', family:'pivot_confluence',
  frames:{TEST_M1:60,TEST_M5:300,TEST_M15:900}, defaultFrame:'TEST_M5',
  accepted:false, announcementSeconds:45, minPlacementSeconds:60,
});
const sum=a=>a.reduce((s,x)=>s+x,0);
const round=x=>Math.round(x*100)/100;
const finite=a=>a.every(Number.isFinite);
const extreme=(a,start,end,op)=>Math[op](...a.slice(Math.max(0,start),end+1).filter(Number.isFinite));

function sma(a,n) {
  return a.map((_,i)=>i>=n-1&&finite(a.slice(i-n+1,i+1))?sum(a.slice(i-n+1,i+1))/n:NaN);
}
function ema(a,n) {
  let last=NaN;
  return a.map((x,i)=>{
    if(!Number.isFinite(x))return NaN;
    if(!Number.isFinite(last)) {
      const seed=a.slice(Math.max(0,i-n+1),i+1);
      if(seed.length!==n||!finite(seed))return NaN;
      return last=sum(seed)/n;
    }
    return last+=2/(n+1)*(x-last);
  });
}
function atr(b,n=14) {
  let value=0;
  return b.map((x,i)=>{
    if(!i)return NaN;
    const tr=Math.max(x.h-x.l,Math.abs(x.h-b[i-1].c),Math.abs(x.l-b[i-1].c));
    value=i<=n?value+tr/n:(value*(n-1)+tr)/n;
    return i>=n?value:NaN;
  });
}
function rsi(c,n=14) {
  let up=0,down=0;
  return c.map((x,i)=>{
    if(!i)return NaN;
    const d=x-c[i-1];
    up=i<=n?up+Math.max(d,0)/n:(up*(n-1)+Math.max(d,0))/n;
    down=i<=n?down+Math.max(-d,0)/n:(down*(n-1)+Math.max(-d,0))/n;
    return i<n?NaN:up+down===0?0:100*up/(up+down);
  });
}
function cci(b,n) {
  const tp=b.map(x=>(x.h+x.l+x.c)/3),mean=sma(tp,n);
  return tp.map((v,i)=>{
    if(!Number.isFinite(mean[i]))return NaN;
    const dev=sum(tp.slice(i-n+1,i+1).map(x=>Math.abs(x-mean[i])))/n;
    return dev>0?(v-mean[i])/(.015*dev):0;
  });
}
export function videoIndicators(bars) {
  const c=bars.map(b=>b.c),rs=rsi(c),cc=cci(bars,21),cf=cci(bars,14);
  const rawK=bars.map((b,i)=>{
    if(i<7)return NaN;
    const low=Math.min(...bars.slice(i-7,i+1).map(x=>x.l)),high=Math.max(...bars.slice(i-7,i+1).map(x=>x.h));
    return high>low?100*(b.c-low)/(high-low):0;
  });
  const k=sma(rawK,3),d=sma(k,3),e=ema(c.map(x=>x*1000),3),s=ema(e,3);
  const raw=c.map((_,i)=>Math.abs(e[i]-s[i])*(((e[i]-e[i-1])+(s[i]-s[i-1]))/2)**3);
  const tdf=raw.map((v,i)=>{
    const a=raw.slice(Math.max(0,i-8),i+1),den=finite(a)&&a.length===9?Math.max(...a.map(Math.abs)):NaN;
    return den>0?v/den:NaN;
  });
  const regular=Array(c.length).fill(0),hidden=regular.slice(),confirmed=Array(c.length).fill(-1);
  let low=-1,high=-1;
  for(let i=4;i<bars.length;i++) {
    const p=i-2;
    if(!Number.isFinite(k[p]))continue;
    const isLow=bars.slice(p-2,p+3).every((b,j)=>j===2||bars[p].l<b.l);
    const isHigh=bars.slice(p-2,p+3).every((b,j)=>j===2||bars[p].h>b.h);
    if(isLow) {
      if(low>=0&&p-low>=3&&p-low<=60) {
        if(bars[p].l<bars[low].l&&k[p]>k[low])regular[i]=1;
        if(bars[p].l>bars[low].l&&k[p]<k[low])hidden[i]=1;
        if(regular[i]||hidden[i])confirmed[i]=p;
      }
      low=p;
    }
    if(isHigh) {
      if(high>=0&&p-high>=3&&p-high<=60) {
        if(bars[p].h>bars[high].h&&k[p]<k[high])regular[i]=-1;
        if(bars[p].h<bars[high].h&&k[p]>k[high])hidden[i]=-1;
        if(regular[i]||hidden[i])confirmed[i]=p;
      }
      high=p;
    }
  }
  return {rsi:rs,cci:cc,ccif:cf,k,d,tdf,regular,hidden,confirmed,atr:atr(bars)};
}
// Reference UTC daily bars, last completed weekday only. Never uses today's range.
export function videoPivot(days,available) {
  let expected=Math.floor((available-2)/86400)*86400-86400;
  while([0,6].includes(new Date(expected*1000).getUTCDay()))expected-=86400;
  const row=days.findLast(b=>b.t===expected&&b.t+86400+2<=available);
  if(!row)return null;
  const p=(row.h+row.l+row.c)/3;
  return {day:row.t,p,levels:[p,2*p-row.h,p-row.h+row.l,2*p-2*row.h+row.l,
    2*p-row.l,p+row.h-row.l,2*p+row.h-2*row.l]};
}
export function videoHistory({bars,five,days,frame}) {
  const step=VIDEO_TEST.frames[frame];
  if(!step)throw Error('Unsupported video test timeframe');
  const x=videoIndicators(bars),a5=atr(five),out=[];let fi=-1,prior=0;
  for(let i=0;i<bars.length;i++) {
    const b=bars[i],available=b.t+step+2,session=goldSession(available),pivot=videoPivot(days,available);
    while(fi+1<five.length&&five[fi+1].t+302<=available)fi++;
    const vol=step===900?x.atr[i]:a5[fi],known=i>=200&&pivot&&vol>0&&finite([x.rsi[i],x.tdf[i],x.cci[i],x.ccif[i]]);
    let side=0,zone=-1,distance=Infinity;
    if(known&&session.active)for(const [direction,col] of [[1,1],[-1,4]])for(let z=0;z<3;z++) {
      const level=pivot.levels[col+z],rows=bars.slice(Math.max(0,i-2),i+1);
      const touched=Math.min(...rows.map(b=>b.l))<=level+.25*vol&&Math.max(...rows.map(b=>b.h))>=level-.25*vol;
      const offset=(b.c-level)*direction;
      if(touched&&offset>=-.5*vol&&offset<=.75*vol&&Math.abs(b.c-level)<distance) {
        side=direction;zone=z;distance=Math.abs(b.c-level);
      }
    }
    const recent=i-2;
    const extremes=side===1?extreme(x.rsi,recent,i,'min')<=30&&extreme(x.tdf,recent,i,'min')<=-.8:
      side===-1&&extreme(x.rsi,recent,i,'max')>=70&&extreme(x.tdf,recent,i,'max')>=.8;
    const divergence=!!side&&(x.regular.slice(Math.max(0,recent),i+1).includes(side)||x.hidden.slice(Math.max(0,recent),i+1).includes(side));
    const cc=side===1?extreme(x.cci,recent,i,'min')<=-200||extreme(x.ccif,recent,i,'min')<=-200:
      side===-1&&(extreme(x.cci,recent,i,'max')>=200||extreme(x.ccif,recent,i,'max')>=200);
    const checks=[['Vùng Pivot S/R',zone,'chạm vùng',!!side],['RSI 14 + TDF proxy 3',x.rsi[i],'cực trị trong 3 nến',!!extremes],
      ['Stoch 8/3/3 phân kỳ đã xác nhận',null,'pivot trái 2/phải 2',divergence],['CCI 21/14 cực trị',x.cci[i],'vượt ±200 trong 3 nến',!!cc]];
    const value=side&&Number(extremes)+Number(divergence)+Number(cc)>=2?side*(zone+1):0;
    const event={t:b.t,available,known:!!known,side:value&&value!==prior?side:0,zone,pivot,atr:vol,checks,session:session.id};
    out.push(event);prior=value;
  }
  return out;
}
export function videoLimitSetup({bars,event,frame,quote,anchor,now,saved}) {
  const step=VIDEO_TEST.frames[frame],session=goldSession(now);
  const base={asset:'XAUUSD',frame,candle:event?.t,rule:'Pivot + hợp lưu RSI/TDF/Stoch/CCI',session:event?.session,
    checks:event?.checks,source:'Exness công khai',candle_source:'Bitget XAUUSDT perpetual · Pivot UTC tham chiếu'};
  const result=(status,reason)=>({...base,status,reason});
  if(!step)return result('unavailable','Khung TEST chưa hỗ trợ.');
  if(!session.active)return result('waiting',session.reason);
  if(!event?.known||event.t!==bars.at(-1)?.t)return result('stale','Chưa đủ nến/Pivot ngày đã đóng để chạy TEST.');
  if(!event.side)return result('waiting','Chờ Pivot và ít nhất 2/3 nhóm xác nhận; không ép tạo setup.');
  if(now<event.available||now>=event.available+45||session.id!==event.session)return result('waiting','Tín hiệu TEST đã cũ/đổi phiên; không gửi bù.');
  const fresh=q=>q&&finite([q.bid,q.ask,q.t])&&q.bid>0&&q.ask>=q.bid&&now-q.t<=5&&q.t<=now+3;
  if(!fresh(quote)||quote.source!=='Exness công khai'||quote.instrument!=='XAUUSD'||!fresh(anchor)||anchor.source!=='Bitget'||Math.abs(quote.t-anchor.t)>5)
    return result('stale','Chờ Bid/Ask vàng Exness và tham chiếu mới cùng thời điểm.');
  const ratio=(quote.bid+quote.ask)/(anchor.bid+anchor.ask),side=event.side,vol=event.atr*ratio;
  if(ratio<.98||ratio>1.02||!(vol>0))return result('stale','Độ lệch nguồn hoặc ATR vàng không hợp lệ.');
  let plan=saved;
  if(!plan) {
    const entry=round(event.pivot.levels[(side===1?1:4)+event.zone]*ratio),rows=bars.slice(-5);
    const swing=(side===1?Math.min(...rows.map(b=>b.l)):Math.max(...rows.map(b=>b.h)))*ratio;
    const risk=step===900?vol:Math.max(.8*vol,side*(entry-swing)+.15*vol);
    if(!(risk>0)||risk>2.5*vol)return result('waiting','Swing quá xa; bỏ setup TEST này.');
    const sl=round(entry-side*risk),actualRisk=side*(entry-sl);
    const reward=Math.min((step===900?.8:1.2)*actualRisk,side*(event.pivot.p*ratio-entry)-.1*vol);
    const tp=round(entry+side*reward),rr=side*(tp-entry)/actualRisk;
    if(!(actualRisk>0)||rr<.5||Math.min(entry,sl,tp)<=0)return result('waiting','TP quá gần Pivot giữa hoặc SL sai; bỏ setup TEST.');
    const ttl={60:180,300:300,900:900}[step];
    plan={entry,sl,tp,risk:actualRisk,rr,low:entry-.03*actualRisk,high:entry+.03*actualRisk,
      expires:Math.floor((event.available+5+ttl)/60)*60,hold:{60:600,300:1800,900:900}[step],pivot_day:event.pivot.day};
  }
  if(plan.expires-now<VIDEO_TEST.minPlacementSeconds||now+45>=session.ends-60)return result('waiting','Không đủ thời gian nhập LIMIT trước hạn/đổi phiên; bỏ setup.');
  if(quote.ask-quote.bid>.25*plan.risk)return result('stale','Spread Exness quá lớn so với SL TEST.');
  if((side===1?quote.ask-plan.entry:plan.entry-quote.bid)<Math.max(.01,quote.ask-quote.bid))return result('waiting','Giá đã tới/quá Entry TEST; không đổi thành vào ngay.');
  if(side*(plan.tp-(side===1?quote.bid:quote.ask))<=0)return result('waiting','Giá đã qua TP TEST; bỏ setup.');
  return {...base,...plan,status:'setup',id:['XAUUSD',frame,event.t].join(':'),side,
    instrument:'XAUUSD',order_type:side===1?'BUY LIMIT':'SELL LIMIT',created:now,
    quote_time:quote.t,quote_bid:quote.bid,quote_ask:quote.ask,quote_transport:quote.transport,
    signal_time:event.available,signal_side:side,accepted:false,experimental:true,demo:true,reference:true};
}

export function createVideoTestClient({fetcher=fetch,market,referenceQuote,now=()=>Date.now()/1000,monotonic=()=>performance.now()}) {
  const cache=new Map(),inflight=new Map(),histories=new Map(),plans=new Map();let blocked=0;
  async function candles(interval,step,limit) {
    const key=interval,saved=cache.get(key),expected=Math.floor((now()-2)/step)*step;
    if(saved?.at(-1)?.t+step>=expected)return saved;
    if(inflight.has(key))return inflight.get(key);
    const work=(async()=>{
      if(monotonic()<blocked)throw Error('Nguồn TEST đang nghỉ theo giới hạn HTTP');
      const r=await fetcher('https://api.bitget.com/api/v3/market/candles?category=USDT-FUTURES&symbol=XAUUSDT&interval='+interval+'&limit='+limit,
        {signal:AbortSignal.timeout(8000),cache:'no-store'});
      if(!r.ok) {if([429,403,451].includes(r.status))blocked=monotonic()+Math.max(30000,Math.min(300000,Number(r.headers.get('retry-after'))*1000||300000));await r.body?.cancel().catch(()=>{});throw Error('Nguồn TEST HTTP '+r.status)}
      const body=await r.text();if(body.length>250000)throw Error('Nến TEST vượt giới hạn');
      const d=JSON.parse(body),server=Number(d.requestTime)/1000;
      if(d.code!=='00000'||!Number.isFinite(server)||Math.abs(server-now())>15||!Array.isArray(d.data)||d.data.length>limit)throw Error('Nguồn nến TEST sai cấu trúc/giờ');
      const bars=d.data.map(r=>({t:Number(r[0])/1000,o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4])})).filter(b=>b.t+step+2<=now()).sort((a,b)=>a.t-b.t);
      if(bars.length<(step===86400?5:220)||bars.some((b,i)=>!finite([b.t,b.o,b.h,b.l,b.c])||b.t%step||b.l<=0||b.h<Math.max(b.o,b.c)||b.l>Math.min(b.o,b.c)||i&&b.t-bars[i-1].t!==step))throw Error('Nến TEST thiếu, trùng hoặc sai OHLC');
      if(bars.at(-1).t+step<expected)throw Error('Nến TEST đã trễ');
      cache.set(key,bars);return bars;
    })().finally(()=>inflight.delete(key));inflight.set(key,work);return work;
  }
  return {async snapshot(frame='TEST_M5') {
    const step=VIDEO_TEST.frames[frame],at=now(),session=goldSession(at),base={asset:'XAUUSD',frame};
    if(!step)return {...base,status:'unavailable',reason:'TEST hỗ trợ vàng M1/M5/M15.'};
    if(!session.active)return {...base,status:'waiting',reason:session.reason};
    // Bitget 1D is UTC+8; 1Dutc is required for the explicitly UTC-anchored Pivot.
    const [bars,five,days]=await Promise.all([candles(step===60?'1m':step===300?'5m':'15m',step,500),candles('5m',300,500),candles('1Dutc',86400,14)]);
    let history=histories.get(frame);
    if(history?.bars!==bars||history.five!==five||history.days!==days) {
      const events=videoHistory({bars,five,days,frame});
      const event=events.at(-1);
      if(history?.event?.t!==event?.t)plans.delete(frame);
      history={bars,five,days,event,last_signal:events.findLast(e=>e.side)?.available};histories.set(frame,history);
    }
    const out=s=>({...s,last_signal:history.last_signal});
    const initial=videoLimitSetup({bars,event:history.event,frame,now:now()});
    if(initial.status!=='stale'||!history.event?.side||!history.event.known)return out(initial);
    let quoteError;
    const [first,quote]=await Promise.all([market.quote('XAUUSD'),referenceQuote('XAUUSD').catch(e=>{quoteError=quoteProblem(e);return null})]);
    const anchor=quote&&now()-first.t>4?await market.quote('XAUUSD'):first;
    const result=videoLimitSetup({bars,event:history.event,frame,quote,anchor,now:now(),saved:plans.get(frame)});
    if(result.status==='setup')plans.set(frame,result);
    return out(quoteError?{...result,status:'stale',reason:'TEST chưa có giá Exness mới. '+quoteError}:result);
  }};
}
