import{readFileSync}from'node:fs';
import{createHTFClient}from'./trade-data.mjs';
import{createScalpClient}from'./scalp-setup.mjs';
import{createExnessQuotes}from'./exness-quotes.mjs';
import{exnessPlan}from'./exness-plan.mjs';
export function createTradeProvider({mode='demo',exnessFetcher,...options}={}){
 if(!['demo','qualified'].includes(mode))throw Error('Unknown trade notification mode');
 const study=JSON.parse(readFileSync(new URL('../assets/htf-study.json',import.meta.url),'utf8')),fast=JSON.parse(readFileSync(new URL('../assets/fast-study.json',import.meta.url),'utf8')),market=createHTFClient(options),exness=createExnessQuotes({...options,fetcher:exnessFetcher||options.fetcher||fetch,now:market.clock}),scalp=createScalpClient({market,study:fast,referenceQuote:a=>exness.quote(a)});
 return{async snapshot(asset,frame){
  if(frame==='SCALP')return mode==='demo'?scalp.snapshot(asset):{status:'research',reason:'Scalp chưa đạt kiểm chứng; chế độ hiện tại chỉ nhận bộ đã đạt.'};
  const plan=await market.snapshot(asset,frame,study.profiles[asset]?.[frame],mode==='demo');
  if(plan.status!=='setup')return plan;
  if(mode!=='demo')return{status:'research',reason:'Bộ này chưa được kiểm chứng với nguồn giá lệnh Exness.'};
  let quote;try{quote=await exness.quote(asset)}catch{return{status:'stale',asset,frame,reason:'Chưa có giá Exness mới; tạm dừng setup, không dùng giá Bitget làm Entry.'}}
  let anchor={source:'Bitget',bid:plan.quote_bid,ask:plan.quote_ask,t:plan.quote_time};
  if(market.clock()-anchor.t>4)anchor=await market.quote(asset);
  return exnessPlan(plan,quote,anchor,market.clock());
 }};
}
