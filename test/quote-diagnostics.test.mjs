import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';
import{ThreadType}from'zca-js';import{createExnessQuotes,quoteProblem}from'../src/exness-quotes.mjs';import{createTradeProvider}from'../src/trade-provider.mjs';import{createTrading}from'../src/trading.mjs';
const now=1792848905,raw=(asset='BTC',t=now)=>({instrument:asset+'USD',bid:80000,ask:80003.2,time:new Date(t*1000).toISOString()}),history=(rows,asset='BTC')=>Response.json({[asset+'USD']:{'1d':rows}}),stream=d=>new Response('event: tick\ndata: '+JSON.stringify(d)+'\n\n');
const event=(text,n=1)=>({type:ThreadType.Group,threadId:'100',data:{content:text,uidFrom:'test',msgId:String(n)}}),turn=()=>new Promise(r=>setImmediate(r));
function make(t,provider){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'quote-diagnostics-')),messages=[],c=createTrading({sendMessage:async text=>messages.push(text)},{statePath:path.join(dir,'s.json'),provider,now:()=>now*1000,pollMs:600000,scalpPollMs:600000});t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});return{c,messages}}
test('hosted transport gets finite same-web HTTP first, without opening SSE or an exchange fallback',async()=>{
 const urls=[],c=createExnessQuotes({transport:'pulse',now:()=>now,fetcher:async u=>{urls.push(u);return history([raw()])}}),q=await c.quote('BTC');assert.deepEqual(urls,['https://pulse-btc-eth-lab.rgg677352.workers.dev/api/public-history?asset=BTC']);assert.equal(q.source,'Exness công khai');assert.equal(q.transport,'Pulse HTTP');assert.equal(q.instrument,'BTCUSD');assert.equal(q.t,now);
});
test('stale HTTP snapshot retries Exness SSE through the same public service and never returns the old tick',async()=>{
 const urls=[],c=createExnessQuotes({transport:'pulse',now:()=>now,fetcher:async u=>{urls.push(u);return u.includes('/api/public-history')?history([raw('BTC',now-8)]):stream(raw())}});assert.equal((await c.quote('BTC')).transport,'Pulse SSE');assert.equal(urls.length,2);assert.ok(urls.every(u=>new URL(u).hostname==='pulse-btc-eth-lab.rgg677352.workers.dev'));
});
test('upstream403/429/451 from relay retain cooldown and are never bypassed by another transport',async()=>{
 for(const status of[403,429,451]){let n=0;const c=createExnessQuotes({transport:'pulse',now:()=>now,monotonic:()=>0,fetcher:async()=>{n++;return Response.json({error:'Exness public feed unavailable',upstreamStatus:status},{status:502})}});await assert.rejects(c.quote('BTC'),e=>e.status===status);await assert.rejects(c.quote('ETH'),e=>e.code==='EXNESS_COOLDOWN');assert.equal(n,1)}
});
test('diagnostic errors retain tick age and distinguish forward-clock errors from generic network failure',async()=>{
 for(const [t,word]of[[now-12,'12.0s'],[now+9,'đi trước']]){const c=createExnessQuotes({transport:'pulse',now:()=>now,fetcher:async u=>u.includes('history')?history([raw('BTC',t)]):stream(raw('BTC',t))});await assert.rejects(c.quote('BTC'),e=>quoteProblem(e).includes(word))}
});
test('direct source check runs without requiring an indicator signal and reports both reference and Exness quotes',async()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./scalp-BTC.json',import.meta.url))),calls=[],mid=Number(d.rows[0][4]),p=createTradeProvider({now:()=>d.now,monotonic:()=>0,fetcher:async u=>{calls.push(u);return Response.json({code:'00000',requestTime:d.now*1000,data:u.includes('/candles?')?d.rows:{b:[[mid,1]],a:[[mid+.1,1]],ts:d.now*1000}})},exnessFetcher:async u=>{calls.push(u);return history([{...raw('BTC',d.now),bid:mid-100,ask:mid-96.8}])}});
 const r=await p.check('BTC');assert.ok(r.checks.every(x=>x.ok));assert.equal(r.checks[2].transport,'Pulse HTTP');assert.ok(calls.some(u=>u.endsWith('/api/public-history?asset=BTC')));assert.equal(r.transport,'pulse');assert.equal(r.clock_delta,0);
});
test('source check reports partial failure instead of hiding it behind a waiting signal',async()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./scalp-ETH.json',import.meta.url))),p=createTradeProvider({now:()=>d.now,monotonic:()=>0,fetcher:async u=>Response.json({code:'00000',requestTime:d.now*1000,data:u.includes('/candles?')?d.rows:{b:[[2400,1]],a:[[2400.1,1]],ts:d.now*1000}}),exnessFetcher:async()=>Response.json({upstreamStatus:403},{status:502})});const r=await p.check('ETH');assert.equal(r.checks[0].ok,true);assert.equal(r.checks[1].ok,true);assert.equal(r.checks[2].ok,false);assert.match(r.checks[2].detail,/HTTP 403/);
});
test('!check is scoped, uses no setup and cannot enable or alter subscriptions',async t=>{
 const requests=[],f=make(t,{snapshot:()=>assert.fail('check does not request a setup'),check:async a=>{requests.push(a);return{asset:a,clock_delta:0,checks:[{name:'Giá Exness công khai',ok:false,detail:'Nguồn Exness HTTP 403.'}]}}});await f.c.handle(event('!check BTC'));assert.deepEqual(requests,['BTC']);assert.deepEqual(f.c.snapshot().groups,{});assert.match(f.messages[0],/LỖI.*HTTP 403/);await f.c.handle(event('!check XAUU',2));assert.deepEqual(requests,['BTC','XAUUSD']);assert.deepEqual(f.c.snapshot().groups,{});assert.match(f.messages.at(-1),/KIỂM TRA NGUỒN XAUUSD/);
});
test('a blocked observed signal remains visible after later waiting scans overwrite current status',async t=>{
 let value={status:'waiting',reason:'Đang chờ',last_signal:now-60};const f=make(t,{snapshot:async()=>value});await f.c.handle(event('!scalp BTC'));f.c.start();await turn();
 value={status:'stale',reason:'Chưa có giá Exness mới · HTTP 503',candle:now-65,signal_time:now-3,signal_side:-1,last_signal:now-3};await f.c.tick();
 value={status:'waiting',reason:'Đang chờ tín hiệu mới',candle:now-5,last_signal:now-3};await f.c.tick();await f.c.handle(event('!status',2));const msg=f.messages.at(-1);assert.match(msg,/Đang chờ tín hiệu mới/);assert.match(msg,/Chặn gần nhất.*HTTP 503/);assert.match(msg,/Đã thấy trong phiên/);assert.match(msg,/Bộ báo khởi động/);assert.equal(f.c.diagnostics().lastIssues['BTC:SCALP'].signal_time,now-3);assert.equal(f.c.diagnostics().observedSignals['BTC:SCALP'].signal_time,now-3);
});
test('retrospective historical signal after startup is not claimed as observed during its entry window',async t=>{
 const f=make(t,{snapshot:async()=>({status:'waiting',reason:'Chờ tín hiệu mới',candle:now-60,last_signal:now-300})});await f.c.handle(event('!scalp BTC'));f.c.start();await turn();await f.c.handle(event('!status',2));const msg=f.messages.at(-1);assert.match(msg,/tín hiệu gần nhất \(lịch sử\)/);assert.doesNotMatch(msg,/Đã thấy trong phiên/);assert.deepEqual(f.c.diagnostics().observedSignals,{});assert.equal(f.c.diagnostics().bootTime,now);
});
test('blocked scalp from real candle fixture identifies the candidate and concrete quote failure',async()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./scalp-BTC.json',import.meta.url))),mid=Number(d.rows[0][4]),p=createTradeProvider({now:()=>d.now,monotonic:()=>0,fetcher:async u=>Response.json({code:'00000',requestTime:d.now*1000,data:u.includes('/candles?')?d.rows:{b:[[mid,1]],a:[[mid+.1,1]],ts:d.now*1000}}),exnessFetcher:async()=>Response.json({upstreamStatus:403},{status:502})});const s=await p.snapshot('BTC','SCALP');assert.equal(s.status,'stale');assert.equal(s.signal_time,s.candle+62);assert.equal(s.signal_side,d.event.side);assert.match(s.reason,/HTTP 403/);assert.equal(s.entry,undefined);
});
