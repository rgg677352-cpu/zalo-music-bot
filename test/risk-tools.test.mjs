import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadType } from 'zca-js';
import { positionBudget, rewardRisk, priceActionContext, riskCommand } from '../src/risk-tools.mjs';
import { createTrading, formatSetup } from '../src/trading.mjs';

test('position sizing includes extra costs, scales linearly and never guesses broker lots', () => {
  const a = positionBudget(1000,.5,100,2), b = positionBudget(2000,.5,100,2);
  assert.equal(a.budget,5); assert.equal(a.lossPerUnit,102);
  assert.ok(Math.abs(a.units*102-5)<1e-12); assert.equal(b.units,2*a.units);
  const text = riskCommand('RISK',['1000','0,5','100','2']);
  assert.match(text,/≤0.049019 đơn vị cơ sở/); assert.match(text,/chưa đổi sang lot/);
  assert.ok(.049019*102<=5); assert.deepEqual(positionBudget(1000,.5),{budget:5});
  for(const values of [[0,.5,100], [1000,0,100], [1000,101,100], [1000,1,0], [1000,1,100,-1], [NaN,1,100], [1000,1,Infinity]]) assert.throws(()=>positionBudget(...values));
  assert.doesNotMatch(riskCommand('RISK',['1e3','0.5']),/Ngân sách SL:/);
  assert.match(riskCommand('RISK',['1','0.0001','10000000','2']),/không làm tròn tăng/);
});

test('cost-adjusted R:R and break-even threshold are symmetric for BUY and SELL', () => {
  const buy = rewardRisk(100,90,115,2), sell = rewardRisk(100,110,85,2);
  assert.equal(buy.netRR,13/12); assert.ok(Math.abs(buy.breakEvenWinRate-12/25)<1e-12);
  assert.equal(sell.netRR,buy.netRR); assert.equal(sell.breakEvenWinRate,buy.breakEvenWinRate);
  assert.equal(rewardRisk(100,90,115).breakEvenWinRate,.4);
  for(const values of [[100,90,95], [100,110,115], [100,90,115,15], [100,100,115], [100,90,115,NaN]]) assert.throws(()=>rewardRisk(...values));
  assert.match(riskCommand('RR',['100','90','115','2']),/48.0%/);
  assert.match(riskCommand('RR',['100','90','115','2']),/không phải xác suất thắng/);
});

const t=1792848000;
const bars=Array.from({length:14},(_,i)=>({t:t+i*60,o:100,c:100,h:i===2?110:103,l:i===7?90:97}));
const now=bars.at(-1).t+62, anchor={bid:100,ask:100,t:now,source:'Bitget'};
const plan={status:'setup',source:'Exness công khai',asset:'BTC',frame:'SCALP',side:1,entry:100,risk:5,rr:3,tp:115,sl:95,quote_bid:100,quote_ask:100,quote_time:now};
test('confirmed reference structure identifies a target obstacle and a stop inside structure without moving any level',()=>{
  const p=priceActionContext(plan,bars,anchor,now);
  assert.equal(p.context.opposing.price,110); assert.equal(p.context.support.price,90);
  assert.equal(p.context.headroom_r,2); assert.equal(p.context.tp_beyond_obstacle,true); assert.equal(p.context.sl_inside_structure,true);
  for(const key of Object.keys(plan)) assert.deepEqual(p[key],plan[key]);
  const inverse=bars.map(b=>({...b,o:200-b.o,c:200-b.c,h:200-b.l,l:200-b.h}));
  const s=priceActionContext({...plan,side:-1,tp:85,sl:105},inverse,anchor,now);
  assert.equal(s.context.opposing.price,90); assert.equal(s.context.support.price,110);assert.equal(s.context.headroom_r,2);
});

test('unconfirmed/future or broken pivots and stale conversion quotes cannot invent a price-action warning',()=>{
  const broken=bars.map((b,i)=>i===10?{...b,h:112}:b), result=priceActionContext(plan,broken,anchor,now);
  assert.notEqual(result.context.opposing?.price,110,'an already breached high is not resistance');
  const unconfirmed=bars.map((b,i)=>({...b,h:i===12?115:103,l:97}));
  assert.equal(priceActionContext(plan,unconfirmed,anchor,now).context.opposing,null);
  assert.equal(priceActionContext(plan,[...bars,{...bars.at(-1),t:bars.at(-1).t+60}],anchor,now),plan);
  assert.equal(priceActionContext(plan,bars,{...anchor,t:now-6},now),plan);
  assert.equal(priceActionContext({...plan,status:'stale'},bars,anchor,now).context,undefined);
  assert.equal(priceActionContext(plan,bars.filter((_,i)=>i!==5),anchor,now),plan);
});

test('risk and R:R commands work in every group without subscriptions, state writes or market requests',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'risk-commands-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const statePath=join(dir,'state.json'),messages=[],c=createTrading({sendMessage:async m=>messages.push(m)},{statePath,provider:{snapshot:()=>assert.fail('calculator must not fetch prices')}});t.after(()=>c.stop());
  let seq=0;const event=content=>({type:ThreadType.Group,threadId:'100',data:{content,uidFrom:'123',msgId:String(++seq)}});
  assert.equal(await c.handle(event('!risk 1000 0.5 100 2')),true);
  assert.equal(await c.handle(event('!rr 100 90 115 2')),true);
  assert.match(messages[0],/Ngân sách SL: 5/); assert.match(messages[1],/48.0%/);
  assert.deepEqual(c.snapshot().groups,{}); assert.equal(existsSync(statePath),false);
});

test('setup message labels reference obstacles without promising a reversal or replacing TP/SL',()=>{
  const p=priceActionContext({...plan,rule:'RSI2',source:'Exness công khai',candle_source:'Bitget',expires:now+45,hold:180,accepted:false},bars,anchor,now),text=formatSetup(p);
  assert.match(text,/Cản tham chiếu: 110.00 trước TP · 2.00R/);
  assert.match(text,/SL nằm trước swing tham chiếu/);
  assert.match(text,/Entry: 100.00\nTP: 115.00\nSL: 95.00/);
  assert.match(text,/CHƯA ĐẠT KIỂM CHỨNG/);
});

test('timed group pause survives restart, leaves other groups running and resumes after expiry without backfill',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'risk-pause-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  let clock=1792828800,sequence=0,armed=false,scans=0;const messages=[],statePath=join(dir,'state.json');
  const provider={snapshot:async(a,f)=>{scans++;return !armed?{status:'waiting'}:{status:'setup',asset:a,frame:f,accepted:false,experimental:true,demo:true,side:1,entry:100,low:99,high:101,sl:90,tp:115,risk:10,rr:1.5,hold:28800,candle:Math.floor(clock/3600)*3600-3600,created:clock,quote_time:clock,expires:clock+60,rule:'EMA21_55',source:'Exness công khai'}}};
  const api={sendMessage:async(text,id)=>messages.push({text,id})},options={statePath,provider,now:()=>clock*1000,pollMs:600000,scalpPollMs:600000};
  const event=(content,threadId='100')=>({type:ThreadType.Group,threadId,data:{content,uidFrom:'123',msgId:String(++sequence)}});
  const c=createTrading(api,options);t.after(()=>c.stop());
  await c.handle(event('!on BTC H1'));await c.handle(event('!on BTC H1','200'));await c.handle(event('!pause 15m'));
  const original=c.snapshot().groups['100'];assert.deepEqual(original.enabled,['BTC:H1']);assert.equal(original.pausedUntil,clock+900);
  const restored=createTrading(api,options);t.after(()=>restored.stop());c.stop();armed=true;
  const before=messages.length;restored.start();await new Promise(r=>setImmediate(r));await restored.tick();
  const setups=messages.slice(before).filter(m=>m.text.includes('Entry:'));assert.equal(setups.length,1);assert.equal(setups[0].id,'200');
  assert.equal(restored.snapshot().groups['100'].delivered['BTC:H1'],undefined,'pause must not consume signal');
  await restored.handle(event('!BTC H1'));assert.match(messages.at(-1).text,/Đang nghỉ/);
  const scanCount=scans;await restored.handle(event('!pause 15m','200'));await restored.tick();assert.equal(scans,scanCount,'no price calls when every group is paused');
  clock+=901;const n=messages.length;await restored.tick();assert.ok(messages.slice(n).some(m=>m.id==='100'&&m.text.includes('Entry:')));
  await restored.handle(event('!resume'));assert.equal(restored.snapshot().groups['100'].pausedUntil,0);
  const old=restored.snapshot().groups['100'].pausedUntil;await restored.handle(event('!pause 25h'));assert.equal(restored.snapshot().groups['100'].pausedUntil,old);
});

test('pausing while a manual setup fetch is pending prevents late delivery and reservation',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'risk-pending-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const clock=1792828800,messages=[];let release,seq=0;
  const c=createTrading({sendMessage:async m=>messages.push(m)},{statePath:join(dir,'s.json'),now:()=>clock*1000,provider:{snapshot:()=>new Promise(r=>release=r)}});t.after(()=>c.stop());
  const event=content=>({type:ThreadType.Group,threadId:'100',data:{content,uidFrom:'123',msgId:String(++seq)}});
  const pending=c.handle(event('!BTC H1'));await new Promise(r=>setImmediate(r));await c.handle(event('!pause 5m'));
  release({status:'setup',asset:'BTC',frame:'H1',accepted:true,side:1,entry:100,low:99,high:101,sl:90,tp:115,risk:10,rr:1.5,hold:28800,candle:clock-3600,created:clock,quote_time:clock,expires:clock+60,rule:'EMA21_55',source:'Exness công khai'});await pending;
  assert.ok(messages.every(m=>!m.includes('Entry:')));assert.equal(c.snapshot().groups['100'].delivered['BTC:H1'],undefined);
});
