import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{ALGORITHMS,VOLUME_RULES,algorithmSeries}from'../src/algorithm-lab.mjs';import{fastCandidateHistories,selectedFastHistory}from'../src/fast-engine.mjs';import{createTradeProvider}from'../src/trade-provider.mjs';import{formatSetup}from'../src/trading.mjs';
const bars=JSON.parse(fs.readFileSync(new URL('./trade-bars.json',import.meta.url))),study=JSON.parse(fs.readFileSync(new URL('../assets/fast-study.json',import.meta.url)));
test('16 research algorithms and both variants are causal; gold does not use crypto-volume strategies',()=>{
 assert.equal(Object.keys(ALGORITHMS).length,16);
 for(const asset of['BTC','ETH','XAUUSD'])for(const key of Object.keys(ALGORITHMS))for(const variant of[0,1]){
  if(asset==='XAUUSD'&&VOLUME_RULES.includes(key)){assert.throws(()=>algorithmSeries(bars,asset,key,variant));continue}
  const full=algorithmSeries(bars,asset,key,variant);for(const n of[249,333,501])assert.deepEqual(algorithmSeries(bars.slice(0,n),asset,key,variant),full.slice(0,n),asset+key+variant);
  const flat=bars.map(b=>({...b,o:100,h:100,l:100,c:100,v:0}));assert.ok(algorithmSeries(flat,asset,key,variant).every(e=>e.side===0));
 }
});
test('computing only selected indicator families preserves every selected event and avoids unused work',()=>{
 for(const asset of['BTC','ETH']){const full=fastCandidateHistories(bars,asset),wanted=new Set(Object.values(study.profiles[asset]).map(p=>p.family)),partial=fastCandidateHistories(bars,asset,wanted);assert.deepEqual(Object.keys(partial).sort(),[...wanted].sort());for(const k of wanted)assert.deepEqual(partial[k],full[k]);const selected=selectedFastHistory({provider:'Bitget',[asset.toLowerCase()+'1']:bars},asset,study);assert.ok(selected.length>200);for(const s of selected)assert.equal(s.raw,full[s.family].find(x=>x.t===s.t).raw)}
});
test('5520 frozen experiments and70 finalists remain rejected for auto activation; research selects current session',async()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../assets/optimizer-study.json',import.meta.url)));assert.equal(data.candidates,5520);assert.equal(data.finalists,70);assert.equal(data.accepted,0);assert.equal(data.profiles.length,70);assert.ok(data.profiles.every(p=>p.accepted===false));
 const p=createTradeProvider({now:()=>Date.parse('2026-10-24T13:00Z')/1000,fetcher:()=>assert.fail('catalog query cannot fetch prices')});const d=await p.research('BTC','SCALP',false);assert.equal(d.profile.session,2);assert.equal(d.active_new,false);assert.match(d.session,/19–23h/);
});
test('compact notification keeps execution price, TP, SL, quote timestamp, type and unverified status without a URL dump',()=>{
 const s={asset:'BTC',instrument:'BTCUSD',frame:'SCALP',side:-1,entry:100,tp:85,sl:110,rr:1.5,hold:180,expires:1792849990,rule:'RSI2',source:'Exness công khai',candle_source:'Bitget',quote_bid:100,quote_ask:101,quote_time:1792849960,accepted:false},text=formatSetup(s);assert.match(text,/BTCUSD · SELL · SCALP M1\/M5/);assert.match(text,/Entry: 100.00\nTP: 85.00\nSL: 110.00/);assert.match(text,/MARKET/);assert.match(text,/Bid 100.00 \/ Ask 101.00/);assert.match(text,/CHƯA ĐẠT KIỂM CHỨNG/);assert.match(text,/Exness công khai/);assert.doesNotMatch(text,/https?:|Vùng:|Loại entry:/);assert.ok(text.length<450);
});
import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{ThreadType}from'zca-js';import{createTrading}from'../src/trading.mjs';
test('multi-asset waiting reply stays compact but does not hide a quote failure',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'optimizer-comms-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const replies=[],bot=createTrading({sendMessage:async text=>replies.push(text)},{statePath:join(dir,'s.json'),provider:{snapshot:async()=>({status:'stale',reason:'Giá Exness chưa mới · HTTP 503'})}});t.after(()=>bot.stop());await bot.handle({type:ThreadType.Group,threadId:'100',data:{content:'!scalp',uidFrom:'x',msgId:'1'}});assert.match(replies[0],/BTC\/ETH · SCALP/);assert.match(replies[0],/HTTP 503/);assert.doesNotMatch(replies[0],/SCALP\/SCALP/);
});

test('HTF research reports the profile actually used by notifications, not the separate experiment winner',async()=>{
 const study=JSON.parse(fs.readFileSync(new URL('../assets/htf-study.json',import.meta.url))),provider=createTradeProvider({now:()=>1792846800,fetcher:()=>assert.fail('HTF research reads frozen results, not prices')});
 for(const asset of ['BTC','ETH'])for(const frame of ['M15','M30','H1','H4']){
  const d=await provider.research(asset,frame),p=study.profiles[asset][frame];
  assert.equal(d.active.rule,p.rule);assert.deepEqual(d.active.test,p.test);assert.deepEqual(d.active.stress,p.stress);assert.equal(d.active.session_specific,false);assert.equal(d.active.notifications,true);assert.equal(d.active.accepted,false);assert.deepEqual(d.active.period,study.periods[['H1','H4'].includes(frame)?'H1_H4':'M15_M30']);
 }
 const qualified=createTradeProvider({mode:'qualified',fetcher:()=>assert.fail('no network')});assert.equal((await qualified.research('BTC','M15')).active.notifications,false);
});
test('research command exposes negative results for current demo without claiming that it is an unused strategy',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'active-quality-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const sent=[],provider=createTradeProvider({fetcher:()=>assert.fail('no prices needed')}),bot=createTrading({sendMessage:async text=>sent.push(text)},{statePath:join(dir,'state.json'),provider});t.after(()=>bot.stop());
 await bot.handle({type:ThreadType.Group,threadId:'100',data:{content:'!research BTC M15',uidFrom:'x',msgId:'1'}});
 assert.match(sent[0],/BỘ HIỆN TẠI/);assert.match(sent[0],/Donchian55/);assert.match(sent[0],/27 lệnh · -5.19R/);assert.match(sent[0],/tăng phí -7.36R/);assert.match(sent[0],/Đang dùng để phát DEMO/);assert.match(sent[0],/Chưa kiểm chứng riêng từng phiên/);assert.doesNotMatch(sent[0],/chưa bật gửi setup từ bộ này/);
});
