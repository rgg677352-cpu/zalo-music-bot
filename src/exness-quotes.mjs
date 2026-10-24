// Public website feed only; no Exness account authentication.
export function createExnessQuotes({fetcher=fetch,now=()=>Date.now()/1000,monotonic=()=>performance.now()}={}) {
  const cache=new Map(),pending=new Map(),blocked=new Map();
  async function read(asset) {
    if(!['BTC','ETH'].includes(asset))throw Error('Unsupported quote asset');
    const saved=cache.get(asset);
    if(saved && now()-saved.t<=3 && saved.t<=now()+3)return saved;
    if((blocked.get(asset)||0)>monotonic())throw Error('Public quote cooldown');
    let reader;
    try {
      const r=await fetcher('https://www.exness.com/api/quotes/subscribe/?instruments='+asset+'USD',{headers:{Accept:'text/event-stream'},signal:AbortSignal.timeout(6000),cache:'no-store'});
      if(!r.ok){if([403,451,429].includes(r.status))blocked.set(asset,monotonic()+(r.status===429?Math.max(30,Math.min(300,Number(r.headers.get('retry-after'))||30)):300)*1000);await r.body?.cancel();throw Error('Public quote HTTP '+r.status)}
      reader=r.body.getReader();const decoder=new TextDecoder();let buffer='',size=0;
      for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000)throw Error('Oversized public quote');buffer+=decoder.decode(value,{stream:true});let at;
        while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line.startsWith('data:'))continue;let d;try{d=JSON.parse(line.slice(5))}catch{continue}if(!d?.bid)continue;
          const q={source:'Exness công khai',bid:Number(d.bid),ask:Number(d.ask),t:Date.parse(d.time)/1000};
          if(d.instrument!==asset+'USD'||![q.bid,q.ask,q.t].every(Number.isFinite)||q.bid<=0||q.ask<q.bid||now()-q.t>5||q.t>now()+3)throw Error('Invalid or stale public quote');
          cache.set(asset,q);return q;
        }
      }throw Error('Public quote unavailable');
    } finally {if(reader)await reader.cancel().catch(()=>{})}
  }
  return {quote(asset){if(pending.has(asset))return pending.get(asset);const p=read(asset).finally(()=>pending.delete(asset));pending.set(asset,p);return p}};
}
