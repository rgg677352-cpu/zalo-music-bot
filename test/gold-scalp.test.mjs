import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ThreadType} from 'zca-js';
import {goldSession,goldHistory,goldLimitSetup,createGoldScalpClient} from '../src/gold-scalp.mjs';
import {createTradeProvider} from '../src/trade-provider.mjs';
import {createExnessQuotes} from '../src/exness-quotes.mjs';
import {createTrading,formatSetup} from '../src/trading.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./scalp-XAU.json',import.meta.url)));
const bars=d.rows.map(r=>({t:+r[0]/1000,o:+r[1],h:+r[2],l:+r[3],c:+r[4],v:+r[5]})).sort((a,b)=>a.t-b.t);
const e=goldHistory(bars).at(-1);
const args={bars,event:e,quote:d.quote,anchor:d.anchor,now:d.now};
const setup=()=>goldLimitSetup(args);
const stamp=s=>Date.parse(s)/1000;
const message=(content,n=1,id='100')=>({type:ThreadType.Group,threadId:id,data:{content,uidFrom:'test',msgId:String(n)}});
function client({failure=false}={}) {
  const urls=[];
  const p=createTradeProvider({now:()=>d.now,monotonic:()=>0,
    fetcher:async u=>{urls.push(u);return Response.json({code:'00000',requestTime:d.now*1000,
      data:u.includes('/candles?')?d.rows:{b:[[d.anchor.bid,1]],a:[[d.anchor.ask,1]],ts:d.now*1000}})},
    exnessFetcher:async u=>{urls.push(u);return failure?new Response('',{status:503}):Response.json({XAUUSD:{'1d':[
      {instrument:'XAUUSD',bid:d.quote.bid,ask:d.quote.ask,time:new Date(d.now*1000).toISOString()}]}})}
  });
  return {p,urls};
}
function bot(t,provider) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xau-scalp-')),sent=[];
  const opts={statePath:path.join(dir,'s.json'),provider,now:()=>d.now*1000,pollMs:600000,scalpPollMs:600000};
  const api={sendMessage:async(text,id,type)=>sent.push({text,id,type})},c=createTrading(api,opts);
  t.after(()=>{c.stop();fs.rmSync(dir,{recursive:true,force:true})});
  return {c,sent,opts,api};
}
test('gold sessions follow London and New York DST independently, block weekends and rollover',()=>{
  assert.equal(goldSession(stamp('2026-07-06T07:30:00Z')).id,'europe');
  assert.equal(goldSession(stamp('2026-12-07T07:30:00Z')).id,'asia');
  assert.equal(goldSession(stamp('2026-12-07T08:30:00Z')).id,'europe');
  assert.equal(goldSession(stamp('2026-10-26T12:30:00Z')).id,'overlap');
  assert.equal(goldSession(stamp('2026-10-26T01:00:00Z')).id,'asia');
  for(const s of ['2026-10-24T12:00:00Z','2026-10-25T21:00:00Z','2026-10-26T21:00:00Z','2026-12-07T22:00:00Z'])assert.equal(goldSession(stamp(s)).active,false,s);
});
test('gold indicators use only closed history: appending candles cannot change prior events',()=>{
  const full=goldHistory(bars);
  for(const n of [250,400,bars.length-1])assert.deepEqual(goldHistory(bars.slice(0,n)),full.slice(0,n));
  assert.equal(e.known,true);assert.equal(e.side,-1);assert.match(e.rule,/XAU.*Bollinger/);
});
test('gold LIMIT uses XAUUSD USD levels, structural SL, capped TP and enough pending time for a 40s manual delay',()=>{
  const s=setup();assert.equal(s.status,'setup');assert.equal(s.instrument,'XAUUSD');assert.equal(s.currency,'USD');
  assert.equal(s.order_type,'SELL LIMIT');assert.ok(s.entry>d.quote.bid);assert.ok(s.sl>s.entry&&s.tp<s.entry);
  assert.ok(s.rr>=.7&&s.rr<=1.21);assert.ok(s.expires-d.now>40);assert.equal(s.expires%60,0);
  assert.equal(s.accepted,false);assert.equal(s.demo,true);assert.equal(s.experimental,true);assert.equal(s.hold,180);
  const moved={...d.quote,bid:d.quote.bid-.1,ask:d.quote.ask-.1,t:d.now+20};
  const again=goldLimitSetup({...args,saved:s,quote:moved,anchor:{...d.anchor,t:d.now+20},now:d.now+20});
  assert.equal(again.status,'setup');assert.equal(again.entry,s.entry);assert.equal(again.sl,s.sl);assert.equal(again.tp,s.tp);
  const text=formatSetup(s);assert.match(text,/SELL LIMIT/);assert.match(text,/hủy nếu chưa khớp/);assert.match(text,/DEMO.*CHƯA ĐẠT/);assert.doesNotMatch(text,/MARKET/);
});
test('real gold BUY event produces a buy limit below Ask with correctly oriented SL and TP',()=>{
  const history=goldHistory(bars);let s;
  for(let i=219;i<bars.length;i++)if(history[i].side===1){
    const now=history[i].available+2,mid=bars[i].c;
    s=goldLimitSetup({bars:bars.slice(0,i+1),event:history[i],now,anchor:{source:'Bitget',bid:mid-.005,ask:mid+.005,t:now},
      quote:{source:'Exness công khai',instrument:'XAUUSD',bid:mid-6.06,ask:mid-5.94,t:now}});
    if(s.status==='setup')break;
  }
  assert.equal(s?.status,'setup');assert.equal(s.order_type,'BUY LIMIT');assert.ok(s.entry<s.quote_ask);assert.ok(s.sl<s.entry&&s.tp>s.entry);
});
test('stale or wrong-source quotes, broken candles and crossed limits never become a market order',()=>{
  const s=setup();
  for(const changes of [
    {quote:{...d.quote,t:d.now-6}}, {quote:{...d.quote,instrument:'BTCUSD'}},
    {quote:{...d.quote,source:'Bitget'}}, {anchor:{...d.anchor,t:d.now-6}},
    {anchor:{...d.anchor,bid:d.anchor.bid*1.1,ask:d.anchor.ask*1.1}},
    {bars:bars.filter((_,i)=>i!==bars.length-5)},
    {bars:bars.map((b,i)=>i===bars.length-1?{...b,v:-1}:b)},
    {saved:s,quote:{...d.quote,bid:s.entry+.01,ask:s.entry+.13}},
    {saved:s,quote:{...d.quote,bid:d.quote.bid,ask:d.quote.bid+s.risk}},
    {now:e.available+45,quote:{...d.quote,t:e.available+45},anchor:{...d.anchor,t:e.available+45}},
  ])assert.notEqual(goldLimitSetup({...args,...changes}).status,'setup',JSON.stringify(changes).slice(0,100));
});
test('gold provider requests only XAUUSDT futures reference and actual XAUUSD Exness public quote',async()=>{
  const {p,urls}=client(),s=await p.snapshot('XAUUSD','SCALP');
  assert.equal(s.status,'setup');assert.equal(s.source,'Exness công khai');assert.equal(s.candle_source,'Bitget XAUUSDT perpetual');
  assert.ok(urls.some(u=>u.includes('category=USDT-FUTURES&symbol=XAUUSDT')));
  assert.ok(urls.some(u=>u.endsWith('/api/public-history?asset=XAUUSD')));
  assert.ok(urls.every(u=>!u.includes('BTC')&&!u.includes('XAUUSDUSD')));
  const checks=await p.check('XAUUSD');assert.ok(checks.checks.every(c=>c.ok));
});
test('gold cannot fall back to exchange Entry when Exness is unavailable; qualified mode remains blocked',async()=>{
  const {p}=client({failure:true}),s=await p.snapshot('XAUUSD','SCALP');assert.equal(s.status,'stale');assert.equal(s.entry,undefined);assert.match(s.reason,/Exness/);
  const q=createTradeProvider({mode:'qualified',fetcher:()=>assert.fail('no unqualified feed needed')});
  assert.equal((await q.snapshot('XAUUSD','SCALP')).status,'research');
});
test('slow Exness response refreshes the gold reference quote before using the basis',async()=>{
  let now=d.now,calls=0;
  const market={clock:()=>now,candles:async()=>bars,quote:async()=>{calls++;return{...d.anchor,t:now}}};
  const p=createGoldScalpClient({market,referenceQuote:async()=>{now+=6;return{...d.quote,t:now}}});
  const s=await p.snapshot();assert.equal(calls,2);assert.equal(s.status,'setup');assert.equal(s.quote_time,now);
});
test('direct Exness gold transports use XAUUSD once, and reject a mismatched instrument',async()=>{
  const urls=[],raw={instrument:'XAUUSD',bid:d.quote.bid,ask:d.quote.ask,time:new Date(d.now*1000).toISOString()};
  const c=createExnessQuotes({now:()=>d.now,fetcher:async u=>{urls.push(u);return new Response('data: '+JSON.stringify(raw)+'\n\n')}});
  assert.equal((await c.quote('XAUUSD')).instrument,'XAUUSD');assert.match(urls[0],/instruments=XAUUSD$/);
  const bad=createExnessQuotes({now:()=>d.now,fetcher:async()=>new Response('data: '+JSON.stringify({...raw,instrument:'XAUUSDUSD'})+'\n\n')});
  await assert.rejects(bad.quote('XAUUSD'));
});
test('!scalp XAU persists a gold-only subscription, sends automatic LIMIT once, deduplicates after restart and stops per group',async t=>{
  let armed=false;const provider={snapshot:async()=>armed?setup():{status:'waiting',reason:'Chờ'}};
  const f=bot(t,provider);await f.c.handle(message('!scalp XAU'));
  assert.deepEqual(f.c.snapshot().groups['100'].enabled,['XAUUSD:SCALP']);assert.match(f.sent[0].text,/LIMIT/);
  armed=true;f.c.start();await f.c.tick();await new Promise(r=>setImmediate(r));
  assert.equal(f.sent.length,2);assert.equal(f.sent[1].id,'100');assert.equal(f.sent[1].type,ThreadType.Group);
  assert.match(f.sent[1].text,/SELL LIMIT/);assert.equal(typeof f.sent[1].text,'string','scalp has no @All');
  f.c.stop();const restarted=createTrading(f.api,f.opts);t.after(()=>restarted.stop());restarted.start();await restarted.tick();await new Promise(r=>setImmediate(r));assert.equal(f.sent.length,2);
  await restarted.handle(message('!scalp GOLD',2,'200'));await restarted.handle(message('!off scalp XAU',3));
  assert.deepEqual(restarted.snapshot().groups['100'].enabled,[]);assert.deepEqual(restarted.snapshot().groups['200'].enabled,['XAUUSD:SCALP']);
  await restarted.handle(message('!off XAU',4,'200'));assert.deepEqual(restarted.snapshot().groups['200'].enabled,[]);
});
test('gold command returns a live setup, and generic scalp keeps its prior BTC/ETH default',async t=>{
  const {p}=client(),f=bot(t,p);await f.c.handle(message('!scalp XAUUSD'));
  assert.match(f.sent[0].text,/Entry:[\s\S]*TP:[\s\S]*SL:/);assert.match(f.sent[0].text,/SELL LIMIT/);
  const g=bot(t,{snapshot:async()=>({status:'waiting'})});await g.c.handle(message('!scalp'));
  assert.deepEqual(g.c.snapshot().groups['100'].enabled,['BTC:SCALP','ETH:SCALP']);
});
test('delivery rejects a crossed or late gold pending setup even if its broker expiry is still in the future',async t=>{
  const s=setup();let bad={...s,quote_bid:s.entry+.1,quote_ask:s.entry+.22};
  const f=bot(t,{snapshot:async()=>bad});await f.c.handle(message('!scalp XAU'));assert.doesNotMatch(f.sent[0].text,/Entry:/);
  bad={...s,candle:s.candle-60,created:d.now,quote_time:d.now};
  await f.c.handle(message('!XAU SCALP',2));assert.doesNotMatch(f.sent.at(-1).text,/Entry:/);
});
