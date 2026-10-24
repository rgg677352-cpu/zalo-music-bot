const RELAY='https://pulse-btc-eth-lab.rgg677352.workers.dev';
const problem=(code,message,extra={})=>Object.assign(new Error(message),{code,...extra});
export function quoteProblem(error){
 if(error?.code==='EXNESS_ALL_TRANSPORTS')return error.problems.join('; ');
 if(error?.code==='EXNESS_COOLDOWN')return `Nguồn Exness tạm nghỉ còn ${error.seconds}s theo giới hạn HTTP.`;
 if(error?.status)return `Nguồn Exness HTTP ${error.status}.`;
 if(error?.code==='EXNESS_STALE')return `Tick Exness cũ ${Math.max(0,error.age).toFixed(1)}s (giới hạn 5s).`;
 if(error?.code==='EXNESS_CLOCK')return `Giờ tick Exness đi trước đồng hồ nguồn ${(-error.age).toFixed(1)}s.`;
 if(['AbortError','TimeoutError'].includes(error?.name))return 'Nguồn giá Exness quá thời gian chờ.';
 if(['EXNESS_JSON','EXNESS_SHAPE','EXNESS_SYMBOL','EXNESS_VALUES','EXNESS_SIZE','EXNESS_EMPTY'].includes(error?.code))return error.message;
 return 'Không kết nối/đọc được nguồn giá Exness.';
}
// Two transports of the same Exness public feed; never substitutes an exchange price.
export function createExnessQuotes({fetcher=fetch,now=()=>Date.now()/1000,monotonic=()=>performance.now(),transport='direct'}={}){
 if(!['direct','pulse'].includes(transport))throw Error('Unknown Exness quote transport');
 const cache=new Map(),pending=new Map();let blockedUntil=0;
 function parse(d,asset){
  const q={source:'Exness công khai',instrument:asset+'USD',bid:Number(d?.bid),ask:Number(d?.ask),t:Date.parse(d?.time)/1000};
  if(d?.instrument!==q.instrument)throw problem('EXNESS_SYMBOL','Mã tick Exness không khớp tài sản.');
  if(![q.bid,q.ask,q.t].every(Number.isFinite)||q.bid<=0||q.ask<q.bid)throw problem('EXNESS_VALUES','Bid/Ask Exness không hợp lệ.');
  const age=now()-q.t;if(age>5)throw problem('EXNESS_STALE','Giá Exness đã cũ.',{age});if(age< -3)throw problem('EXNESS_CLOCK','Giờ tick Exness không hợp lệ.',{age});return q;
 }
 async function jsonBody(r,limit){
  if(!r.body)throw problem('EXNESS_EMPTY','Nguồn Exness không có nội dung.');
  const reader=r.body.getReader(),parts=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw problem('EXNESS_SIZE','Oversized Exness snapshot');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
  try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw problem('EXNESS_JSON','Nguồn Exness không trả JSON hợp lệ.')}
 }
 async function response(url,type,timeout){
  const r=await fetcher(url,{headers:{Accept:type},signal:AbortSignal.timeout(timeout),cache:'no-store'});if(r.ok)return r;
  let status=r.status;
  if(transport==='pulse'&&r.status===502){try{const d=await jsonBody(r,2048);if([403,429,451].includes(d.upstreamStatus))status=d.upstreamStatus}catch{}}
  else await r.body?.cancel().catch(()=>{});
  if([403,451,429].includes(status))blockedUntil=monotonic()+(status===429?Math.max(30,Math.min(300,Number(r.headers.get('retry-after'))||30)):300)*1000;
  throw problem('EXNESS_HTTP','Exness public HTTP '+status,{status});
 }
 async function stream(asset){
  const url=transport==='pulse'?RELAY+'/api/public-stream?asset='+asset:'https://www.exness.com/api/quotes/subscribe/?instruments='+asset+'USD';
  const r=await response(url,'text/event-stream',3500),reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',size=0,lastProblem;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000)throw problem('EXNESS_SIZE','Oversized public quote');buffer+=decoder.decode(value,{stream:true});let at;
   while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line.startsWith('data:'))continue;try{const q=parse(JSON.parse(line.slice(5)),asset);return{...q,transport:transport==='pulse'?'Pulse SSE':'SSE'}}catch(e){if(e.code)lastProblem=e}}
  }throw lastProblem||problem('EXNESS_EMPTY','Chưa nhận được tick Exness mới.')}finally{await reader.cancel().catch(()=>{})}
 }
 async function history(asset){
  const url=transport==='pulse'?RELAY+'/api/public-history?asset='+asset:'https://www.exness.com/api/quotes/prev/?instruments='+asset+'USD'+'&intervals=1d';
  const r=await response(url,'application/json',transport==='pulse'?5000:2500),data=await jsonBody(r,200000),rows=data?.[asset+'USD']?.['1d'];
  if(!Array.isArray(rows)||rows.length>1000)throw problem('EXNESS_SHAPE','Snapshot Exness sai cấu trúc.');
  const latest=rows.reduce((a,b)=>Date.parse(b?.time)>Date.parse(a?.time||'1970-01-01')?b:a,null);
  return{...parse(latest,asset),transport:transport==='pulse'?'Pulse HTTP':'HTTP'};
 }
 async function read(asset){
  if(!['BTC','ETH'].includes(asset))throw Error('Unsupported quote asset');const saved=cache.get(asset);
  if(saved&&now()-saved.t<=3&&saved.t<=now()+3)return saved;
  if(blockedUntil>monotonic())throw problem('EXNESS_COOLDOWN','Public quote cooldown',{seconds:Math.ceil((blockedUntil-monotonic())/1000)});
  // Finite HTTP first on the hosted bot avoids depending on an egress proxy flushing SSE promptly.
  const first=transport==='pulse'?history:stream,second=transport==='pulse'?stream:history;let q;
  try{q=await first(asset)}catch(e){if([403,451,429].includes(e.status)||blockedUntil>monotonic())throw e;try{q=await second(asset)}catch(other){if([403,451,429].includes(other.status))throw other;throw problem('EXNESS_ALL_TRANSPORTS','Cả hai đường giá Exness chưa sẵn sàng. '+quoteProblem(e)+'; '+quoteProblem(other),{problems:[quoteProblem(e),quoteProblem(other)]})}}
  if(now()-q.t>5||q.t>now()+3)throw problem('EXNESS_STALE','Stale public quote',{age:now()-q.t});cache.set(asset,q);return q;
 }
 return{transport,quote(asset){if(pending.has(asset))return pending.get(asset);const p=read(asset).finally(()=>pending.delete(asset));pending.set(asset,p);return p}};
}
