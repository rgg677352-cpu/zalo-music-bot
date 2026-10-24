// Public Exness prices only. SSE and HTTP are two transports of the same feed.
export function createExnessQuotes({fetcher=fetch,now=()=>Date.now()/1000,monotonic=()=>performance.now()}={}){
 const cache=new Map(),pending=new Map();let blockedUntil=0;
 function parse(d,asset){
  const q={source:'Exness công khai',instrument:asset+'USD',bid:Number(d?.bid),ask:Number(d?.ask),t:Date.parse(d?.time)/1000};
  if(d?.instrument!==q.instrument||![q.bid,q.ask,q.t].every(Number.isFinite)||q.bid<=0||q.ask<q.bid||now()-q.t>5||q.t>now()+3)throw Error('Invalid or stale public quote');
  return q;
 }
 async function response(url,type,timeout){
  const r=await fetcher(url,{headers:{Accept:type},signal:AbortSignal.timeout(timeout),cache:'no-store'});
  if(r.ok)return r;
  if([403,451,429].includes(r.status))blockedUntil=monotonic()+(r.status===429?Math.max(30,Math.min(300,Number(r.headers.get('retry-after'))||30)):300)*1000;
  await r.body?.cancel().catch(()=>{});throw Object.assign(Error('Exness public HTTP '+r.status),{status:r.status});
 }
 async function stream(asset){
  const r=await response('https://www.exness.com/api/quotes/subscribe/?instruments='+asset+'USD','text/event-stream',3500),reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000)throw Error('Oversized public quote');buffer+=decoder.decode(value,{stream:true});let at;
   while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line.startsWith('data:'))continue;try{const q=parse(JSON.parse(line.slice(5)),asset);return{...q,transport:'SSE'}}catch{/* Wait for a fresh, matching tick instead of failing on the initial stale sample. */}}
  }throw Error('Public quote unavailable')}finally{await reader.cancel().catch(()=>{})}
 }
 async function history(asset){
  const r=await response('https://www.exness.com/api/quotes/prev/?instruments='+asset+'USD'+'&intervals=1d','application/json',2500),reader=r.body.getReader(),parts=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>200000)throw Error('Oversized Exness snapshot');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
  const rows=JSON.parse(new TextDecoder().decode(bytes))?.[asset+'USD']?.['1d'];if(!Array.isArray(rows)||rows.length>1000)throw Error('Invalid Exness snapshot');
  const latest=rows.reduce((a,b)=>Date.parse(b?.time)>Date.parse(a?.time||'1970-01-01')?b:a,null);
  return{...parse(latest,asset),transport:'HTTP'};
 }
 async function read(asset){
  if(!['BTC','ETH'].includes(asset))throw Error('Unsupported quote asset');const saved=cache.get(asset);
  if(saved&&now()-saved.t<=3&&saved.t<=now()+3)return saved;
  if(blockedUntil>monotonic())throw Error('Public quote cooldown');
  let q;try{q=await stream(asset)}catch(e){if([403,451,429].includes(e.status)||blockedUntil>monotonic())throw e;q=await history(asset)}
  // The tick can age while a snapshot/body is being downloaded.
  if(now()-q.t>5||q.t>now()+3)throw Error('Stale public quote');cache.set(asset,q);return q;
 }
 return{quote(asset){if(pending.has(asset))return pending.get(asset);const p=read(asset).finally(()=>pending.delete(asset));pending.set(asset,p);return p}};
}
