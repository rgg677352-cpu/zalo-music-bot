import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { ThreadType } from 'zca-js';
import { commandPrefix, createDeduper, deadline } from './runtime.mjs';
import { BOT_VERSION } from './version.mjs';
import { riskCommand } from './risk-tools.mjs';
const ASSETS=['BTC','ETH','XAUUSD'], FRAMES=['M15','M30','H1','H4'], SCALP_ASSETS=['BTC','ETH'];
const alias=x=>({BTC:'BTC',BITCOIN:'BTC',ETH:'ETH',ETHEREUM:'ETH',XAUU:'XAUUSD',XAU:'XAUUSD',XAUUSD:'XAUUSD',GOLD:'XAUUSD'})[String(x).toUpperCase()];
const frame=x=>({M15:'M15','15M':'M15',M30:'M30','30M':'M30',H1:'H1','1H':'H1',H4:'H4','4H':'H4',SCALP:'SCALP'})[String(x).toUpperCase()];
const validKey=k=>ASSETS.some(a=>FRAMES.some(f=>k===a+':'+f))||SCALP_ASSETS.some(a=>k===a+':SCALP');
const vnTime=t=>new Date(t*1000).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const price=x=>Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function formatSetup(s){
 const scalp=s.frame==='SCALP',tf=scalp?'SCALP M1/M5':s.frame,hold=s.hold>=3600?Number((s.hold/3600).toFixed(1))+'h':Math.round(s.hold/60)+' phút';
 const lines=[`${s.instrument||s.asset} · ${s.side===1?'BUY':'SELL'} · ${tf}`,`Entry: ${price(s.entry)}`,`TP: ${price(s.tp)}`,`SL: ${price(s.sl)}`,`R:R 1:${Number(s.rr.toFixed(2))} · giữ ≤${hold}`,`MARKET · hạn ${vnTime(s.expires)} VN`];
 if(Number.isFinite(s.quote_bid)&&Number.isFinite(s.quote_ask))lines.push(`Giá ${vnTime(s.quote_time)}: Bid ${price(s.quote_bid)} / Ask ${price(s.quote_ask)}`);
 if(s.context?.tp_beyond_obstacle)lines.push(`Cản tham chiếu: ${price(s.context.opposing.price)} trước TP · ${s.context.headroom_r.toFixed(2)}R`);
 if(s.context?.sl_inside_structure)lines.push('SL nằm trước swing tham chiếu.');
 const session={asia:'Á 07–14h',europe:'Âu 14–19h',overlap:'Âu–Mỹ 19–23h',us_late:'Mỹ 23–04h',quiet:'Rạng sáng 04–07h'}[s.session];
 lines.push(s.rule+(session?' · '+session+' VN':''),`DEMO${s.accepted?'':' · CHƯA ĐẠT KIỂM CHỨNG'}`,`${s.source}${s.candle_source?' · nến '+s.candle_source+' tham chiếu':''}`);
 return lines.join('\n');
}
export function createTrading(api,{statePath,prefix='!',provider,now=Date.now,pollMs=30000,scalpPollMs=10000,requestTimeout=15000,autoStart=false}){
 if(!provider?.snapshot)throw Error('Trading provider required');
 let state={version:1,groups:{}},persistenceFailed=false;
 if(existsSync(statePath)){
  try{
   const saved=JSON.parse(readFileSync(statePath,'utf8'));
   if(saved?.version!==1||!saved.groups||Array.isArray(saved.groups)||typeof saved.groups!=='object')throw Error();
   for(const[id,g]of Object.entries(saved.groups))if(!/^\d+$/.test(id)||!Array.isArray(g.enabled)||!g.delivered||typeof g.delivered!=='object'||Array.isArray(g.delivered)||g.pausedUntil!==undefined&&(!Number.isSafeInteger(g.pausedUntil)||g.pausedUntil<0)||g.enabled.some(k=>!validKey(k))||Object.entries(g.delivered).some(([k,v])=>!validKey(k)||!Number.isSafeInteger(v)||v<0))throw Error();
   state=saved;
  }catch{throw Object.assign(new Error('Không đọc được trading-subscriptions.json; giữ bản sao để kiểm tra.'),{code:'TRADING_STATE_INVALID'})}
 }
 const save=()=>{try{writeFileSync(statePath+'.new',JSON.stringify(state,null,2),{mode:0o600});renameSync(statePath+'.new',statePath)}catch(error){persistenceFailed=true;throw error}};
 const health=new Map(),deliveries=new Map(),lastIssues=new Map(),observedSignals=new Map(),bootTime=now()/1000;
 const duplicate=createDeduper(),cooldown=new Map(),busy=new Set();let timers=[],generation=0,connected=false;
 const say=(msg,id)=>deadline(()=>api.sendMessage(msg,id,ThreadType.Group),requestTimeout);
 const group=id=>state.groups[id]||=({enabled:[],delivered:{}});
 const paused=g=>Number.isFinite(g?.pausedUntil)&&g.pausedUntil>now()/1000;
 const pauseText=g=>'Đang nghỉ báo trade tới '+vnTime(g.pausedUntil)+' VN. !resume để tiếp tục sớm.';
 function valid(s,a,f){const t=now()/1000;return s?.status==='setup'&&s.asset===a&&s.frame===f&&(s.accepted===true||(s.accepted===false&&s.experimental===true&&s.demo===true))&&[1,-1].includes(s.side)&&typeof s.rule==='string'&&typeof s.source==='string'&&['entry','low','high','sl','tp','risk','rr','hold','candle','expires','created','quote_time'].every(k=>Number.isFinite(s[k]))&&s.candle>0&&s.quote_time<=t+3&&t-s.quote_time<=(f==='SCALP'?5:10)&&s.expires>t&&s.created<=t+3&&t-s.created<=15&&s.entry>0&&s.low<=s.entry&&s.high>=s.entry&&s.risk>0&&s.rr>0&&s.hold>0&&s.sl>0&&s.tp>0&&(s.entry-s.sl)*s.side>0&&(s.tp-s.entry)*s.side>0&&Math.abs(Math.abs(s.entry-s.sl)-s.risk)<s.risk*.00001&&Math.abs(Math.abs(s.tp-s.entry)/s.risk-s.rr)<.00001&&(f!=='SCALP'||s.hold<=180&&s.candle%60===0&&s.candle+62<=t&&s.expires<=s.candle+107)}
 function reasonFor(s,a,f){
  if(s?.status!=='setup')return s?.reason||'Đang chờ tín hiệu mới.';
  const t=now()/1000;if(!Number.isFinite(s.quote_time)||t-s.quote_time>(f==='SCALP'?5:10)||s.quote_time>t+3)return 'Giá báo đã cũ hoặc sai giờ; chưa gửi setup.';
  if(!(s.expires>t)||t-s.created>15)return 'Setup đã hết hạn; không gửi bù.';
  if(valid(s,a,f))return 'Có setup mới, đang kiểm tra gửi.';
  return 'Setup thiếu trường hoặc Entry/TP/SL không hợp lệ; chưa gửi.';
 }
 function record(a,f,s,token){
  if(token!==generation)return;const key=a+':'+f,old=health.get(key),status=valid(s,a,f)?'setup':s?.status==='setup'?'rejected':s?.status||'error',reason=reasonFor(s,a,f);
  const at=now()/1000;
  if(Number.isFinite(s?.signal_time))observedSignals.set(key,{signal_time:s.signal_time,seen_at:at,candle:s.candle,side:s.signal_side??s.side});
  const pendingSignal=!Number.isFinite(s?.signal_time)||Object.values(state.groups).some(g=>g.enabled.includes(key)&&(g.delivered[key]||0)<s.candle);
  if(pendingSignal&&(['error','stale','rejected'].includes(status)||Number.isFinite(s?.signal_time)&&status==='waiting'&&at-s.signal_time>=45))lastIssues.set(key,{at,signal_time:s?.signal_time,candle:s?.candle,reason});
  health.set(key,{checked:now()/1000,status,reason,candle:s?.candle,rule:s?.rule,checks:s?.checks,last_signal:s?.last_signal});
  if(['error','stale','rejected'].includes(status)&&(!old||old.status!==status||old.reason!==reason))console.warn(`[trade] ${key}: ${reason}`);
  else if(old&&['error','stale','rejected'].includes(old.status)&&!['error','stale','rejected'].includes(status))console.log(`[trade] ${key}: nguồn đã hồi phục (${status}).`);
 }
 async function snapshot(a,f,token=generation){
  try{const s=await deadline(()=>provider.snapshot(a,f),requestTimeout);record(a,f,s,token);return s}
  catch(e){const status=String(e.message||'').match(/HTTP (\d{3})/)?.[1],reason=status?'Nguồn nến/giá HTTP '+status+'; chưa gửi setup.':e.code==='ZALO_TIMEOUT'?'Nguồn nến/giá vượt thời gian chờ; chưa gửi setup.':'Không đọc được nguồn nến/giá; kiểm tra mạng host.';record(a,f,{status:'error',reason},token);throw e}
 }
 function statusMessage(id){
  const g=state.groups[id],keys=g?.enabled||[],t=now()/1000;
  const lines=[`Bot ${BOT_VERSION} · BÁO TRADE ${persistenceFailed?'DỪNG DO LỖI LƯU FILE':paused(g)?'ĐANG NGHỈ':connected&&timers.length?'ĐANG CHẠY':'ĐANG DỪNG / MẤT KẾT NỐI'}`,`Bộ báo khởi động ${vnTime(bootTime)} VN.`, `Scalp ${Math.round(scalpPollMs/1000)}s · M15–H4 ${Math.round(pollMs/1000)}s · giá setup Exness công khai.`];
  if(paused(g))lines.push(pauseText(g));
  if(!keys.length)lines.push('Nhóm này chưa bật báo. Dùng !scalp BTC hoặc !on.');
  for(const key of keys){const h=health.get(key),send=deliveries.get(id+':'+key),issue=lastIssues.get(key),seen=observedSignals.get(key),age=h?Math.max(0,Math.floor(t-h.checked)):null,checks=h?.checks?.filter(r=>r[3]===true).length;
   lines.push(`\n${key.replace(':',' ')} · ${h?'quét '+age+'s trước':'chưa quét'}${busy.has(key.endsWith(':SCALP'))?' · vòng quét đang chạy':''}`);
   if(h){lines.push(h.status==='setup'&&(g.delivered[key]||0)>=h.candle?'Tín hiệu nến này đã xử lý; chờ tín hiệu mới.':h.reason);if(h.rule)lines.push(h.rule+(Number.isInteger(checks)?' · '+checks+'/'+h.checks.length+' điều kiện':''));if(h.candle)lines.push('Nến '+vnTime(h.candle)+' VN'+(h.last_signal?' · tín hiệu gần nhất (lịch sử) '+vnTime(h.last_signal)+' VN':''));}
   if(seen)lines.push('Đã thấy trong phiên: '+vnTime(seen.signal_time)+' VN · quét lúc '+vnTime(seen.seen_at)+' VN.');
   if(issue)lines.push('Chặn gần nhất '+vnTime(issue.at)+' VN: '+issue.reason);
   if(send)lines.push(send.status==='sent'?'Zalo xác nhận gửi lúc '+vnTime(send.at)+' VN.':'Lần gửi '+vnTime(send.at)+' VN chưa được Zalo xác nhận; không tự gửi lại để tránh trùng.');
   else if(g.delivered[key])lines.push('Nến đã xử lý: '+vnTime(g.delivered[key])+' VN (lưu qua restart).');
  }
  return lines.join('\n');
 }
 async function parallel(items,limit,run){let next=0;const results=await Promise.allSettled(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const item=items[next++];await run(item)}}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason}
 async function currentReplies(a,frames){
  const snapshots=await Promise.allSettled(frames.map(f=>snapshot(a,f)));
  return snapshots.map((result,i)=>({a,f:frames[i],s:result.status==='fulfilled'?result.value:null}));
 }
 async function sendCurrent(g,id,replies,header=''){
  if(paused(g)){await say(pauseText(g),id);return}
  const texts=[],included=[];
  for(const {a,f,s}of replies){const key=a+':'+f;
   if(!g.enabled.includes(key)){texts.push(`${a} ${f}: đã tắt báo.`);continue}
   if(valid(s,a,f)){texts.push(formatSetup(s));included.push({key,candle:s.candle})}
   else texts.push(`${a} ${f}: ${s?reasonFor(s,a,f):'nguồn dữ liệu chưa sẵn sàng; tạm ngừng báo lệnh.'}${s?.candle?'\nNến '+vnTime(s.candle)+' VN':''}${s?.rule?' · '+s.rule:''}${s?.checks?' · '+s.checks.filter(r=>r[3]===true).length+'/'+s.checks.length+' điều kiện':''}`);
  }
  // Recheck after every requested asset/frame has finished. An early result may have expired while another feed was slow.
  for(const {key,candle}of included){g.delivered[key]=Math.max(g.delivered[key]||0,candle);deliveries.set(id+':'+key,{status:'uncertain',at:now()/1000})}
  if(included.length)save();
  const waiting=replies.filter(r=>!included.some(i=>i.key===r.a+':'+r.f));const label=[...new Set(replies.map(r=>r.a))].join('/')+' · '+[...new Set(replies.map(r=>r.f))].join('/'),issues=[...new Set(replies.filter(r=>r.s&&(['stale','error','unavailable','research'].includes(r.s.status)||r.s.status==='setup'&&!included.some(i=>i.key===r.a+':'+r.f))).map(r=>reasonFor(r.s,r.a,r.f)))];const body=included.length?texts.filter(t=>t.includes('Entry:')).join('\n\n')+(waiting.length?'\n\nChưa có setup: '+waiting.map(r=>r.a+' '+r.f).join(', '):''):replies.length>1?label+'\n'+(issues.length?'Chưa phát setup. '+issues.join('\n'):'Chưa có tín hiệu mới. Bot tiếp tục theo dõi.')+'\n!status xem chi tiết.':texts.join('\n\n');
  await say(header+body,id);
  for(const {key}of included)deliveries.set(id+':'+key,{status:'sent',at:now()/1000});
 }
 function formatCheck(result){
  const lines=[`KIỂM TRA NGUỒN ${result.asset} · Bot ${BOT_VERSION}`];
  for(const row of result.checks||[]){let detail=row.detail||'';
   if(row.candles)detail=row.candles+' nến · nến cuối '+vnTime(row.candle)+' VN';
   if(Number.isFinite(row.bid))detail=`Bid ${price(row.bid)} / Ask ${price(row.ask)} · ${Number(row.age).toFixed(1)}s · ${row.transport||'Bitget HTTP'}`+(detail?' · '+detail:'');
   lines.push(`${row.ok?'OK':'LỖI'} · ${row.name}: ${detail}`);
  }
  if(Number.isFinite(result.clock_delta))lines.push('Lệch giờ host / nguồn: '+result.clock_delta.toFixed(1)+'s.');
  lines.push('Chỉ kiểm tra nguồn; không bật/tắt đăng ký và không tạo lệnh.');return lines.join('\n');
 }
 const usage='Dùng !on, !status, !check BTC, !BTC H1, !scalp, !scalp BTC, !off scalp, !off scalp BTC, !off BTC hoặc !off.';
 async function handle(event){
  if(event.type!==ThreadType.Group||typeof event.data?.content!=='string')return false;
  const text=event.data.content.trim(),p=commandPrefix(text,prefix);if(!p)return false;
  const[raw,...args]=text.slice(p.length).split(/\s+/),name=raw.toUpperCase(),asset=alias(name);
  if(!asset&&!['ON','OFF','SCALP','STATUS','CHECK','INDICATORS','RESEARCH','RISK','RR','PAUSE','RESUME'].includes(name))return false;
  if(duplicate(event))return true;const id=String(event.threadId);if(!/^\d+$/.test(id))return true;
  const key=id+':'+event.data.uidFrom+':'+text.toUpperCase();
  if((asset||name==='SCALP'||name==='CHECK')&&cooldown.has(key)&&now()-cooldown.get(key)<1500)return true;
  cooldown.set(key,now());if(cooldown.size>2000)cooldown.delete(cooldown.keys().next().value);
  try{
   if(name==='RISK'||name==='RR'){await say(riskCommand(name,args),id);return true}
   if(name==='INDICATORS'||name==='RESEARCH'){
    if(!provider.research){await say('Bản này chưa có kết quả nghiên cứu.',id);return true}
    const a=args[0]?alias(args[0]):'BTC',f=args[1]?frame(args[1]):'SCALP';if(!a||!f||args.length>2){await say('Dùng !indicators hoặc !research BTC SCALP / !research ETH H1.',id);return true}
    const d=await deadline(()=>provider.research(a,f,name==='RESEARCH'),requestTimeout);
    if(name==='INDICATORS'){await say(`Danh mục tham khảo: TA-Lib ${d.catalog.talib_installed_functions} hàm; Pandas TA Classic ${d.catalog.pandas_ta_unique} mục. Có phần trùng và hàm toán, không cộng thành chỉ báo độc lập.\nThử mới: ${d.algorithms.length} thuật toán · ${d.candidates.toLocaleString('en-US')} cấu hình theo tài sản/phiên/TP-SL.\n${d.accepted} bộ mới đủ tiêu chuẩn bật. !research BTC hoặc !research ETH H1 xem chi tiết.`,id);return true}
    const p=d.profile,base=p?.tick?.test?.base||p?.test,stress=p?.tick?.test?.stress||p?.stress;
    const lines=[`${a} · ${f} · NGHIÊN CỨU`,d.session,p?'Bộ thử: '+(d.rule||p.algorithm):'Chưa có bộ cho mục này.'];
    if(base)lines.push(`Test: ${base.n} lệnh · ${base.net.toFixed(2)}R · tăng phí ${stress.net.toFixed(2)}R`);
    if(p?.tick)lines.push('Đủ tick: '+(100*p.tick.test.base.coverage).toFixed(0)+'%.');
    if(d.current)lines.push('Điều kiện hiện tại: '+d.current.checks.filter(x=>x[3]===true).length+'/'+d.current.checks.length+'.');
    lines.push('CHƯA ĐẠT · chưa bật gửi setup từ bộ này. Mẫu đã khảo sát nhiều lần; cần forward mới.');await say(lines.join('\n'),id);return true;
   }
   if(name==='CHECK'){const selected=args[0]?alias(args[0]):null;if(args.length>1||selected&&!SCALP_ASSETS.includes(selected)||args[0]&&!selected){await say('Dùng !check BTC hoặc !check ETH.',id);return true}if(!provider.check){await say('Bộ nguồn chưa hỗ trợ kiểm tra trực tiếp.',id);return true}const results=await Promise.allSettled((selected?[selected]:SCALP_ASSETS).map(a=>deadline(()=>provider.check(a),requestTimeout)));await say(results.map(r=>r.status==='fulfilled'?formatCheck(r.value):'Kiểm tra nguồn vượt thời gian chờ; chưa xác nhận được giá.').join('\n\n'),id);return true}
   if(name==='STATUS'){await say(statusMessage(id),id);return true}
   if(persistenceFailed)throw Error('storage');
   if(name==='PAUSE'||name==='RESUME'){
    const m=/^(\d+)(m|h)$/i.exec(args[0]||''),seconds=m?Number(m[1])*(m[2].toLowerCase()==='h'?3600:60):0;
    if(name==='PAUSE'&&(args.length!==1||!Number.isSafeInteger(seconds)||seconds<60||seconds>86400)||name==='RESUME'&&args.length){await say('Dùng !pause 15m (1 phút–24h) hoặc !resume.',id);return true}
    const g=group(id);g.pausedUntil=name==='PAUSE'?Math.ceil(now()/1000+seconds):0;save();
    await say(name==='PAUSE'?pauseText(g)+' Đăng ký được giữ.':'Đã tiếp tục báo trade theo đăng ký cũ; chỉ nhận tín hiệu còn hiệu lực.',id);return true;
   }
   if((asset||name==='ON'||name==='SCALP')&&paused(state.groups[id])){await say(pauseText(state.groups[id]),id);return true}
   if(name==='SCALP'||name==='OFF'&&args[0]?.toUpperCase()==='SCALP'){
    const off=name==='OFF',words=off?args.slice(1):args,a=words[0]?alias(words[0]):null;
    if(words.length>1||words[0]&&!SCALP_ASSETS.includes(a)){await say('Scalp hỗ trợ BTC/ETH. '+usage,id);return true}
    const assets=a?[a]:SCALP_ASSETS,g=group(id),keys=assets.map(a=>a+':SCALP');
    g.enabled=off?g.enabled.filter(k=>!keys.includes(k)):[...new Set([...g.enabled,...keys])];save();
    if(off){await say(`Đã tắt scalp ${assets.join('/')} trong nhóm này. Báo M15–H4 giữ nguyên.`,id);return true}
    const replies=(await Promise.all(assets.map(a=>currentReplies(a,['SCALP'])))).flat();
    await sendCurrent(g,id,replies,`Đã bật SCALP DEMO ${assets.join('/')} · M1/M5 · giữ tối đa 1–3 phút.\nTheo dõi mỗi 10s · !status xem chi tiết · !off scalp để tắt.\n\n`);return true;
   }
   const a=asset||(args[0]?alias(args[0]):null),tf=asset?(args[0]?frame(args[0]):null):(args[1]?frame(args[1]):null);
   if((!asset&&args[0]&&!a)||(asset&&args[0]&&!tf)||(!asset&&args[1]&&!tf)||args.length>(asset?1:2)||tf==='SCALP'&&a&&!SCALP_ASSETS.includes(a)){await say(usage,id);return true}
   const g=group(id),assets=a?[a]:ASSETS,frames=tf?[tf]:name==='OFF'?[...FRAMES,'SCALP']:FRAMES,keys=assets.flatMap(a=>frames.map(f=>a+':'+f)).filter(validKey);
   if(name==='OFF'){g.enabled=g.enabled.filter(k=>!keys.includes(k));save();await say(`Đã tắt báo ${a||'tất cả tài sản'}${tf?' '+tf:''} trong nhóm này.`,id);return true}
   g.enabled=[...new Set([...g.enabled,...keys])];save();
   if(!asset){await say(`Đã bật báo ${a||'BTC, ETH, XAUUSD'} · ${tf||'M15/M30/H1/H4'} trong nhóm này.\nTự gửi setup DEMO mới · kiểm tra 30s.\n!scalp: thêm scalp · !status: chi tiết · !off: tắt.\nVàng chưa có nguồn live; chưa báo setup vàng.`,id);return true}
   await sendCurrent(g,id,await currentReplies(a,frames));
  }catch{await say('Chưa cập nhật được. Kiểm tra file trading-subscriptions.json, dung lượng và kết nối host; không tự gửi lại lệnh.',id)}
  return true;
 }
 async function sweep(scalp){
  if(busy.has(scalp)||!connected||persistenceFailed)return;busy.add(scalp);const token=generation;
  try{
   const keys=[...new Set(Object.values(state.groups).flatMap(g=>paused(g)?[]:g.enabled))].filter(k=>k.endsWith(':SCALP')===scalp);
   // BTC and ETH progress independently; a slow feed must not consume the other scalp's entry window.
   await parallel(keys,2,async key=>{
    if(token!==generation||persistenceFailed)return;const[a,f]=key.split(':');let s;
    try{s=await snapshot(a,f,token)}catch{return}
    if(token!==generation||persistenceFailed||!valid(s,a,f))return;
    await parallel(Object.entries(state.groups),4,async([id,g])=>{
     if(token!==generation||persistenceFailed||paused(g)||!g.enabled.includes(key)||(g.delivered[key]||0)>=s.candle||!valid(s,a,f))return;
     // Reserve before sending: an ambiguous Zalo timeout must not resend the same candle.
     g.delivered[key]=s.candle;save();deliveries.set(id+':'+key,{status:'uncertain',at:now()/1000});
     try{await say(formatSetup(s),id);deliveries.set(id+':'+key,{status:'sent',at:now()/1000});console.log(`[trade] ${key}: Zalo đã xác nhận thông báo setup.`)}
     catch{console.warn(`[trade] ${key}: chưa được Zalo xác nhận; !status xem chi tiết.`)}
    });
   });
  }finally{busy.delete(scalp)}
 }
 async function tick(){await Promise.all([sweep(true),sweep(false)])}
 const report=()=>console.error('Tạm dừng báo giao dịch: không lưu được trạng thái.');
 function start(){connected=true;if(timers.length)return;timers=[setInterval(()=>sweep(false).catch(report),pollMs),setInterval(()=>sweep(true).catch(report),scalpPollMs)];timers.forEach(t=>t.unref?.());void tick().catch(report)}
 function stop(){connected=false;generation++;timers.forEach(clearInterval);timers=[]}
 if(autoStart)start();return{handle,tick,start,stop,snapshot:()=>structuredClone(state),diagnostics:()=>({connected,running:timers.length>0,persistenceFailed,bootTime,checks:Object.fromEntries(health),lastIssues:Object.fromEntries(lastIssues),observedSignals:Object.fromEntries(observedSignals)})};
}
