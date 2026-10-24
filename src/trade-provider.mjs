import{readFileSync}from'node:fs';
import{createHTFClient}from'./trade-data.mjs';
import{createScalpClient}from'./scalp-setup.mjs';
import{createExnessQuotes,quoteProblem}from'./exness-quotes.mjs';
import{FRAMES}from'./trade-engine.mjs';
import{exnessPlan}from'./exness-plan.mjs';
export function createTradeProvider({mode='demo',exnessFetcher,quoteTransport='pulse',...options}={}){
 if(!['demo','qualified'].includes(mode))throw Error('Unknown trade notification mode');
 const study=JSON.parse(readFileSync(new URL('../assets/htf-study.json',import.meta.url),'utf8')),fast=JSON.parse(readFileSync(new URL('../assets/fast-study.json',import.meta.url),'utf8')),market=createHTFClient(options),exness=createExnessQuotes({...options,fetcher:exnessFetcher||options.fetcher||fetch,now:market.clock,transport:quoteTransport}),scalp=createScalpClient({market,study:fast,referenceQuote:a=>exness.quote(a)});
 const pending=new Map();
 async function snapshot(asset,frame){
  if(frame==='SCALP')return mode==='demo'?scalp.snapshot(asset):{status:'research',reason:'Scalp chưa đạt kiểm chứng; chế độ hiện tại chỉ nhận bộ đã đạt.'};
  const plan=await market.snapshot(asset,frame,study.profiles[asset]?.[frame],mode==='demo');
  if(plan.status!=='setup')return plan;
  if(mode!=='demo')return{status:'research',reason:'Bộ này chưa được kiểm chứng với nguồn giá lệnh Exness.'};
  const signal_time=plan.candle+FRAMES[frame]+2;
  let quote;try{quote=await exness.quote(asset)}catch(error){return{status:'stale',asset,frame,candle:plan.candle,signal_time,signal_side:plan.side,reason:'Chưa có giá Exness mới; tạm dừng setup, không dùng giá Bitget làm Entry. '+quoteProblem(error)}}
  let anchor={source:'Bitget',bid:plan.quote_bid,ask:plan.quote_ask,t:plan.quote_time};
  if(market.clock()-anchor.t>4)anchor=await market.quote(asset);
  return{...exnessPlan(plan,quote,anchor,market.clock()),signal_time,signal_side:plan.side,quote_transport:quote.transport};
 }
 async function check(asset){
  if(!['BTC','ETH'].includes(asset))return{asset,checks:[{name:'Tài sản',ok:false,detail:'Kiểm tra nguồn hiện hỗ trợ BTC/ETH.'}]};
  const jobs=[['Nến M1 Bitget',()=>market.candles(asset,'SCALP')],['Giá Bitget để quy đổi',()=>market.quote(asset)],['Giá Exness công khai',()=>exness.quote(asset)]];
  const results=await Promise.allSettled(jobs.map(([,run])=>run())),at=market.clock();
  const checks=results.map((r,i)=>{
   if(r.status==='rejected')return{name:jobs[i][0],ok:false,detail:i===2?quoteProblem(r.reason):'Không đọc được nguồn Bitget'+(String(r.reason?.message||'').match(/HTTP \d{3}/)?.[0]?' · '+String(r.reason.message).match(/HTTP \d{3}/)[0]:'')};
   const value=r.value;if(i===0)return{name:jobs[i][0],ok:at-(value.at(-1)?.t+60)<=90,candles:value.length,candle:value.at(-1)?.t};
   const age=at-value.t;return{name:jobs[i][0],ok:age<=5&&age>=-3,bid:value.bid,ask:value.ask,quote_time:value.t,age,transport:value.transport,detail:age>5?'Giá đã cũ quá 5 giây.':age< -3?'Giờ tick đi trước đồng hồ nguồn.':undefined};
  });
  return{asset,checked:at,clock_delta:(options.now?options.now():Date.now()/1000)-at,transport:quoteTransport,checks};
 }
 return{check,snapshot(asset,frame){const key=asset+':'+frame;if(pending.has(key))return pending.get(key);const request=snapshot(asset,frame).finally(()=>pending.delete(key));pending.set(key,request);return request}};
}
