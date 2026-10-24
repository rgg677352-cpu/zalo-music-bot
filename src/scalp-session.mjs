// Fixed research hypotheses. Session labels are activity buckets in Vietnam time.
export const SESSIONS=[{id:'asia',name:'Á · sáng',start:0,end:7,hours:'07–14h'},{id:'europe',name:'Âu · chiều',start:7,end:12,hours:'14–19h'},{id:'overlap',name:'Âu–Mỹ · tối',start:12,end:16,hours:'19–23h'},{id:'us_late',name:'Mỹ · đêm',start:16,end:21,hours:'23–04h'},{id:'quiet',name:'Rạng sáng',start:21,end:24,hours:'04–07h'}];
export const FAMILIES={ema_pullback:'EMA hồi về xu hướng',donchian:'Donchian phá biên',ehlers:'Ehlers SuperSmoother',bb_reentry:'Bollinger quay vào dải',vwap_band:'VWAP hồi vào vùng',vwap_trend:'VWAP lấy lại xu hướng',opening_range:'Phá vùng đầu phiên',keltner:'Keltner sau co hẹp'};
export const EXITS={fast5:{stop:1,target:1.5,hold:300},scalp10:{stop:1,target:2,hold:600}};
export function sessionAt(t){const day=Math.floor(t/86400)*86400,h=(t-day)/3600,s=SESSIONS.find(s=>h>=s.start&&h<s.end);return{...s,opens:day+s.start*3600,closes:day+s.end*3600}}
export function aggregate5(bars){const groups=new Map();for(const b of bars){const t=Math.floor(b.t/300)*300;if(!groups.has(t))groups.set(t,[]);groups.get(t).push(b)}const out=[];for(const [t,rows]of groups){if(rows.length!==5||rows.some((b,i)=>b.t!==t+i*60))continue;out.push({t,o:rows[0].o,h:Math.max(...rows.map(b=>b.h)),l:Math.min(...rows.map(b=>b.l)),c:rows[4].c,v:rows.reduce((s,b)=>s+b.v,0)})}return out.sort((a,b)=>a.t-b.t)}
function ema(a,n){let last=a[0],k=2/(n+1);return a.map(v=>(last=k*v+(1-k)*last))}
export function superSmoother(a,n){const alpha=Math.exp(-Math.SQRT2*Math.PI/n),b=2*alpha*Math.cos(Math.SQRT2*Math.PI/n),c=-alpha*alpha,k=1-b-c,out=[];for(let i=0;i<a.length;i++)out[i]=i<2?a[i]:k*(a[i]+a[i-1])/2+b*out[i-1]+c*out[i-2];return out}
function atr(b,n=14){const out=Array(b.length).fill(NaN);let value=0;for(let i=1;i<b.length;i++){const tr=Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c));if(i<=n)value+=tr/n;else value=(value*(n-1)+tr)/n;if(i>=n)out[i]=value}return out}
function rolling(a,n){const out=[];let sum=0,sum2=0;for(let i=0;i<a.length;i++){sum+=a[i];sum2+=a[i]*a[i];if(i>=n){sum-=a[i-n];sum2-=a[i-n]*a[i-n]}out[i]=i<n-1?{mean:NaN,sd:NaN}:{mean:sum/n,sd:Math.sqrt(Math.max(0,sum2/n-(sum/n)**2))}}return out}
const median=a=>{const q=a.slice().sort((a,b)=>a-b),n=q.length;return n%2?q[n>>1]:(q[n/2-1]+q[n/2])/2};
export function candidateHistories(btc,eth,asset){
 const btcMap=new Map(btc.map(b=>[b.t,b.c]));const rows=asset==='BTC'?btc:eth.filter(b=>btcMap.has(b.t)),close=rows.map(b=>b.c),volume=rows.map(b=>b.v),cfg=asset==='BTC'?{fast:9,slow:21,dc:20,ssfast:10,ssslow:30,bb:20,sigma:2,or:15}:{fast:8,slow:21,dc:12,ssfast:8,ssslow:21,bb:16,sigma:2.2,or:10},fast=ema(close,cfg.fast),slow=ema(close,cfg.slow),ssfast=superSmoother(close,cfg.ssfast),ssslow=superSmoother(close,cfg.ssslow),bb=rolling(close,cfg.bb),vol=rolling(volume,60),a1=atr(rows),b5=aggregate5(rows),a5=atr(b5),ratio=rows.map(b=>Math.log(b.c/(btcMap.get(b.t)||NaN))),rf=asset==='ETH'?ema(ratio,6):[],rs=asset==='ETH'?ema(ratio,18):[],out=Object.fromEntries(Object.keys(FAMILIES).map(k=>[k,[]])),prior=Object.fromEntries(Object.keys(FAMILIES).map(k=>[k,0]));
 let k=-1,sessionKey='',sumV=0,sumP=0,sumP2=0,lastVWAP=NaN,lastSD=NaN,orHigh=-Infinity,orLow=Infinity,orCount=0,orComplete=false,anchorPresent=false;const widths=[];
 for(let i=0;i<rows.length;i++){
  const b=rows[i],available=b.t+62,s=sessionAt(b.t),key=String(s.opens);if(key!==sessionKey){sessionKey=key;sumV=0;sumP=0;sumP2=0;lastVWAP=NaN;lastSD=NaN;orHigh=-Infinity;orLow=Infinity;orCount=0;orComplete=b.t===s.opens;anchorPresent=orComplete}
  const tp=(b.h+b.l+b.c)/3;sumV+=b.v;sumP+=tp*b.v;sumP2+=tp*tp*b.v;const vwap=sumV>0?sumP/sumV:NaN,vsd=sumV>0?Math.sqrt(Math.max(0,sumP2/sumV-vwap*vwap)):NaN;
  if(b.t<s.opens+cfg.or*60){orHigh=Math.max(orHigh,b.h);orLow=Math.min(orLow,b.l);orCount++}
  while(k+1<b5.length&&b5[k+1].t+302<=available)k++;const riskATR=a5[k],prev=rows[i-1],vr=i>=60&&vol[i-1].mean>0?b.v/vol[i-1].mean:NaN,relativeBuy=asset==='BTC'||Number.isFinite(rf[i])&&rf[i]>rs[i],relativeSell=asset==='BTC'||Number.isFinite(rf[i])&&rf[i]<rs[i],warm=i>=200&&b.t-rows[i-200].t===12000&&riskATR>0&&Number.isFinite(vr);
  const trendBuy=fast[i]>slow[i]&&slow[i]>slow[i-3]&&relativeBuy,trendSell=fast[i]<slow[i]&&slow[i]<slow[i-3]&&relativeSell;
  let dh=-Infinity,dl=Infinity;if(i>=cfg.dc)for(let j=i-cfg.dc;j<i;j++){dh=Math.max(dh,rows[j].h);dl=Math.min(dl,rows[j].l)}
  const lo=bb[i].mean-cfg.sigma*bb[i].sd,hi=bb[i].mean+cfg.sigma*bb[i].sd,prevlo=i?bb[i-1].mean-cfg.sigma*bb[i-1].sd:NaN,prevhi=i?bb[i-1].mean+cfg.sigma*bb[i-1].sd:NaN;const width=bb[i].mean>0?4*bb[i].sd/bb[i].mean:NaN;widths.push(width);
  const squeeze=i>140&&widths[i-1]<.8*median(widths.slice(i-121,i-1)),upper=slow[i]+1.5*a1[i],lower=slow[i]-1.5*a1[i],oldUpper=slow[i-1]+1.5*a1[i-1],oldLower=slow[i-1]-1.5*a1[i-1];
  const rules={
   ema_pullback:[trendBuy&&prev?.c<=fast[i-1]&&b.c>fast[i]&&vr>=.8,trendSell&&prev?.c>=fast[i-1]&&b.c<fast[i]&&vr>=.8],
   donchian:[b.c>dh&&vr>=1.1&&relativeBuy,b.c<dl&&vr>=1.1&&relativeSell],
   ehlers:[ssfast[i]>ssslow[i]&&ssfast[i-1]<=ssslow[i-1]&&relativeBuy,ssfast[i]<ssslow[i]&&ssfast[i-1]>=ssslow[i-1]&&relativeSell],
   bb_reentry:[prev?.c<prevlo&&b.c>=lo&&b.c<bb[i].mean,prev?.c>prevhi&&b.c<=hi&&b.c>bb[i].mean],
   vwap_band:[prev?.c<lastVWAP-1.5*lastSD&&b.c>=vwap-1.5*vsd&&b.c<vwap,prev?.c>lastVWAP+1.5*lastSD&&b.c<=vwap+1.5*vsd&&b.c>vwap],
   vwap_trend:[trendBuy&&prev?.c<=lastVWAP&&b.c>vwap&&vr>=.8,trendSell&&prev?.c>=lastVWAP&&b.c<vwap&&vr>=.8],
   opening_range:[orComplete&&orCount===cfg.or&&b.t>=s.opens+cfg.or*60&&prev?.c<=orHigh&&b.c>orHigh&&vr>=1.2&&relativeBuy,orComplete&&orCount===cfg.or&&b.t>=s.opens+cfg.or*60&&prev?.c>=orLow&&b.c<orLow&&vr>=1.2&&relativeSell],
   keltner:[squeeze&&prev?.c<=oldUpper&&b.c>upper&&vr>=1.2&&relativeBuy,squeeze&&prev?.c>=oldLower&&b.c<lower&&vr>=1.2&&relativeSell]
  };
  for(const [family,[buy,sell]]of Object.entries(rules)){const known=warm&&(!family.startsWith('vwap')||anchorPresent),raw=known?(buy?1:sell?-1:0):0,side=raw!==prior[family]?raw:0;out[family].push({asset,t:b.t,available,side,raw,known,atr:riskATR,close:b.c,session:s.id,sessionEnd:s.closes,metrics:{volume_relative:vr,trend_buy:trendBuy,trend_sell:trendSell,relative_buy:relativeBuy,relative_sell:relativeSell,vwap,band_low:lo,band_high:hi,donchian_high:dh,donchian_low:dl,ss_fast:ssfast[i],ss_slow:ssslow[i]}});prior[family]=raw}
  lastVWAP=vwap;lastSD=vsd;
 }return out;
}
export function selectedSessionHistory(feed,asset,study,{allDay=true}={}){
 const all=candidateHistories(feed.btc1,feed.eth1||[],asset),out=[],base=all.ema_pullback;
 for(let i=0;i<base.length;i++){const raw=base[i],profile=study.profiles?.[asset]?.[raw.session];if(!profile||!all[profile.family]||!EXITS[profile.exit])continue;const e=all[profile.family][i],exit=EXITS[profile.exit],same=sessionAt(e.available).id===e.session,minute=new Date(e.available*1000).getUTCHours()*60+new Date(e.available*1000).getUTCMinutes(),inSession=same&&e.available<e.sessionEnd-exit.hold&&(allDay||minute<225),provider=feed.provider||'OKX';
  out.push({...e,provider,id:asset+'-'+provider.toLowerCase()+'-session-v1-'+e.session+'-'+profile.family+'-'+profile.exit+'-'+e.t,side:inSession?e.side:0,inSession,family:profile.family,familyName:FAMILIES[profile.family],exitProfile:profile.exit,stopMultiplier:exit.stop,targetMultiplier:exit.target,holdSeconds:exit.hold,accepted:profile.accepted,checks:[
   ['Tính được chỉ báo','Có đủ lịch sử M1 và M5',e.known?'Đã tính':'Chờ lịch sử / biến động',e.known],
   ['Thiết lập '+FAMILIES[profile.family],'Điều kiện giá của cấu hình',e.raw===1?'BUY':e.raw===-1?'SELL':'Chưa đạt',e.known?e.raw!==0:null],
   ['Tín hiệu mới','Chỉ nhận chuyển trạng thái',e.side?'Mới':'Đang chờ',e.known?e.side!==0:null],
   ['Còn thời gian scalp','Đủ '+exit.hold/60+' phút trước cuối khung',inSession?'Đang trong khung':'Tạm ngừng mở mới',inSession]
  ]});
 }return out;
}
export function validateSessionFeed(d,now=Date.now()/1000,asset='ETH',decodeCandles){const keys=asset==='BTC'?['btc1']:['btc1','eth1'],feed={provider:d.provider||'OKX'};for(const key of keys){if(d.series&&d.series[key]?.state!=='fresh')throw Error((d.series[key]?.error||'Nến chưa mới')+' · '+key);if(d.provider&&d.series?.[key]?.provider!==d.provider)throw Error('Trộn nguồn nến');const bars=decodeCandles(d[key],60,now);if(bars.length<220||now-bars.at(-1).t-60>90||bars.at(-1).t-bars.at(-200).t!==199*60)throw Error('Thiếu hoặc trễ lịch sử '+key);feed[key]=bars}return feed}
