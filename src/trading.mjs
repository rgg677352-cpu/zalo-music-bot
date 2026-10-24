import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { ThreadType } from 'zca-js';
import { commandPrefix, createDeduper, deadline } from './runtime.mjs';
const ASSETS=['BTC','ETH','XAUUSD'], FRAMES=['M15','M30','H1','H4'], SCALP_ASSETS=['BTC','ETH'];
const alias=x=>({BTC:'BTC',BITCOIN:'BTC',ETH:'ETH',ETHEREUM:'ETH',XAUU:'XAUUSD',XAU:'XAUUSD',XAUUSD:'XAUUSD',GOLD:'XAUUSD'})[String(x).toUpperCase()];
const frame=x=>({M15:'M15','15M':'M15',M30:'M30','30M':'M30',H1:'H1','1H':'H1',H4:'H4','4H':'H4',SCALP:'SCALP'})[String(x).toUpperCase()];
const validKey=k=>ASSETS.some(a=>FRAMES.some(f=>k===a+':'+f))||SCALP_ASSETS.some(a=>k===a+':SCALP');
const price=x=>Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function formatSetup(s){const scalp=s.frame==='SCALP';return `${s.asset} · ${scalp?'SCALP · M1/M5':s.frame} · ${s.side===1?'BUY':'SELL'} · DEMO${s.accepted?'':' · CHƯA ĐẠT KIỂM CHỨNG'}\nEntry: ${price(s.entry)}\nVùng: ${price(s.low)}–${price(s.high)}\nTP: ${price(s.tp)} · SL: ${price(s.sl)}\nR:R 1:${Number(s.rr.toFixed(2))} · giữ tối đa ${Math.round(s.hold/60)} phút\n${s.rule} · ${s.source}${s.currency?' / '+s.currency:''} tham chiếu\nHiệu lực tới ${new Date(s.expires*1000).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} VN\n${scalp?'Giá có thể lệch tài khoản Exness; đối chiếu trước khi đặt.\n':''}https://pulse-btc-eth-lab.rgg677352.workers.dev/${scalp?'':'htf.html'}`}
export function createTrading(api,{statePath,prefix='!',provider,now=Date.now,pollMs=30000,scalpPollMs=10000,requestTimeout=15000,autoStart=false}){
 if(!provider?.snapshot)throw Error('Trading provider required');
 let state={version:1,groups:{}},persistenceFailed=false;
 if(existsSync(statePath)){
  try{
   const saved=JSON.parse(readFileSync(statePath,'utf8'));
   if(saved?.version!==1||!saved.groups||Array.isArray(saved.groups)||typeof saved.groups!=='object')throw Error();
   for(const[id,g]of Object.entries(saved.groups))if(!/^\d+$/.test(id)||!Array.isArray(g.enabled)||!g.delivered||typeof g.delivered!=='object'||Array.isArray(g.delivered)||g.enabled.some(k=>!validKey(k))||Object.entries(g.delivered).some(([k,v])=>!validKey(k)||!Number.isSafeInteger(v)||v<0))throw Error();
   state=saved;
  }catch{throw Object.assign(new Error('Không đọc được trading-subscriptions.json; giữ bản sao để kiểm tra.'),{code:'TRADING_STATE_INVALID'})}
 }
 const save=()=>{try{writeFileSync(statePath+'.new',JSON.stringify(state,null,2),{mode:0o600});renameSync(statePath+'.new',statePath)}catch(error){persistenceFailed=true;throw error}};
 const duplicate=createDeduper(),cooldown=new Map(),busy=new Set();let timers=[],generation=0,connected=false;
 const say=(msg,id)=>deadline(()=>api.sendMessage(msg,id,ThreadType.Group),requestTimeout);
 const group=id=>state.groups[id]||=({enabled:[],delivered:{}});
 function valid(s,a,f){const t=now()/1000;return s?.status==='setup'&&s.asset===a&&s.frame===f&&(s.accepted===true||(s.accepted===false&&s.experimental===true&&s.demo===true))&&[1,-1].includes(s.side)&&typeof s.rule==='string'&&typeof s.source==='string'&&['entry','low','high','sl','tp','risk','rr','hold','candle','expires','created','quote_time'].every(k=>Number.isFinite(s[k]))&&s.candle>0&&s.quote_time<=t+3&&t-s.quote_time<=(f==='SCALP'?5:10)&&s.expires>t&&s.created<=t+3&&t-s.created<=15&&s.entry>0&&s.low<=s.entry&&s.high>=s.entry&&s.risk>0&&s.rr>0&&s.hold>0&&s.sl>0&&s.tp>0&&(s.entry-s.sl)*s.side>0&&(s.tp-s.entry)*s.side>0&&Math.abs(Math.abs(s.entry-s.sl)-s.risk)<s.risk*.00001&&Math.abs(Math.abs(s.tp-s.entry)/s.risk-s.rr)<.00001&&(f!=='SCALP'||s.hold<=180&&s.candle%60===0&&s.candle+62<=t&&s.expires<=s.candle+107)}
 async function currentReplies(g,a,frames){
  const snapshots=await Promise.allSettled(frames.map(f=>deadline(()=>provider.snapshot(a,f),requestTimeout))),replies=[];
  for(let i=0;i<frames.length;i++){
   const f=frames[i];
   try{
    if(snapshots[i].status!=='fulfilled')throw Error('feed');const s=snapshots[i].value;
    if(valid(s,a,f)){replies.push(formatSetup(s));if((g.delivered[a+':'+f]||0)<s.candle){g.delivered[a+':'+f]=s.candle;save()}}
    else replies.push(`${a} ${f}: ${s?.reason||'đang chờ tín hiệu mới.'}`);
   }catch{replies.push(`${a} ${f}: nguồn dữ liệu chưa sẵn sàng; tạm ngừng báo lệnh.`)}
  }return replies;
 }
 const usage='Dùng !on, !BTC H1, !scalp, !scalp BTC, !off scalp, !off scalp BTC, !off BTC hoặc !off.';
 async function handle(event){
  if(event.type!==ThreadType.Group||typeof event.data?.content!=='string')return false;
  const text=event.data.content.trim(),p=commandPrefix(text,prefix);if(!p)return false;
  const[raw,...args]=text.slice(p.length).split(/\s+/),name=raw.toUpperCase(),asset=alias(name);
  if(!asset&&!['ON','OFF','SCALP'].includes(name))return false;
  if(duplicate(event))return true;const id=String(event.threadId);if(!/^\d+$/.test(id))return true;
  const key=id+':'+event.data.uidFrom+':'+text.toUpperCase();
  if((asset||name==='SCALP')&&cooldown.has(key)&&now()-cooldown.get(key)<1500)return true;
  cooldown.set(key,now());if(cooldown.size>2000)cooldown.delete(cooldown.keys().next().value);
  try{
   if(persistenceFailed)throw Error('storage');
   if(name==='SCALP'||name==='OFF'&&args[0]?.toUpperCase()==='SCALP'){
    const off=name==='OFF',words=off?args.slice(1):args,a=words[0]?alias(words[0]):null;
    if(words.length>1||words[0]&&!SCALP_ASSETS.includes(a)){await say('Scalp hỗ trợ BTC/ETH. '+usage,id);return true}
    const assets=a?[a]:SCALP_ASSETS,g=group(id),keys=assets.map(a=>a+':SCALP');
    g.enabled=off?g.enabled.filter(k=>!keys.includes(k)):[...new Set([...g.enabled,...keys])];save();
    if(off){await say(`Đã tắt scalp ${assets.join('/')} trong nhóm này. Báo M15–H4 giữ nguyên.`,id);return true}
    const replies=(await Promise.all(assets.map(a=>currentReplies(g,a,['SCALP'])))).flat();
    await say(`Đã bật SCALP DEMO ${assets.join('/')} · M1/M5 · giữ tối đa 1–3 phút.\nTự kiểm tra mỗi 10 giây; !off scalp để tắt riêng scalp.\n\n${replies.join('\n\n')}`,id);return true;
   }
   const a=asset||(args[0]?alias(args[0]):null),tf=asset?(args[0]?frame(args[0]):null):(args[1]?frame(args[1]):null);
   if((!asset&&args[0]&&!a)||(asset&&args[0]&&!tf)||(!asset&&args[1]&&!tf)||args.length>(asset?1:2)||tf==='SCALP'&&a&&!SCALP_ASSETS.includes(a)){await say(usage,id);return true}
   const g=group(id),assets=a?[a]:ASSETS,frames=tf?[tf]:name==='OFF'?[...FRAMES,'SCALP']:FRAMES,keys=assets.flatMap(a=>frames.map(f=>a+':'+f)).filter(validKey);
   if(name==='OFF'){g.enabled=g.enabled.filter(k=>!keys.includes(k));save();await say(`Đã tắt báo ${a||'tất cả tài sản'}${tf?' '+tf:''} trong nhóm này.`,id);return true}
   g.enabled=[...new Set([...g.enabled,...keys])];save();
   if(!asset){await say(`Đã bật báo ${a||'BTC, ETH, XAUUSD'} · ${tf||'M15/M30/H1/H4'} trong nhóm này.\nTự gửi setup DEMO mới kèm Entry/TP/SL, kể cả bộ chưa đạt kiểm chứng; kiểm tra mỗi 30 giây. !off BTC để tắt riêng BTC.\n!scalp bật thêm scalp. Vàng đang chờ nguồn live, chưa báo setup vàng.`,id);return true}
   await say((await currentReplies(g,a,frames)).join('\n\n'),id);
  }catch{await say('Chưa cập nhật được. Kiểm tra file trading-subscriptions.json, dung lượng và kết nối host; không tự gửi lại lệnh.',id)}
  return true;
 }
 async function sweep(scalp){
  if(busy.has(scalp)||!connected||persistenceFailed)return;busy.add(scalp);const token=generation;
  try{
   const keys=[...new Set(Object.values(state.groups).flatMap(g=>g.enabled))].filter(k=>k.endsWith(':SCALP')===scalp);
   for(const key of keys){
    if(token!==generation)break;const[a,f]=key.split(':');let s;
    try{s=await deadline(()=>provider.snapshot(a,f),requestTimeout)}catch{continue}
    if(token!==generation||!valid(s,a,f))continue;
    for(const[id,g]of Object.entries(state.groups)){
     if(token!==generation)break;
     if(!g.enabled.includes(key)||(g.delivered[key]||0)>=s.candle||!valid(s,a,f))continue;
     // Reserve before sending: an ambiguous Zalo timeout must not resend the same candle.
     g.delivered[key]=s.candle;save();
     try{await say(formatSetup(s),id)}catch{console.warn('Chưa xác nhận được thông báo giao dịch; không gửi lại để tránh trùng.')}
    }
   }
  }finally{busy.delete(scalp)}
 }
 async function tick(){await Promise.all([sweep(true),sweep(false)])}
 const report=()=>console.error('Tạm dừng báo giao dịch: không lưu được trạng thái.');
 function start(){connected=true;if(timers.length)return;timers=[setInterval(()=>sweep(false).catch(report),pollMs),setInterval(()=>sweep(true).catch(report),scalpPollMs)];timers.forEach(t=>t.unref?.());void tick().catch(report)}
 function stop(){connected=false;generation++;timers.forEach(clearInterval);timers=[]}
 if(autoStart)start();return{handle,tick,start,stop,snapshot:()=>structuredClone(state)};
}
