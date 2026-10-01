/* Quijo V1.3: pure presentation calculations. No prices or personal data embedded. */
(function (global) {
  'use strict';
  const M = global.QFModel, A = global.QFInsights, finite = Number.isFinite;
  const serial = p => Number(p.slice(0,4))*12 + Number(p.slice(5,7));
  function previousDiff(payload, data) {
    const from = A.previous(payload, data.date);
    return from ? A.diff(payload, from, data.date) : null;
  }
  function groupDelta(payload, data, block, group) {
    const from=A.previous(payload,data.date); if(!from) return null;
    const old=payload.snapshots[from], total=M.totals(data).financial, oldTotal=M.totals(old).financial;
    const before=M.contents(old,block).find(g=>g.id===group), after=M.contents(data,block).find(g=>g.id===group);
    return {date:from,before:before?.value||0,after:after?.value||0,
      totalPP:M.pct(after?.value||0,total)-M.pct(before?.value||0,oldTotal),
      blockPP:(after?.pct||0)-(before?.pct||0),isNew:!before};
  }
  function result(items) {
    if(!items.length)return {kind:'none',value:null};
    if(items.every(p=>p.kind==='stock'&&finite(p.cost)&&p.cost>0)) {
      const cost=M.sum(items.map(p=>p.cost));
      return {kind:'cost',value:(M.sum(items.map(p=>p.value-p.cost+(p.dividends||0)))/cost)*100};
    }
    if(items.length===1&&finite(items[0].returnSinceEntry))return {kind:'source',value:items[0].returnSinceEntry*100};
    return {kind:items.some(p=>finite(p.returnSinceEntry))?'multiple':'none',value:null};
  }
  function stockFacts(data, p) {
    const t=M.stockTotals(data), f=M.totals(data).financial;
    const gain=finite(p.cost)?p.value-p.cost+(p.dividends||0):null;
    return {gain,unreal:finite(p.cost)?p.value-p.cost:null,weight:M.pct(p.value,t.value),totalWeight:M.pct(p.value,f),
      contribution:t.cost>0&&gain!==null?gain/t.cost*100:null,
      returnPct:p.cost>0&&gain!==null?gain/p.cost*100:null};
  }
  function positionHistory(payload, data, id, block) {
    return Object.keys(payload.snapshots).filter(d=>d<=data.date).sort().flatMap(date=>{
      const snap=payload.snapshots[date];
      const row=block?M.contents(snap,block).find(p=>p.id===id):snap.positions.find(p=>p.id===id);
      return row?[{period:date,value:row.value}]:[];
    });
  }
  function estimateSeries(data, year='all') {
    let factor=1, segment=0, lastPeriod=null;const all=[];let skipped=0;
    for(let i=1;i<data.history.length;i++) {
      const h=data.history[i],prev=data.history[i-1];
      if(year!=='all'&&!h.period.startsWith(year))continue;
      if(serial(h.period)-serial(prev.period)!==1||!finite(h.investment)||!(prev.investment>0)||!finite(h.contribution)||h.carriedForward) {
        skipped++;lastPeriod=null;continue;
      }
      const r=(h.investment-prev.investment-h.contribution)/prev.investment;
      if(!finite(r)||r<=-1){skipped++;lastPeriod=null;continue;}
      if(lastPeriod===null||serial(h.period)-serial(lastPeriod)!==1){factor=1;segment++;}
      factor*=1+r;lastPeriod=h.period;
      all.push({period:h.period,value:r*100,cumulative:(factor-1)*100,segment,start:prev.investment,end:h.investment,flow:h.contribution,baseline:prev.period});
    }
    const latest=all.length?all.filter(r=>r.segment===all.at(-1).segment):[];
    return {all,latest,skipped,segments:segment,discarded:all.length-latest.length};
  }
  function savingsFacts(data,year,ordinary=false) {
    const s=M.savings(data,year,ordinary),sorted=[...s.months].sort((a,b)=>a.net-b.net);
    const n=sorted.length,median=n?(n%2?sorted[(n-1)/2].net:(sorted[n/2-1].net+sorted[n/2].net)/2):null;
    return {...s,mean:n?s.net/n:null,median,best:sorted.at(-1)||null,worst:sorted[0]||null,positive:s.months.filter(m=>m.net>0).length};
  }
  function previousSaving(data,period,ordinary=false) {
    return data.savings.map(r=>M.savingMonth(r,ordinary)).find(r=>serial(period)-serial(r.period)===1)||null;
  }
  function investmentFlowSummary(data,year) {
    const months=data.history.filter(h=>h.period.startsWith(year)&&finite(h.contribution));
    return {count:months.length,total:M.sum(months.map(h=>h.contribution)),months};
  }
  global.QFExperience={previousDiff,groupDelta,result,stockFacts,positionHistory,estimateSeries,savingsFacts,previousSaving,investmentFlowSummary};
})(window);
