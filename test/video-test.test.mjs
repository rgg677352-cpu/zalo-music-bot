import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ThreadType} from 'zca-js';
import {videoIndicators,videoPivot,videoHistory,videoLimitSetup,createVideoTestClient} from '../src/video-test.mjs';
import {createTrading,formatSetup,automaticSetupMessage} from '../src/trading.mjs';
import {createTradeProvider} from '../src/trade-provider.mjs';
import {createHandler} from '../src/handler.mjs';

const data=JSON.parse(fs.readFileSync(new URL('./video-indicators.json',import.meta.url)));
const all=data.bars;
function fixture(side=-1) {
  const index=side===1?475:343,center=side===1?3997:3984,bars=all.slice(0,index+1);
  const start=Math.floor(all[0].t/86400)*86400;
  const days=Array.from({length:18},(_,i)=>({t:start+(i-14)*86400,o:center,h:center+10,l:center-10,c:center}));
  const event=videoHistory({bars,five:bars,days,frame:'TEST_M5'}).at(-1),now=event.available+5,mid=bars.at(-1).c;
  const quote={source:'Exness công khai',instrument:'XAUUSD',bid:mid-.1,ask:mid+.1,t:now};
  const anchor={source:'Bitget',bid:mid-.1,ask:mid+.1,t:now};
  const args={bars,event,frame:'TEST_M5',now,quote,anchor};
  return {...args,days,setup:()=>videoLimitSetup(args)};
}
function bot(t,{provider,send,now}={}) {
  const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'video-test-')),sent=[];
  let at=f.now,seq=0;
  const opts={statePath:path.join(dir,'trading.json'),provider:provider||{snapshot:async()=>({status:'waiting',reason:'Chờ'})},
    now:now||(()=>at*1000),pollMs:600000,scalpPollMs:600000,requestTimeout:50};
  const api={sendMessage:async(content,id,type)=>{sent.push({content,id,type});if(send)await send(content,id,type)}};
  const c=createTrading(api,opts);t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});
  const event=(content,id='100')=>({type:ThreadType.Group,threadId:id,data:{content,uidFrom:'1',msgId:String(++seq)}});
  return {c,opts,api,sent,event,at:v=>at=v};
}
const flush=()=>new Promise(r=>setImmediate(r));

test('video formulas match independent TA-Lib fixture, including the EMA-seeded TDF proxy',()=>{
  const actual=videoIndicators(all);
  for(const name of Object.keys(data.expected))for(let i=30;i<all.length;i++) {
    const expected=data.expected[name][i];
    if(expected!==null)assert.ok(Math.abs(actual[name][i]-expected)<1e-8,`${name} ${i}`);
  }
});
test('video indicators and confirmed divergences are causal under appended future candles',()=>{
  const full=videoIndicators(all);assert.ok(full.regular.some(Boolean));assert.ok(full.hidden.some(Boolean));
  for(const n of [201,275,344,476]) {
    const short=videoIndicators(all.slice(0,n));
    for(const key of Object.keys(full))assert.deepEqual(short[key],full[key].slice(0,n),key);
    for(let i=0;i<n;i++)if(short.confirmed[i]>=0)assert.equal(short.confirmed[i],i-2);
  }
});
test('Pivot requires the last completed weekday, skips weekends and never substitutes missing or current-day ranges',()=>{
  const f=fixture(),monday=Date.parse('2026-10-26T08:00:00Z')/1000;
  const p=videoPivot(f.days,monday);assert.equal(new Date(p.day*1000).toISOString(),'2026-10-23T00:00:00.000Z');
  const day=Date.parse('2026-10-27T00:00:00Z')/1000;
  assert.equal(videoPivot(f.days,day+2).day,day-86400);
  assert.equal(videoPivot(f.days.filter(b=>b.t!==day-86400),day+2),null);
  const changed=f.days.map(b=>b.t>=day?{...b,h:999999,l:1,c:12345}:b);
  assert.deepEqual(videoPivot(changed,day+2),videoPivot(f.days,day+2));
});
test('confluence history is causal and requires a zone plus two independent confirmation groups',()=>{
  const f=fixture(),full=videoHistory({bars:all,five:all,days:f.days,frame:'TEST_M5'});
  for(const n of [201,275,344,476])assert.deepEqual(videoHistory({bars:all.slice(0,n),five:all,days:f.days,frame:'TEST_M5'}),full.slice(0,n));
  assert.ok(full.some(e=>e.side));
  for(const e of full)if(e.side){assert.equal(e.known,true);assert.equal(e.checks[0][3],true);assert.ok(e.checks.slice(1).filter(r=>r[3]).length>=2)}
});
test('both real formula paths on synthetic candles produce correctly oriented LIMIT, structural stop and capped target',()=>{
  for(const side of [1,-1]) {
    const f=fixture(side),s=f.setup();assert.equal(f.event.side,side);assert.equal(s.status,'setup');
    assert.equal(s.order_type,side===1?'BUY LIMIT':'SELL LIMIT');assert.ok(side*(s.entry-s.sl)>0);assert.ok(side*(s.tp-s.entry)>0);
    assert.ok(side*(s.tp-f.event.pivot.p)<0);assert.ok(s.rr>=.5&&s.rr<1.21);assert.ok(s.expires-f.now>40);assert.equal(s.expires%60,0);
    assert.equal(s.hold,1800);assert.equal(s.accepted,false);assert.equal(s.demo,true);
    const text=formatSetup(s);assert.match(text,/TEST M5/);assert.match(text,/Entry:[\s\S]*TP:[\s\S]*SL:/);assert.match(text,/DEMO · CHƯA ĐẠT/);assert.match(text,/Exness.*Bitget/);
  }
});
test('same-candle levels stay fixed as quotes move; crossed, stale, wrong-source and excessively wide quotes are rejected',()=>{
  const f=fixture(),s=f.setup();
  const again=videoLimitSetup({...f,quote:{...f.quote,bid:f.quote.bid-.1,ask:f.quote.ask-.1,t:f.now+10},anchor:{...f.anchor,t:f.now+10},now:f.now+10,saved:s});
  assert.equal(again.status,'setup');for(const k of ['entry','sl','tp','expires'])assert.equal(again[k],s[k]);
  for(const patch of [
    {quote:{...f.quote,t:f.now-6}}, {quote:{...f.quote,source:'Bitget'}}, {quote:{...f.quote,instrument:'BTCUSD'}},
    {anchor:{...f.anchor,bid:f.anchor.bid*1.05,ask:f.anchor.ask*1.05}},
    {quote:{...f.quote,bid:s.entry+.1,ask:s.entry+.3}},
    {quote:{...f.quote,ask:f.quote.bid+s.risk}}, {now:f.event.available+45},
  ])assert.notEqual(videoLimitSetup({...f,...patch,saved:s}).status,'setup');
});

function providerFixture({failExness=false,badBars=false,status=200,slow=false}={}) {
  const f=fixture(),urls=[];let time=f.now,quoteCalls=0;
  const fetcher=async u=>{
    urls.push(u);if(status!==200)return new Response('',{status});
    const daily=u.includes('interval=1D'),step=daily?86400:300;
    let b=(daily?f.days:f.bars).filter(b=>b.t<=Math.floor(time/step)*step);
    if(daily)b=b.slice(-14);
    if(badBars&&!daily)b=[...b,b.at(-1)];
    return Response.json({code:'00000',requestTime:time*1000,data:b.map(b=>[b.t*1000,b.o,b.h,b.l,b.c])});
  };
  const market={quote:async()=>{quoteCalls++;return {...f.anchor,t:time}}};
  const client=createVideoTestClient({fetcher,market,now:()=>time,monotonic:()=>0,referenceQuote:async()=>{
    if(failExness)throw Error('no Exness');if(slow)time+=6;return {...f.quote,t:time};
  }});
  return {client,urls,quoteCalls:()=>quoteCalls,at:v=>time=v,f};
}
test('live TEST client uses actual gold perpetual endpoint, reuses candles and refreshes slow simultaneous quote anchors',async()=>{
  const f=providerFixture({slow:true}),s=await f.client.snapshot();assert.equal(s.status,'setup');assert.equal(f.quoteCalls(),2);
  assert.equal(f.urls.length,2);assert.ok(f.urls.every(u=>u.includes('category=USDT-FUTURES&symbol=XAUUSDT')));
  assert.ok(f.urls.some(u=>u.includes('interval=1Dutc&')),'Bitget 1D is UTC+8, not the required UTC daily anchor');
  const again=await f.client.snapshot();assert.equal(again.status,'setup');assert.equal(again.entry,s.entry);assert.equal(f.urls.length,2);
});
test('TEST cannot use exchange Entry if Exness fails, rejects broken candle streams and honors HTTP cooldown',async()=>{
  const f=providerFixture({failExness:true}),s=await f.client.snapshot();assert.equal(s.status,'stale');assert.equal(s.entry,undefined);
  await assert.rejects(providerFixture({badBars:true}).client.snapshot(),/Nến TEST/);
  const limited=providerFixture({status:429});await assert.rejects(limited.client.snapshot());const count=limited.urls.length;
  await assert.rejects(limited.client.snapshot());assert.equal(limited.urls.length,count);
  const qualified=createTradeProvider({mode:'qualified',fetcher:()=>assert.fail('should not fetch')});
  assert.equal((await qualified.snapshot('XAUUSD','TEST_M5')).status,'research');
  assert.equal((await qualified.snapshot('BTC','TEST_M5')).status,'research');
});
test('provider routes opt-in gold TEST end to end with Exness public levels, and exposes exact data failure reasons',async()=>{
  const f=fixture();let dailyOffset=0;
  const provider=createTradeProvider({now:()=>f.now,monotonic:()=>0,
    fetcher:async u=>{
      if(u.includes('/orderbook?'))return Response.json({code:'00000',requestTime:f.now*1000,data:{b:[[f.anchor.bid,1]],a:[[f.anchor.ask,1]],ts:f.now*1000}});
      const daily=u.includes('interval=1Dutc'),rows=daily?f.days.filter(b=>b.t<=Math.floor(f.now/86400)*86400).slice(-14):f.bars;
      return Response.json({code:'00000',requestTime:f.now*1000,data:rows.map(b=>[(b.t+(daily?dailyOffset:0))*1000,b.o,b.h,b.l,b.c])});
    },exnessFetcher:async()=>Response.json({XAUUSD:{'1d':[{instrument:'XAUUSD',bid:f.quote.bid,ask:f.quote.ask,time:new Date(f.now*1000).toISOString()}]}})});
  const s=await provider.snapshot('XAUUSD','TEST_M5');assert.equal(s.status,'setup');assert.equal(s.quote_bid,f.quote.bid);assert.equal(s.source,'Exness công khai');
  // A separate client returning 16:00 UTC daily timestamps must fail, not silently shift the Pivot.
  dailyOffset=16*3600;
  const wrong=createVideoTestClient({now:()=>f.now,market:{quote:async()=>f.anchor},referenceQuote:async()=>f.quote,
    fetcher:async u=>Response.json({code:'00000',requestTime:f.now*1000,data:(u.includes('interval=1Dutc')?f.days.slice(0,14):f.bars).map(b=>[(b.t+(u.includes('interval=1Dutc')?dailyOffset:0))*1000,b.o,b.h,b.l,b.c])})});
  await assert.rejects(wrong.snapshot(),/Nến TEST/);
  const bad=createTradeProvider({now:()=>f.now,monotonic:()=>0,fetcher:async()=>new Response('',{status:429})});
  const failure=await bad.snapshot('XAUUSD','TEST_M5');assert.equal(failure.status,'stale');assert.match(failure.reason,/HTTP 429/);
});
test('M1 and M15 have their own entry expiry and hold limits rather than inheriting M5 timing',()=>{
  const f=fixture();
  for(const [frame,step,ttl,hold]of [['TEST_M1',60,180,600],['TEST_M15',900,900,900]]) {
    const t=Math.floor(f.event.t/step)*step,event={...f.event,t,available:t+step+2};
    const now=event.available+5,bars=f.bars.map((b,i)=>i===f.bars.length-1?{...b,t}:b);
    const s=videoLimitSetup({...f,bars,event,frame,now,quote:{...f.quote,t:now},anchor:{...f.anchor,t:now}});
    assert.equal(s.status,'setup');assert.equal(s.hold,hold);assert.equal(s.expires,t+step+ttl);assert.ok(s.expires-now>=60);
  }
});
test('!test works through the existing handler, persists one per-group test frame and retains all existing scalp subscriptions',async t=>{
  const b=bot(t),handler=createHandler(b.api,{prefix:'?',maxDuration:600},undefined,{trading:b.c});
  await handler(b.event('!scalp XAU'));await handler(b.event('!test'));await handler(b.event('!test M15'));
  assert.deepEqual(b.c.snapshot().groups['100'].enabled,['XAUUSD:SCALP','XAUUSD:TEST_M15']);
  await handler(b.event('!test M1','200'));assert.deepEqual(b.c.snapshot().groups['200'].enabled,['XAUUSD:TEST_M1']);
  const re=createTrading(b.api,b.opts);t.after(()=>re.stop());assert.deepEqual(re.snapshot(),b.c.snapshot());
  await re.handle(b.event('!off test'));assert.deepEqual(re.snapshot().groups['100'].enabled,['XAUUSD:SCALP']);
  await re.handle(b.event('!off','200'));assert.deepEqual(re.snapshot().groups['200'].enabled,[]);
});
test('!test report is an archived result, does not enable trade and never claims this hybrid has been validated',async t=>{
  const b=bot(t);await b.c.handle(b.event('!test report'));assert.equal(b.c.snapshot().groups['100'],undefined);
  const text=b.sent.at(-1).content;assert.match(text,/120 cấu hình/);assert.match(text,/M5: 17 lệnh.*-1.71R/);assert.match(text,/không phải kết quả chạy live/);
  for(const cmd of ['!test H4','!test BTC','!test off extra','!off test M5'])await b.c.handle(b.event(cmd));
  assert.equal(b.c.snapshot().groups['100'],undefined);
});
test('TEST automatic sends once, records SDK acknowledgement and never repeats on restart or command repetition',async t=>{
  const f=fixture();let armed=false;const b=bot(t,{provider:{snapshot:async()=>armed?f.setup():{status:'waiting',reason:'Chờ'}}});
  await b.c.handle(b.event('!test'));armed=true;b.c.start();await b.c.tick();await flush();
  assert.equal(b.sent.length,2);assert.match(b.sent[1].content,/SELL LIMIT/);assert.equal(b.sent[1].type,ThreadType.Group);
  await b.c.handle(b.event('!test status'));assert.match(b.sent.at(-1).content,/Zalo xác nhận gửi/);
  await b.c.tick();const count=b.sent.length;b.c.stop();const re=createTrading(b.api,b.opts);t.after(()=>re.stop());re.start();await re.tick();await flush();assert.equal(b.sent.length,count);
  b.at(f.now+2);await re.handle(b.event('!test'));assert.doesNotMatch(b.sent.at(-1).content,/Entry:/);
});
test('TEST send timeout reserves the candle; no duplicate delivery or misleading success',async t=>{
  const f=fixture();let armed=false;const b=bot(t,{provider:{snapshot:async()=>armed?f.setup():{status:'waiting'}},send:async text=>{if(typeof text==='string'&&text.includes('Entry:'))throw Error('ambiguous')}});
  await b.c.handle(b.event('!test'));armed=true;b.c.start();await b.c.tick();await flush();const count=b.sent.length;
  await b.c.tick();assert.equal(b.sent.length,count);await b.c.handle(b.event('!status'));assert.match(b.sent.at(-1).content,/chưa được Zalo xác nhận/);
});
test('TEST honors pause, off and disconnect while a quote request is pending',async t=>{
  const f=fixture();let reply=async()=>({status:'waiting'});const b=bot(t,{provider:{snapshot:()=>reply()}});
  await b.c.handle(b.event('!test'));await b.c.handle(b.event('!pause 15m'));reply=async()=>f.setup();b.c.start();await b.c.tick();await flush();assert.equal(b.sent.length,2);
  await b.c.handle(b.event('!resume'));b.c.stop();let release;reply=()=>new Promise(r=>release=r);
  b.c.start();await flush();const count=b.sent.length;b.c.stop();release(f.setup());await flush();assert.equal(b.sent.length,count);
  await b.c.handle(b.event('!test off'));assert.deepEqual(b.c.snapshot().groups['100'].enabled,[]);
});
test('delivery boundary rejects TEST fields that could bypass the fresh gold LIMIT contract',async t=>{
  const f=fixture();let current={status:'waiting'};const b=bot(t,{provider:{snapshot:async()=>current}});
  await b.c.handle(b.event('!test'));b.c.start();await flush();const count=b.sent.length;
  for(const patch of [{order_type:'MARKET'},{source:'Bitget'},{instrument:'BTCUSD'},{quote_time:f.now-6},{candle:f.event.t-300},
    {quote_bid:f.setup().entry+1,quote_ask:f.setup().entry+1.2},{expires:f.now+30},{accepted:true},{rr:.1}]) {
    current={...f.setup(),...patch};await b.c.tick();assert.equal(b.sent.length,count,JSON.stringify(patch));
  }
});
test('only automatic TEST M15 tags @All; TEST M1/M5 remain untagged',()=>{
  const s=fixture().setup(),msg=automaticSetupMessage({...s,frame:'TEST_M15'});
  assert.equal(msg.msg.slice(0,4),'@All');assert.deepEqual(msg.mentions,[{pos:0,len:4,uid:'-1'}]);
  assert.equal(typeof automaticSetupMessage({...s,frame:'TEST_M1'}),'string');assert.equal(typeof automaticSetupMessage(s),'string');
});
