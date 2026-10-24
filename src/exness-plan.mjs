// Convert volatility distances, never copy spot/perpetual Entry into an Exness setup.
export function exnessPlan(plan,quote,anchor,now){
 const pause=reason=>({status:'stale',asset:plan.asset,frame:plan.frame,reason});
 const fresh=q=>q&&[q.bid,q.ask,q.t].every(Number.isFinite)&&q.bid>0&&q.ask>=q.bid&&now-q.t<=5&&q.t<=now+3;
 if(!fresh(quote)||quote.source!=='Exness công khai'||!fresh(anchor)||anchor.source!=='Bitget'||Math.abs(quote.t-anchor.t)>5)return pause('Chưa có giá Exness mới cùng thời điểm; tạm dừng setup.');
 if(plan.expires<=now)return{status:'waiting',asset:plan.asset,frame:plan.frame,reason:'Setup đã hết hạn entry; chờ tín hiệu mới.'};
 const ratio=(quote.bid+quote.ask)/(anchor.bid+anchor.ask);
 if(ratio<.98||ratio>1.02)return pause('Chênh lệch giá giữa nguồn nến và Exness quá lớn; chưa phát setup.');
 const entry=plan.side===1?quote.ask:quote.bid,risk=plan.risk*ratio,sl=entry-plan.side*risk,tp=entry+plan.side*risk*plan.rr;
 if(!(risk>0)||quote.ask-quote.bid>risk*.2||sl<=0||tp<=0)return pause('Spread/khoảng giá Exness không hợp lệ; chưa phát setup.');
 return{...plan,entry,low:entry-.03*risk,high:entry+.03*risk,sl,tp,risk,source:'Exness công khai',candle_source:'Bitget',currency:'USD',instrument:plan.asset+'USD',order_type:'MARKET',created:now,quote_time:quote.t,quote_bid:quote.bid,quote_ask:quote.ask,accepted:false,experimental:true,demo:true};
}
