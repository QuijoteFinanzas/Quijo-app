/* Quijo Finanzas - local XLSX reader for the user's monthly workbook.
   No network, macros, eval or external links. A limited numeric formula parser
   is used only for input cells without cached values, never as a full Excel engine. */
(function (global) {
  'use strict';
  const MAX_FILE = 12 * 1024 * 1024, MAX_XML = 12 * 1024 * 1024;
  const decoder = new TextDecoder('utf-8');
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const sum = a => a.reduce((x,y)=>x+(Number.isFinite(y)?y:0),0);
  const text = (s, max=180) => String(s ?? '').slice(0,max);
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const n = x => finite(x) ? x : null;
  const cents = x => Math.round(x*100)/100;
  function colNum(s) {return [...s.replace(/\$/g,'')].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);}
  function colName(n) {let s=''; for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
  function monthOf(v) {
    if (finite(v)) return new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000).toISOString().slice(0,7);
    const z=String(v ?? '').match(/^(\d{4})-(\d{2})/); return z?z[1]+'-'+z[2]:null;
  }
  function endOfMonth(p) {const [y,m]=p.split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}
  function xml(s) {const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('XML no v\u00e1lido en el archivo.');return d;}
  function all(d,tag){return Array.from(d.getElementsByTagNameNS('*',tag));}
  function first(d,tag){return d.getElementsByTagNameNS('*',tag)[0];}
  const crcTable=Array.from({length:256},(_,c)=>{for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  function crc32(a){let c=0xffffffff;for(const b of a)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  async function zipReader(buffer) {
    const a=new Uint8Array(buffer), v=new DataView(buffer);
    if(a.length>MAX_FILE || a.length<22)throw Error('Usa un .xlsx de menos de 12 MB.');
    let e=-1;for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){e=i;break;}}
    if(e<0)throw Error('No es un archivo XLSX compatible. No se admiten archivos cifrados.');
    const count=v.getUint16(e+10,true);let off=v.getUint32(e+16,true), total=0;const entries=new Map();
    if(count>600 || v.getUint16(e+4,true)!==0 || v.getUint16(e+6,true)!==0)throw Error('Archivo ZIP no compatible.');
    for(let i=0;i<count;i++){
      if(off+46>a.length || v.getUint32(off,true)!==0x02014b50)throw Error('Directorio XLSX da\u00f1ado.');
      const flags=v.getUint16(off+8,true), method=v.getUint16(off+10,true), crc=v.getUint32(off+16,true), size=v.getUint32(off+20,true), uncompressed=v.getUint32(off+24,true);
      const nl=v.getUint16(off+28,true),el=v.getUint16(off+30,true),cl=v.getUint16(off+32,true), local=v.getUint32(off+42,true);
      const name=decoder.decode(a.slice(off+46,off+46+nl));
      total+=uncompressed;
      if(flags&1 || uncompressed>MAX_XML || total>60*1024*1024 || name.includes('..'))throw Error('Archivo no compatible o demasiado grande.');
      entries.set(name,{method,crc,size,uncompressed,local});off+=46+nl+el+cl;
    }
    return async function read(name,optional=false){
      const x=entries.get(name);if(!x){if(optional)return null;throw Error('Falta '+name+' en el XLSX.');}
      if(x.local+30>a.length || v.getUint32(x.local,true)!==0x04034b50)throw Error('Contenido XLSX da\u00f1ado.');
      const start=x.local+30+v.getUint16(x.local+26,true)+v.getUint16(x.local+28,true);
      if(start+x.size>a.length)throw Error('Archivo truncado.');
      let data=a.slice(start,start+x.size);
      if(x.method===8){
        let ds;try{ds=new DecompressionStream('deflate-raw');}catch(_){throw Error('Tu navegador no permite leer XLSX localmente. Actualiza Safari o importa la copia JSON.');}
        const reader=new Blob([data]).stream().pipeThrough(ds).getReader();let size=0,chunks=[];
        while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_XML || size>x.uncompressed){await reader.cancel();throw Error('Contenido descomprimido demasiado grande.');}chunks.push(value);}
        data=new Uint8Array(size);let j=0;for(const c of chunks){data.set(c,j);j+=c.length;}
      }else if(x.method!==0)throw Error('Compresi\u00f3n XLSX no admitida.');
      if(data.length!==x.uncompressed || crc32(data)!==x.crc)throw Error('El archivo no supera la comprobaci\u00f3n de integridad.');
      return decoder.decode(data);
    };
  }
  async function readXlsx(buffer){
    const read=await zipReader(buffer);
    const wb=xml(await read('xl/workbook.xml'));
    if(['1','true'].includes(first(wb,'workbookPr')?.getAttribute('date1904')))throw Error('Este libro usa fechas 1904. Gu\u00e1rdalo con fechas 1900 o usa JSON.');
    const rels=xml(await read('xl/_rels/workbook.xml.rels'));
    const relMap=new Map(all(rels,'Relationship').filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
    const ss=await read('xl/sharedStrings.xml',true);
    const strings=ss?all(xml(ss),'si').map(si=>all(si,'t').map(t=>t.textContent).join('')):[];
    const names=['fondos','cuentas','seguimiento cartera','seguimiento ahorro','acciones (myinvestor)'];const sheets={};
    for(const s of all(wb,'sheet')){
      const name=s.getAttribute('name');if(!names.includes(norm(name)))continue;
      const rid=s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      const target=relMap.get(rid);if(!target)continue;
      const path=target.startsWith('/')?target.slice(1):'xl/'+target;
      const d=xml(await read(path));const cells={};let maxRow=0,maxCol=0;
      const list=all(d,'c');if(list.length>100000)throw Error('La hoja '+name+' es demasiado grande.');
      for(const c of list){
        const address=c.getAttribute('r'),m=address?.match(/^([A-Z]+)(\d+)$/);if(!m)continue;
        maxRow=Math.max(maxRow,+m[2]);maxCol=Math.max(maxCol,colNum(m[1]));
        const type=c.getAttribute('t'),fv=first(c,'f'),cv=first(c,'v');let value=null;
        if(type==='s')value=strings[Number(cv?.textContent)]??'';
        else if(type==='inlineStr')value=all(c,'t').map(t=>t.textContent).join('');
        else if(type==='str' || type==='d')value=cv?.textContent??'';
        else if(type==='e')value=null;
        else if(cv?.textContent?.trim())value=Number(cv.textContent);
        cells[address]={v:value,f:fv?.textContent||null};
      }
      sheets[name]={cells,maxRow,maxCol};
    }
    return sheets;
  }
  // Safe recursive-descent numeric expression parser. Unsupported formulas cause
  // a visible import warning or rejection; they are never silently turned into zero.
  function evaluator(sheets){
    const cache=new Map(),busy=new Set();
    function val(sheet,addr,depth=0){
      addr=addr.replace(/\$/g,'');const key=sheet+'!'+addr;
      if(cache.has(key))return cache.get(key);
      if(depth>50 || busy.has(key))throw Error('Referencia circular: '+key);
      const c=sheets[sheet]?.cells[addr];if(!c)return null;
      if(!c.f)return c.v;
      busy.add(key);
      let result;
      try { result=parse(c.f,sheet,depth+1); }
      catch(err){ if(finite(c.v))result=c.v;else throw Error('No se puede leer '+key+': '+err.message); }
      finally {busy.delete(key);}
      cache.set(key,result);return result;
    }
    function parse(formula,sheet,depth){
      const src=formula.replace(/^=/,'').replace(/\$/g,'');
      const re=/\s*('(?:[^']|'')+'![A-Z]+\d+|[A-Za-z_][A-Za-z0-9_]*![A-Z]+\d+|[A-Z]+\d+|\d+(?:\.\d*)?(?:[Ee][+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_.]*|"(?:[^"]|"")*"|[+\-*/^(),:%])/gy;
      const tokens=[];let end=0,m;
      while((m=re.exec(src))){tokens.push(m[1]);end=re.lastIndex;}
      if(src.slice(end).trim())throw Error('F\u00f3rmula no soportada.');
      let i=0;
      const toN=x=>x===null||x===''?0:finite(x)?x: (()=>{throw Error('Dato no num\u00e9rico.');})();
      function ref(t){let sh=sheet,ad=t;if(t.includes('!')){const pos=t.lastIndexOf('!');sh=t.slice(0,pos).replace(/^'|'$/g,'').replace(/''/g,"'");ad=t.slice(pos+1);}return {sh,ad};}
      function primary(){
        const t=tokens[i++];if(t===undefined)throw Error('F\u00f3rmula incompleta.');
        if(t==='+')return +toN(primary());if(t==='-')return -toN(primary());
        if(t==='('){const x=expr();if(tokens[i++]!==')')throw Error('Par\u00e9ntesis no v\u00e1lido.');return x;}
        if(/^\d|^\.\d/.test(t))return Number(t);
        if(t.startsWith('"'))return t.slice(1,-1).replace(/""/g,'"');
        if(/(?:!|^)[A-Z]+\d+$/.test(t)){
          const r=ref(t);
          if(tokens[i]===':'){
            i++;const r2=ref(tokens[i++]),a=r.ad.match(/([A-Z]+)(\d+)/),b=r2.ad.match(/([A-Z]+)(\d+)/),out=[];
            if(!a||!b)throw Error('Rango no v\u00e1lido.');
            if((+b[2]-a[2]+1)*(colNum(b[1])-colNum(a[1])+1)>20000)throw Error('Rango demasiado grande.');
            for(let rr=+a[2];rr<=+b[2];rr++)for(let cc=colNum(a[1]);cc<=colNum(b[1]);cc++)out.push(val(r.sh,colName(cc)+rr,depth));return out;
          }
          return val(r.sh,r.ad,depth);
        }
        if(tokens[i]==='('){
          i++;let args=[];if(tokens[i]!==')'){do{args.push(expr());if(tokens[i]!==',')break;i++;}while(true);}if(tokens[i++]!==')')throw Error('Funci\u00f3n incompleta.');
          const flat=args.flat();switch(t.toUpperCase()){
            case 'SUM':return sum(flat);case 'N':return finite(args[0])?args[0]:0;
            case 'MIN':return Math.min(...flat.filter(finite));case 'MAX':return Math.max(...flat.filter(finite));
            case 'ABS':return Math.abs(toN(args[0]));case 'ROUND':return Number(toN(args[0]).toFixed(toN(args[1])));
            case 'SUMPRODUCT':return Array.isArray(args[0])?sum(args[0].map((_,j)=>args.reduce((a,b)=>a*toN(Array.isArray(b)?b[j]:b),1))):args.reduce((a,b)=>a*toN(b),1);
            case 'SUBTOTAL':if(args[0]===109||args[0]===9)return sum(args.slice(1).flat());break;
            case 'SUMIF':return sum((args[0]||[]).map((v,j)=>v===args[1]?(args[2]||args[0])[j]:0));
          }throw Error('Funci\u00f3n '+t+' no admitida.');
        }
        throw Error('Referencia no soportada.');
      }
      function power(){let x=primary();if(tokens[i]==='%'){i++;x=toN(x)/100;}if(tokens[i]==='^'){i++;x=toN(x)**toN(power());}return x;}
      function term(){let x=power();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],y=toN(power());x=op==='*'?toN(x)*y:toN(x)/y;}return x;}
      function expr(){let x=term();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],y=toN(term());x=op==='+'?toN(x)+y:toN(x)-y;}return x;}
      const x=expr();if(i!==tokens.length || (typeof x==='number'&&!finite(x)))throw Error('Resultado de f\u00f3rmula no v\u00e1lido.');return x;
    }
    return val;
  }
  const PRODUCTS=[
    {match:'vanguard global stock',id:'world',name:'Vanguard Global Stock Index',block:'equity',group:'world',isin:'IE00B03HD191'},
    {match:'fidelity msci world',id:'child-world',name:'Fidelity MSCI World Index',block:'equity',group:'world',isin:'IE00BYX5NX33',earmarked:true},
    {match:'myinvestor indexado global pp',id:'pension',name:'MyInvestor Indexado Global PP',block:'equity',group:'pension',plan:true},
    {match:'robeco qi em',id:'em',name:'Robeco QI EM Active Equities D',block:'equity',group:'em',isin:'LU0329355670'},
    {match:'vanguard global small',id:'small',name:'Vanguard Global Small-Cap Index',block:'equity',group:'small',isin:'IE00B42W4L06'},
    {match:'magallanes european',id:'value',name:'Magallanes European Equity P',block:'equity',group:'value',isin:null},
    {match:'dnca invest alpha',id:'dnca',name:'DNCA Invest Alpha Bonds A',block:'defensive',group:'dnca',isin:'LU1694789451'},
    {match:'ostrum',id:'ostrum',name:'Ostrum Credit Ultra Short Plus',block:'defensive',group:'ostrum',isin:'FR001400CFA4'},
    {match:'axa tresor',id:'axa',name:'AXA Tr\u00e9sor Court Terme C',block:'defensive',group:'axa',isin:'FR0000447823'},
    {match:'gamma global',id:'gamma',name:'Gamma Global FI',block:'defensive',group:'gamma',isin:'ES0140794001'},
    {match:'ishares bitcoin',id:'btc',name:'iShares Bitcoin ETP',block:'bitcoin',group:'btc',isin:'XS2940466316'},
    {match:'ishares physical gold',id:'gold',name:'iShares Physical Gold ETC',block:'gold',group:'gold',isin:'IE00B4ND3602'}
  ];
  const STOCKS=[['microsoft','MSFT'],['amazon','AMZN'],['lvmh','MC'],['mastercard','MA'],['airbus','AIR'],['meta','META'],['mcdonald','MCD'],['spgi','SPGI'],['s&p global','SPGI']];
  function normalise(sheets,fileName){
    const findSheet=name=>Object.keys(sheets).find(k=>norm(k)===name);
    const F=findSheet('fondos'),C=findSheet('cuentas'),H=findSheet('seguimiento cartera'),S=findSheet('seguimiento ahorro'),T=findSheet('acciones (myinvestor)');
    if(!F||!C||!H||!S||!T)throw Error('Faltan hojas de la plantilla: Fondos, Cuentas, Seguimiento Cartera, Seguimiento Ahorro o Acciones (MyInvestor).');
    const value=evaluator(sheets),warnings=[];
    const get=(s,a)=>value(s,a), need=(s,a)=>{const v=get(s,a);if(!finite(v))throw Error('Falta un importe num\u00e9rico en '+s+'!'+a);return v;};
    const positions=[];let pensionCount=0;
    for(let r=4;r<50;r++){
      const name=get(F,'B'+r);if(norm(name)==='total')break;if(typeof name!=='string'||!name)continue;
      const raw=get(F,'C'+r);if(raw===null||raw===0)continue;if(!finite(raw))throw Error('Importe no v\u00e1lido en Fondos!C'+r);
      const spec=PRODUCTS.find(p=>norm(name).includes(p.match));
      const fallback=norm(get(F,'H'+r))==='renta variable'?'equity':norm(get(F,'H'+r))==='renta fija'?'defensive':'other';
      if(!spec)warnings.push('Revisa la clasificaci\u00f3n de '+name+'.');
      const id=spec?.id==='pension'?'pension-'+(++pensionCount):(spec?.id||'fund-'+r);
      positions.push({id,name:text(name),displayName:spec?.name||text(name),kind:spec?.plan?'pension':'fund',block:spec?.block||fallback,group:spec?.group||id,value:raw,returnSinceEntry:n(get(F,'E'+r)),isin:spec?.isin||null,earmarked:!!spec?.earmarked,source:F+'!C'+r});
    }
    for(let r=3;r<100;r++){
      const name=get(T,'B'+r);if(norm(name)==='total')break;if(typeof name!=='string'||!name)continue;
      const q=get(T,'C'+r);if(!finite(q))continue;
      const unitCost=need(T,'D'+r),current=need(T,'F'+r),div=n(get(T,'G'+r))??0;
      const ticker=STOCKS.find(([namePart])=>norm(name).includes(namePart))?.[1]||null;
      const cost=q*unitCost;
      positions.push({id:'stock-'+(ticker||r),name:text(name),displayName:text(name),ticker,kind:'stock',block:'stocks',group:'stocks',value:current,quantity:q,unitCost,cost,dividends:div,returnSinceEntry:cost?(current-cost+div)/cost:null,source:T+'!C'+r+':G'+r});
    }
    const accounts=[];let realAssets=[],debts=[];
    for(let r=4;r<32;r++){
      const name=get(C,'B'+r);if(typeof name!=='string')continue;
      if(norm(get(C,'E'+r))==='efectivo')accounts.push({name:text(name),value:need(C,'C'+r),restricted:norm(name).includes('cobee'),source:C+'!C'+r});
      if(['relojes','coche','piso'].includes(norm(name)))realAssets.push({name:text(name),value:need(C,'C'+r),source:C+'!C'+r});
      if(['hipoteca','prestamo bbva'].includes(norm(name)))debts.push({name:text(name),value:Math.abs(need(C,'C'+r)),source:C+'!C'+r});
    }
    const history=[];
    for(let cc=2;cc<=Math.min(200,sheets[H].maxCol);cc++){
      const c=colName(cc),period=monthOf(get(H,c+'2'));if(!period)continue;
      const inv=n(get(H,c+'4'));if(inv===null)continue;
      const cash=n(get(H,c+'3')),assets=n(get(H,c+'5')),debt=n(get(H,c+'6')),flow=n(get(H,c+'17'));
      history.push({period,investment:inv,cash,otherAssets:assets,debt,contribution:flow,source:H+'!'+c+'3:'+c+'17',carriedForward:!!sheets[H].cells[c+'4']?.f?.match(/^[A-Z]+4$/)});
    }
    if(!history.length||!positions.length)throw Error('No hay posiciones o periodos utilizables.');
    const savings=[];
    for(let row=1;row<=Math.min(500,sheets[S].maxRow);row++){
      if(norm(get(S,'B'+row))!=='mes')continue;
      for(let cc=3;cc<=Math.min(100,sheets[S].maxCol);cc++){
        const c=colName(cc),period=monthOf(get(S,c+row));if(!period)continue;
        const income=n(get(S,c+(row+1))),expenses=n(get(S,c+(row+2)));
        if(income===null&&expenses===null)continue;
        if(income===null||expenses===null){warnings.push('Ahorro incompleto en '+period+'. No se incluye en los totales.');continue;}
        const ei=n(get(S,c+(row+5)))??0,ee=n(get(S,c+(row+6)))??0;
        savings.push({period,income,expenses,extraIncome:ei,extraExpenses:ee,source:S+'!'+c+(row+1)+':'+c+(row+6)});
      }
    }
    const last=history.at(-1),invested=sum(positions.map(p=>p.value)),cash=sum(accounts.map(a=>a.value));
    if(Math.abs(invested-last.investment)>.05)warnings.push('Las posiciones y el \u00faltimo seguimiento de inversi\u00f3n difieren en '+Math.abs(invested-last.investment).toFixed(2)+' EUR. Se mantienen separados; revisa el Excel.');
    if(finite(last.cash)&&Math.abs(cash-last.cash)>.05)warnings.push('La liquidez de Cuentas no coincide con el \u00faltimo seguimiento.');
    warnings.push('El hist\u00f3rico anterior a septiembre de 2026 contiene observaciones a mitad de mes. No son cierres mensuales homog\u00e9neos.');
    warnings.push('La rentabilidad mensual replica la aproximaci\u00f3n del Excel: (final - inicial - flujo registrado) / inicial. Los traspasos internos no son aportaciones externas.');
    return validate({schema:'quijo-finanzas',version:1,date:endOfMonth(last.period),source:{fileName:text(fileName),importedAt:new Date().toISOString()},positions,accounts,realAssets,debts,history,savings,warnings,settings:{dcaTotal:null,fire:null}});
  }
  function validate(raw){
    if(!raw||raw.schema!=='quijo-finanzas'||raw.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date??''))throw Error('La copia JSON no tiene el formato Quijo Finanzas V1.');
    for(const key of ['positions','accounts','realAssets','debts','history','savings'])if(!Array.isArray(raw[key])||raw[key].length>1500)throw Error('Lista '+key+' no v\u00e1lida.');
    const numFields=['value','returnSinceEntry','quantity','unitCost','cost','dividends','investment','cash','otherAssets','debt','contribution','income','expenses','extraIncome','extraExpenses'];
    const arrays={};
    for(const key of ['positions','accounts','realAssets','debts','history','savings']){
      arrays[key]=raw[key].map(item=>{
        if(!item||typeof item!=='object')throw Error('Registro no v\u00e1lido.');
        const out={};
        for(const k of ['id','name','displayName','kind','block','group','ticker','isin','source','period'])if(item[k]!=null)out[k]=text(item[k],250);
        for(const k of numFields)if(k in item){if(item[k]!==null&&(!finite(item[k])||Math.abs(item[k])>1e13))throw Error('N\u00famero no v\u00e1lido en '+k);out[k]=item[k];}
        for(const k of ['restricted','earmarked','carriedForward'])if(k in item)out[k]=!!item[k];
        if(['positions','accounts','realAssets','debts'].includes(key)&&!finite(out.value))throw Error('Valor ausente en '+key);
        if(out.value<0)throw Error('Importe negativo no admitido en '+key+'. Las deudas se registran en positivo en su bloque.');
        if(['history','savings'].includes(key)&&!/^\d{4}-(0[1-9]|1[012])$/.test(out.period||''))throw Error('Periodo no v\u00e1lido.');
        if(key==='positions'&&!['equity','stocks','defensive','bitcoin','gold','other'].includes(out.block))out.block='other';
        return out;
      });
    }
    if(new Set(arrays.positions.map(p=>p.id)).size!==arrays.positions.length)throw Error('Identificadores de posiciones duplicados.');
    for(const k of ['history','savings']){if(new Set(arrays[k].map(p=>p.period)).size!==arrays[k].length)throw Error('Periodos duplicados en '+k);arrays[k].sort((a,b)=>a.period.localeCompare(b.period));}
    const dc=raw.settings?.dcaTotal, f=raw.settings?.fire;
    const fire=f&&typeof f==='object'?Object.fromEntries(['age','spending','annualNewSavings','withdrawal','realReturn','excludeReserve'].map(k=>[k,n(f[k])])):null;
    return {schema:'quijo-finanzas',version:1,date:raw.date,source:{fileName:text(raw.source?.fileName),importedAt:text(raw.source?.importedAt)},...arrays,warnings:Array.isArray(raw.warnings)?raw.warnings.slice(0,25).map(s=>text(s,700)):[],settings:{dcaTotal:finite(dc)&&dc>=0&&dc<1e8?dc:null,fire}};
  }
  async function fromFile(file){
    if(!file||file.size>MAX_FILE)throw Error('Selecciona un archivo de menos de 12 MB.');
    if(file.name.toLowerCase().endsWith('.json'))return validate(JSON.parse(await file.text()));
    if(!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Usa el Excel .xlsx o una copia .json.');
    return normalise(await readXlsx(await file.arrayBuffer()),file.name);
  }
  global.QFImport={fromFile,readXlsx,normalise,validate,norm,sum,cents,endOfMonth};
})(window);
