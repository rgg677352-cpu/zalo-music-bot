import { readFileSync } from 'node:fs';
import { createHTFClient } from './trade-data.mjs';
import { createScalpClient } from './scalp-setup.mjs';
import { createExnessQuotes } from './exness-quotes.mjs';
export function createTradeProvider({mode='demo',exnessFetcher,...options}={}) {
  if(!['demo','qualified'].includes(mode))throw new Error('Unknown trade notification mode');
  const study=JSON.parse(readFileSync(new URL('../assets/htf-study.json',import.meta.url),'utf8'));
  const fast=JSON.parse(readFileSync(new URL('../assets/fast-study.json',import.meta.url),'utf8'));
  const market=createHTFClient(options);
  const exness=createExnessQuotes({...options,fetcher:exnessFetcher||options.fetcher||fetch,now:market.clock});
  const scalp=createScalpClient({market,study:fast,referenceQuote:a=>exness.quote(a)});
  return {snapshot(asset,frame){if(frame==='SCALP')return mode==='demo'?scalp.snapshot(asset):Promise.resolve({status:'research',reason:'Scalp chưa đạt kiểm chứng; chế độ hiện tại chỉ nhận bộ đã đạt.'});return market.snapshot(asset,frame,study.profiles[asset]?.[frame],mode==='demo')}};
}
