import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';
import{ThreadType}from'zca-js';import{createTrading}from'../src/trading.mjs';import{createExnessQuotes}from'../src/exness-quotes.mjs';import{createTradeProvider}from'../src/trade-provider.mjs';import{createHTFClient}from'../src/trade-data.mjs';import{BOT_VERSION}from'../src/version.mjs';
const now=1792828805,event=(content,n=1,id='100')=>({type:ThreadType.Group,threadId:id,data:{content,uidFrom:'test',msgId:String(n)}}),turn=()=>new Promise(r=>setImmediate(r));
const tick=(asset='BTC',t=now)=>({instrument:asset+'USD',bid:80000,ask:80003.2,time:new Date(t*1000).toISOString()});
const sse=rows=>new Response(rows.map(d=>'event: tick\ndata: '+JSON.stringify(d)+'\n\n').join(''),{headers:{'content-type':'text/event-stream'}});
function setup(asset='ETH',frame='SCALP'){return{status:'setup',accepted:false,experimental:true,demo:true,asset,frame,rule:'test',source:'Exness công khai',side:1,entry:100,low:99.7,high:100.3,sl:90,tp:115,risk:10,rr:1.5,hold:frame==='SCALP'?180:3600,candle:frame==='SCALP'?1792828740:1792825200,created:now,quote_time:now,expires:now+30}}
function fixture(t,provider,send){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trade-reliable-')),messages=[],c=createTrading({sendMessage:async(text,id)=>{messages.push({text,id});return send?.(text,id)}},{statePath:path.join(dir,'s.json'),provider,now:()=>now*1000,pollMs:600000,scalpPollMs:600000,requestTimeout:1000});t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});return{c,messages}}

test('status shows version and subscription state without enabling groups, fetching prices or requiring setup',async t=>{
 const f=fixture(t,{snapshot:()=>assert.fail('status is read-only')});await f.c.handle(event('!status'));assert.match(f.messages[0].text,new RegExp(BOT_VERSION.replaceAll('.','\\.')));assert.match(f.messages[0].text,/chưa bật báo/);assert.deepEqual(f.c.snapshot().groups,{});
});
test('BTC scalp timeout cannot hold an independent ETH scalp notification',async t=>{
 let armed=false,release;const f=fixture(t,{snapshot:async(a)=>!armed?{status:'waiting'}:a==='BTC'?new Promise(r=>release=r):setup('ETH')});
 await f.c.handle(event('!scalp'));const initial=f.messages.length;armed=true;f.c.start();await turn();assert.equal(typeof release,'function');assert.equal(f.messages.length,initial+1);assert.match(f.messages.at(-1).text,/ETH · SCALP/);release({status:'waiting'});await turn();
});
test('one slow Zalo group does not hold another group and status distinguishes unconfirmed delivery',async t=>{
 let armed=false,release;const f=fixture(t,{snapshot:async()=>setup('BTC','H1')},(text,id)=>armed&&id==='100'&&text.includes('Entry:')?new Promise(r=>release=r):undefined);
 await f.c.handle(event('!on BTC H1',1));await f.c.handle(event('!on BTC H1',2,'200'));armed=true;f.c.start();await turn();assert.equal(typeof release,'function');assert.ok(f.messages.some(m=>m.id==='200'&&m.text.includes('Entry:')));
 await f.c.handle(event('!status',3));assert.match(f.messages.at(-1).text,/chưa được Zalo xác nhận/);release();await turn();await f.c.handle(event('!status',4));assert.match(f.messages.at(-1).text,/Zalo xác nhận gửi/);
});
test('source error and recovery are visible in status, with last candle and checks scoped to enabled asset',async t=>{
 let fail=false;const f=fixture(t,{snapshot:async(a)=>{if(fail)throw Error('Nguồn dữ liệu HTTP 429');return{status:'waiting',reason:'Đang chờ tín hiệu scalp M1 mới.',asset:a,candle:1792828740,rule:'RSI nhanh · 2',checks:[['x','x','x',true],['y','y','y',false]],last_signal:1792828502}}});
 await f.c.handle(event('!scalp BTC',1));f.c.start();await turn();fail=true;await f.c.tick();await f.c.handle(event('!status',2));assert.match(f.messages.at(-1).text,/HTTP 429/);assert.doesNotMatch(f.messages.at(-1).text,/ETH SCALP/);
 fail=false;await f.c.tick();await f.c.handle(event('!status',3));const msg=f.messages.at(-1).text;assert.match(msg,/ĐANG CHẠY/);assert.match(msg,/quét 0s trước/);assert.match(msg,/RSI nhanh/);assert.match(msg,/1\/2 điều kiện/);assert.match(msg,/tín hiệu gần nhất/);assert.doesNotMatch(msg.split('Chặn gần nhất')[0],/HTTP 429/);assert.match(msg,/Chặn gần nhất.*HTTP 429/);assert.ok(!f.messages.some(m=>m.text.includes('Entry:')));
});
test('configured timers keep checking after a waiting command without needing another user message',async t=>{
 let n=0,ready;const checked=new Promise(r=>ready=r),dir=fs.mkdtempSync(path.join(os.tmpdir(),'trade-timer-'));
 const c=createTrading({sendMessage:async()=>{}},{statePath:path.join(dir,'s.json'),provider:{snapshot:async()=>{if(++n>=4)ready();return{status:'waiting',reason:'Chờ nến mới'}}},pollMs:30,scalpPollMs:15,requestTimeout:100});t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});
 await c.handle(event('!scalp BTC'));c.start();await Promise.race([checked,new Promise((_,reject)=>setTimeout(()=>reject(Error('Timer did not continue')),500))]);assert.ok(n>=4);assert.equal(c.diagnostics().running,true);assert.equal(c.diagnostics().checks['BTC:SCALP'].status,'waiting');
});
test('Exness SSE ignores an initial stale/wrong-asset tick and accepts a later fresh one',async()=>{
 let n=0;const c=createExnessQuotes({now:()=>now,fetcher:async url=>{n++;assert.match(url,/\/subscribe\//);return sse([tick('BTC',now-6),tick('ETH'),tick()])}});assert.equal((await c.quote('BTC')).t,now);assert.equal(n,1);
});
test('buffered/empty SSE falls back only to bounded Exness HTTP, picks tick time and deduplicates requests',async()=>{
 const urls=[],c=createExnessQuotes({now:()=>now,fetcher:async url=>{urls.push(url);return url.includes('/subscribe/')?new Response('event: subscribe\ndata: {}\n\n'):Response.json({BTCUSD:{'1d':[{...tick('BTC',now-20),interval_time:new Date((now+300)*1000).toISOString()},tick(),tick('BTC',now-10)]}})}});
 const[a,b]=await Promise.all([c.quote('BTC'),c.quote('BTC')]);assert.equal(a,b);assert.equal(a.t,now);assert.equal(a.transport,'HTTP');assert.equal(urls.length,2);assert.ok(urls.every(u=>new URL(u).hostname==='www.exness.com'));await c.quote('BTC');assert.equal(urls.length,2);
});
test('HTTP fallback with old data exposes no quote and shared429 cooldown prevents polling another asset',async()=>{
 let n=0,mono=0;const c=createExnessQuotes({now:()=>now,monotonic:()=>mono,fetcher:async()=>{n++;return new Response('',{status:429,headers:{'retry-after':'60'}})}});await assert.rejects(c.quote('BTC'));await assert.rejects(c.quote('ETH'));assert.equal(n,1);mono=60001;await assert.rejects(c.quote('ETH'));assert.equal(n,2);
 const stale=createExnessQuotes({now:()=>now,fetcher:async url=>url.includes('/subscribe/')?new Response(''):Response.json({BTCUSD:{'1d':[tick('BTC',now-6)]}})});await assert.rejects(stale.quote('BTC'));await assert.rejects(stale.quote('SOL'));
});
test('overlarge Exness HTTP snapshot is canceled instead of retained',async()=>{
 let canceled=false;const c=createExnessQuotes({now:()=>now,fetcher:async url=>url.includes('/subscribe/')?new Response(''):new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(200001))},cancel(){canceled=true}}))});await assert.rejects(c.quote('BTC'),/Oversized/);assert.equal(canceled,true);
});
test('parallel market quote requests share one HTTP request across frame scans',async()=>{
 let n=0;const c=createHTFClient({now:()=>now,monotonic:()=>0,fetcher:async()=>{n++;await turn();return Response.json({code:'00000',requestTime:now*1000,data:{b:[[80000,1]],a:[[80000.1,1]],ts:now*1000}})}});const q=await Promise.all([c.quote('BTC'),c.quote('BTC'),c.quote('BTC')]);assert.equal(n,1);assert.ok(q.every(x=>x.bid===80000));
});
test('manual and automatic requests for the same setup share a provider computation and retain candle diagnostics',async()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./scalp-ETH.json',import.meta.url))),mid=Number(d.rows.at(-1)[4]);let candles=0;
 const p=createTradeProvider({now:()=>d.now,monotonic:()=>0,fetcher:async url=>{if(url.includes('/candles?'))candles++;await turn();return Response.json({code:'00000',requestTime:d.now*1000,data:url.includes('/candles?')?d.rows:{b:[[mid,1]],a:[[mid+.1,1]],ts:d.now*1000}})},exnessFetcher:async()=>sse([{instrument:'ETHUSD',bid:mid-3,ask:mid-2.8,time:new Date(d.now*1000).toISOString()}])});
 const[a,b]=await Promise.all([p.snapshot('ETH','SCALP'),p.snapshot('ETH','SCALP')]);assert.equal(a,b);assert.equal(candles,1);assert.ok(a.candle>0);assert.ok(a.last_signal<=d.now);assert.equal(a.checks.length,4);
});
test('a slow manual multi-asset query must not consume or display an early setup after its quote expires',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trade-late-'));let time=now,armed=false,release;const messages=[];
 const c=createTrading({sendMessage:async text=>messages.push(text)},{statePath:path.join(dir,'s.json'),now:()=>time*1000,requestTimeout:1000,pollMs:600000,scalpPollMs:600000,provider:{snapshot:async a=>a==='BTC'&&!armed?new Promise(r=>release=r):a==='ETH'?{...setup('ETH'),created:time,quote_time:time}:{status:'waiting'}}});t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const command=c.handle(event('!scalp'));await turn();time+=6;release({status:'waiting'});await command;
 assert.doesNotMatch(messages[0],/Entry:/);assert.match(messages[0],/Giá báo đã cũ/);assert.equal(c.snapshot().groups['100'].delivered['ETH:SCALP'],undefined);
 armed=true;c.start();await turn();assert.ok(messages.some(x=>x.includes('ETH · SCALP')&&x.includes('Entry:')));
});
test('turning an asset off during a pending manual query suppresses its late setup',async t=>{
 let release;const f=fixture(t,{snapshot:()=>new Promise(r=>release=r)});const query=f.c.handle(event('!BTC H1'));await turn();await f.c.handle(event('!off BTC',2));release(setup('BTC','H1'));await query;assert.ok(!f.messages.some(x=>x.text.includes('Entry:')));assert.deepEqual(f.c.snapshot().groups['100'].enabled,[]);
});
