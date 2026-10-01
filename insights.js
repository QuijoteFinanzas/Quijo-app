/* Quijo V1.2 - auditable calculations. No network or stored credentials. */
(function (global) {
  'use strict';
  const M = global.QFModel;
  const ok = Number.isFinite;
  const sum = xs => xs.reduce((a, b) => a + b, 0);
  const cleanText = (s, max = 300) => String(s == null ? '' : s).slice(0, max);
  const day = s => Date.parse(s + 'T12:00:00Z') / 86400000;
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const d = new Date(s + 'T12:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }
  function endMonth(p) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p || '')) return null;
    const [y, m] = p.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
  }
  const isEnd = d => validDate(d) && endMonth(d.slice(0, 7)) === d;
  const serial = p => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7));
  function stamp(d) {
    /* Deliberately not a security hash: binds confirmations to economic inputs. */
    return JSON.stringify([d.date, d.positions.map(p => [p.id, p.value]).sort((a,b) => a[0].localeCompare(b[0]))]);
  }
  function blank() { return {version: 1, closes: {}, flows: {}, benchmarks: [], goals: []}; }
  function sanitize(raw) {
    const x = blank();
    if (!raw || typeof raw !== 'object') return x;
    if (raw.version && raw.version !== 1) throw Error('Version de analisis no compatible.');
    for (const [date, val] of Object.entries(raw.closes || {}).slice(0, 150)) {
      if (isEnd(date) && typeof val === 'string' && val.length < 100000) x.closes[date] = val;
    }
    for (const [date, rec] of Object.entries(raw.flows || {}).slice(0, 150)) {
      if (!isEnd(date) || !rec || !validDate(rec.startDate) || !Array.isArray(rec.items) || rec.items.length > 1500) continue;
      const items = rec.items.map(f => {
        if (!validDate(f.date) || !ok(f.amount) || Math.abs(f.amount) > 1e11 || f.date <= rec.startDate || f.date > date) throw Error('Flujo fechado no valido.');
        return {date: f.date, amount: f.amount};
      });
      x.flows[date] = {startDate: rec.startDate, startStamp: cleanText(rec.startStamp, 100000), endStamp: cleanText(rec.endStamp, 100000), items};
    }
    if ((raw.benchmarks?.length || 0) > 8 || (raw.goals?.length || 0) > 20) throw Error('Limite de referencias u objetivos superado.');
    const benchmarkIds = new Set();
    for (const b of (Array.isArray(raw.benchmarks) ? raw.benchmarks : [])) {
      if (!b || !String(b.id || '').trim() || benchmarkIds.has(b.id) || !String(b.name || '').trim() || !String(b.source || '').trim() || !Array.isArray(b.rows) || !b.rows.length || b.rows.length > 1200 || b.currency !== 'EUR' || !b.reinvested) throw Error('Serie de referencia no compatible: debe ser EUR y con rendimientos reinvertidos.');
      benchmarkIds.add(b.id);
      const seen = new Set();
      const rows = b.rows.map(r => {
        if (!endMonth(r.period) || !ok(r.returnPct) || r.returnPct <= -100 || r.returnPct > 1000 || seen.has(r.period)) throw Error('Mes duplicado o rentabilidad de referencia no valida.');
        seen.add(r.period);
        for (const k of ['riskFreePct', 'defensivePct']) if (r[k] != null && (!ok(r[k]) || r[k] <= -100 || r[k] > 1000)) throw Error('Serie auxiliar no valida.');
        return {period: r.period, returnPct: r.returnPct, riskFreePct: r.riskFreePct ?? null, defensivePct: r.defensivePct ?? null};
      }).sort((a,b) => a.period.localeCompare(b.period));
      if(rows.some(r=>r.riskFreePct!==null)&&!String(b.riskFreeSource||'').trim())throw Error('Fuente libre de riesgo ausente.');
      if(rows.some(r=>r.defensivePct!==null)&&!String(b.defensiveSource||'').trim())throw Error('Fuente defensiva ausente.');
      x.benchmarks.push({id: cleanText(b.id, 80), name: cleanText(b.name, 100), source: cleanText(b.source, 600), currency: 'EUR', reinvested: true, defensiveSource: cleanText(b.defensiveSource, 600), riskFreeSource: cleanText(b.riskFreeSource, 600), rows});
    }
    const seenGoals = new Set();
    for (const g of (Array.isArray(raw.goals) ? raw.goals : []).slice(0, 20)) {
      if (!g || !String(g.title||'').trim() || !String(g.id||'').trim() || !ok(g.target) || g.target <= 0 || g.target > 1e11 || !['financial','cash','reserve','child','pension','savings','manual'].includes(g.basis)) throw Error('Objetivo no valido.');
      const id = cleanText(g.id, 80); if (seenGoals.has(id)) throw Error('Objetivos duplicados.'); seenGoals.add(id);
      if (!ok(g.current) || g.current < 0 || !ok(g.monthly) || g.monthly < 0 || g.monthly > 1e9 || (g.due && !validDate(g.due))) throw Error('Importe o fecha de objetivo no valido.');
      x.goals.push({id,title:cleanText(g.title,80),target:g.target,basis:g.basis,current:g.current,monthly:g.monthly,due:g.due||null});
    }
    return x;
  }
  function state(p) { return p.insights || blank(); }
  function previous(p, date) {
    return Object.keys(p.snapshots).filter(d => d < date).sort().at(-1) || null;
  }
  function diff(p, from, to) {
    const a = p.snapshots[from], b = p.snapshots[to]; if (!a || !b || from >= to) return null;
    const old = M.totals(a), now = M.totals(b);
    const totals = Object.fromEntries(['financial','invested','cash','available','net','debt'].map(k => [k,{old:old[k],now:now[k],delta:now[k]-old[k],pct:old[k] ? (now[k]/old[k]-1)*100 : null}]));
    const oldBlocks = new Map(M.allocation(a).map(v=>[v.key,v])), newBlocks = new Map(M.allocation(b).map(v=>[v.key,v]));
    const blocks = [...new Set([...oldBlocks.keys(),...newBlocks.keys()])].map(key=>{
      const u=oldBlocks.get(key),v=newBlocks.get(key);return {key,name:v?.name||u.name,before:u?.pct||0,after:v?.pct||0,delta:(v?.pct||0)-(u?.pct||0),valueDelta:(v?.value||0)-(u?.value||0)};
    });
    const ap=new Map(a.positions.map(v=>[v.id,v])),bp=new Map(b.positions.map(v=>[v.id,v]));
    const positions=[...new Set([...ap.keys(),...bp.keys()])].map(id=>{
      const u=ap.get(id),v=bp.get(id);return {id,name:v?.displayName||u?.displayName||v?.name||u?.name,kind:v?.kind||u.kind,before:u?.value||0,after:v?.value||0,delta:(v?.value||0)-(u?.value||0),weightDelta:(now.financial?(v?.value||0)/now.financial*100:0)-(old.financial?(u?.value||0)/old.financial*100:0),status:!u?'Nueva en el cierre':!v?'Ya no figura':'En ambos'};
    }).sort((u,v)=>Math.abs(v.delta)-Math.abs(u.delta));
    return {from,to,old,now,totals,blocks,positions};
  }
  function dietz(start, end, startDate, endDate, flows) {
    const days = day(endDate)-day(startDate); if (!(start > 0) || !ok(end) || days <= 0) return null;
    const net=sum(flows.map(f=>f.amount)),weighted=sum(flows.map(f=>f.amount*(day(endDate)-day(f.date))/days));
    const denominator=start+weighted;if (!(denominator>0)) return null;
    const residual=end-start-net,r=residual/denominator;
    if(!ok(r)||r<=-1)return null;
    return {returnPct:r*100,net,weighted,denominator,residual,largeFlow:flows.some(f=>Math.abs(f.amount)>=0.1*start)};
  }
  function portfolioMonths(p) {
    const s=state(p),dates=Object.keys(p.snapshots).filter(isEnd).sort(),out=[];
    for (let i=1;i<dates.length;i++) {
      const from=dates[i-1],to=dates[i],a=p.snapshots[from],b=p.snapshots[to],rec=s.flows[to];
      const row={from,to,period:to.slice(0,7),start:M.totals(a).invested,end:M.totals(b).invested,eligible:false,reason:'Flujos pendientes de conciliar'};
      if(!isEnd(from)||!isEnd(to)||serial(to)-serial(from)!==1)row.reason='Se necesitan dos cierres consecutivos de fin de mes';
      else if(s.closes[from]!==stamp(a)||s.closes[to]!==stamp(b))row.reason='Confirma que ambas fotos corresponden al cierre de mes';
      else if(rec&&rec.startDate===from&&rec.startStamp===stamp(a)&&rec.endStamp===stamp(b)) {
        const result=dietz(row.start,row.end,from,to,rec.items);
        if(result)Object.assign(row,result,{eligible:true,reason:'Modified Dietz con flujos confirmados'});
        else row.reason='Base de calculo insuficiente o no positiva';
      }
      out.push(row);
    }
    return out;
  }
  const avg=xs=>sum(xs)/xs.length;
  function stdev(xs) { if(xs.length<2)return null;const m=avg(xs);return Math.sqrt(sum(xs.map(x=>(x-m)**2))/(xs.length-1)); }
  function metrics(values, rf) {
    if(!values.length)return null;let index=1,peak=1,dd=0;
    for(const r of values){index*=1+r;peak=Math.max(peak,index);dd=Math.min(dd,index/peak-1);}
    const n=values.length,sd=stdev(values),excess=rf&&rf.length===n?values.map((r,i)=>r-rf[i]):null,esd=excess?stdev(excess):null;
    return {months:n,cumulative:(index-1)*100,annualized:n>=12?(index**(12/n)-1)*100:null,volatility:n>=12&&ok(sd)?sd*Math.sqrt(12)*100:null,sharpe:n>=12&&esd>1e-12?avg(excess)/esd*Math.sqrt(12):null,drawdown:dd*100,best:Math.max(...values)*100,worst:Math.min(...values)*100,positive:values.filter(x=>x>0).length};
  }
  function correlate(a,b){if(a.length<12)return null;const as=stdev(a),bs=stdev(b);if(!as||!bs)return null;const am=avg(a),bm=avg(b);return sum(a.map((v,i)=>(v-am)*(b[i]-bm)))/(a.length-1)/as/bs;}
  function compare(p, b, mode='index', endDate=null) {
    if(!b)return null;
    const map=new Map(b.rows.map(r=>[r.period,r]));
    let candidate=portfolioMonths(p).filter(r=>r.eligible&&(!endDate||r.to<=endDate)&&map.has(r.period)).filter(r=>mode!=='mix'||ok(map.get(r.period).defensivePct));
    if(!candidate.length)return {rows:[],portfolio:null,benchmark:null};
    /* Never geometrically join across a missing month. Use latest contiguous run. */
    const run=[];for(let i=candidate.length-1;i>=0;i--){if(run.length&&serial(run[0].period)-serial(candidate[i].period)!==1)break;run.unshift(candidate[i]);}
    let pi=100,bi=100;
    const rows=run.map(r=>{const br=map.get(r.period),bret=mode==='mix'?br.returnPct*.75+br.defensivePct*.25:br.returnPct;pi*=1+r.returnPct/100;bi*=1+bret/100;return {...r,benchmarkPct:bret,riskFreePct:br.riskFreePct,portfolioIndex:pi,benchmarkIndex:bi};});
    const pv=rows.map(r=>r.returnPct/100),bv=rows.map(r=>r.benchmarkPct/100),rf=rows.every(r=>ok(r.riskFreePct))?rows.map(r=>r.riskFreePct/100):null;
    return {rows,from:rows[0].from,to:rows.at(-1).to,portfolio:metrics(pv,rf),benchmark:metrics(bv,rf),correlation:correlate(pv,bv),skipped:candidate.length-run.length,hasRiskFree:!!rf,mode};
  }
  function parseNumber(raw, optional=false) {
    let s=String(raw??'').trim().replace(/%$/,'').replace(/\s/g,''); if(!s&&optional)return null;
    if(!s||!/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(s))throw Error('Numero no valido. Sin separador de miles; usa 1,25 o 1.25 para 1,25%.');
    const n=Number(s.replace(',','.'));if(!ok(n))throw Error('Numero no valido.');return n;
  }
  function csvLines(text) {
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return [];
    const delimiter=lines[0].includes(';')?';':lines[0].includes('\t')?'\t':',';
    return lines.map(line=>{const out=[];let field='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){out.push(field.trim());field='';}else field+=c;}if(quoted)throw Error('Comillas CSV sin cerrar.');out.push(field.trim());return out;});
  }
  function parseBenchmark(text,meta) {
    if(text.length>500000)throw Error('Serie demasiado grande.');const rows=csvLines(text);if(rows.length<2)throw Error('Incluye cabecera y al menos un mes.');
    const header=rows.shift().map(s=>s.toLowerCase().trim());const p=header.indexOf('mes'),r=header.indexOf('rentabilidad_pct'),rf=header.indexOf('libre_riesgo_pct'),d=header.indexOf('defensivo_pct');
    if(p<0||r<0)throw Error('Cabeceras requeridas: mes;rentabilidad_pct;libre_riesgo_pct;defensivo_pct');
    const parsed=rows.map((line,i)=>{let period=line[p];if(validDate(period)){if(!isEnd(period))throw Error('Fila '+(i+2)+': utiliza mes completo o fecha de fin de mes.');period=period.slice(0,7);}if(!endMonth(period))throw Error('Mes no valido en fila '+(i+2));return {period,returnPct:parseNumber(line[r]),riskFreePct:rf>=0?parseNumber(line[rf],true):null,defensivePct:d>=0?parseNumber(line[d],true):null};});
    if(!meta.name?.trim()||!meta.source?.trim())throw Error('Indica nombre y fuente de los datos.');
    if(parsed.some(r=>r.riskFreePct!==null)&&!meta.riskFreeSource?.trim())throw Error('Indica la fuente de la serie libre de riesgo.');
    if(parsed.some(r=>r.defensivePct!==null)&&!meta.defensiveSource?.trim())throw Error('Indica la fuente del componente defensivo.');
    return sanitize({benchmarks:[{...meta,rows:parsed}]}).benchmarks[0];
  }
  function parseFlows(text,from,to){if(!text.trim())return [];const lines=csvLines(text);return lines.map((line,i)=>{if(line.length!==2||!validDate(line[0])||line[0]<=from||line[0]>to)throw Error('Flujo '+(i+1)+': fecha dentro del intervalo y formato AAAA-MM-DD;importe.');return {date:line[0],amount:parseNumber(line[1])};});}
  function goalValue(g,d){const t=M.totals(d);switch(g.basis){case 'financial':return t.financial;case 'cash':return t.available;case 'reserve':return t.available+sum(d.positions.filter(p=>p.group==='axa').map(p=>p.value));case 'child':return sum(d.positions.filter(p=>p.earmarked).map(p=>p.value));case 'pension':return sum(d.positions.filter(p=>p.kind==='pension').map(p=>p.value));case 'savings':return M.savings(d,d.date.slice(0,4)).net;default:return g.current;}}
  function goalStatus(g,d){const current=goalValue(g,d),left=Math.max(0,g.target-current),months=g.due?Math.max(0,serial(g.due)-serial(d.date)):null;return {current,left,progress:current/g.target*100,months,neededMonthly:months>0?left/months:null,projectedMonths:g.monthly>0?Math.ceil(left/g.monthly):left===0?0:null};}
  global.QFInsights={blank,sanitize,state,previous,diff,dietz,portfolioMonths,compare,metrics,stamp,endMonth,isEnd,validDate,serial,parseBenchmark,parseFlows,goalValue,goalStatus};
})(window);
