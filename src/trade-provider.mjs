import{readFileSync}from'node:fs';
import{createHTFClient}from'./trade-data.mjs';
export function createTradeProvider(options={}){const study=JSON.parse(readFileSync(new URL('../assets/htf-study.json',import.meta.url),'utf8')),client=createHTFClient(options);return{snapshot:(asset,frame)=>client.snapshot(asset,frame,study.profiles[asset]?.[frame])}}
