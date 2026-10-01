/* The renderer receives ONLY the public allowlist object, never the private vault. */
(function(global){
 'use strict';
 const dims={landscape:[1200,675],square:[1080,1080],portrait:[1080,1350]};
 const colors={equity:'#70b59e',stocks:'#b2ce88',defensive:'#9cb6cd',cash:'#dccb9d',bitcoin:'#e4a37b',gold:'#d4b852',other:'#acb4b8'};
 const pct=v=>Number(v).toLocaleString('es-ES',{maximumFractionDigits:2,minimumFractionDigits:2})+'%';
 function render(p,format='landscape',section='all',theme='dark') {
   if(p.schema!=='quijocartera-publica')throw Error('Se requiere una exportacion publica.');
   const [W,H]=dims[format]||dims.landscape,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
   if(!x)throw Error('El navegador no permite generar la tarjeta.');
   const dark=theme!=='light',bg=dark?'#102d2d':'#f4f5f0',ink=dark?'#f4f8ed':'#15332e',muted=dark?'#afc2b6':'#576f63',line=dark?'#33554a':'#d6ded4';
   const b=p.blocks.find(b=>b.key===section),title=section==='dca'?'As\u00ed distribuyo las aportaciones':b?b.name:'As\u00ed se reparte mi cartera';
   const rows=section==='dca'?p.dca.map(r=>({name:r.name,pct:r.pct,key:'equity'})):b?b.products.map(r=>({name:r.name,pct:r.pctWithinBlock,key:b.key})):p.blocks;
   const subtitle=section==='dca'?'Porcentaje del DCA programado':b?'Porcentajes dentro del bloque':'Porcentajes del patrimonio financiero';
   x.fillStyle=bg;x.fillRect(0,0,W,H);const pad=54;
   const fit=(s,max,font,min=15)=>{let size=font;do{x.font='600 '+size+'px system-ui, sans-serif';if(x.measureText(s).width<=max)break;size--;}while(size>min);return size;};
   x.fillStyle=ink;x.font='bold 42px system-ui, sans-serif';x.fillText('quijo.',pad,73);
   x.textAlign='right';x.fillStyle=muted;x.font='19px system-ui, sans-serif';x.fillText(new Date(p.date+'T12:00:00Z').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}),W-pad,70);x.textAlign='left';
   x.fillStyle=ink;fit(title,W-2*pad,42);x.fillText(title,pad,137);
   x.fillStyle=muted;x.font='20px system-ui, sans-serif';x.fillText(subtitle,pad,173);
   const landscape=format==='landscape',showRing=section==='all';
   const drawRing=(cx,cy,r)=>{let a=-Math.PI/2;x.lineWidth=48;p.blocks.forEach(v=>{const end=a+2*Math.PI*v.pct/100;x.beginPath();x.arc(cx,cy,r,a,end);x.strokeStyle=colors[v.key]||colors.other;x.stroke();a=end;});x.textAlign='center';x.fillStyle=ink;x.font='bold 49px system-ui, sans-serif';x.fillText('100%',cx,cy+7);x.font='15px system-ui, sans-serif';x.fillStyle=muted;x.fillText('QUIJOCARTERA',cx,cy+37);x.textAlign='left';};
   let left=pad,top=222,width=W-pad*2,limit=H-108;
   if(showRing&&landscape){drawRing(240,370,120);left=463;top=222;width=W-left-pad;}
   else if(showRing){drawRing(W/2,339,117);top=514;}
   const rowSpace=Math.min(landscape?58:showRing?124:128,(limit-top)/Math.max(1,rows.length));
   rows.forEach((r,i)=>{
      const y=top+i*rowSpace;x.fillStyle=colors[r.key]||colors.equity;
      x.beginPath();x.arc(left+5,y+7,5,0,7);x.fill();
      x.fillStyle=ink;fit(r.name,width-140,landscape?19:23,14);x.fillText(r.name,left+23,y+14);
      x.textAlign='right';x.font='bold '+(landscape?24:28)+'px system-ui, sans-serif';x.fillText(pct(r.pct),left+width,y+14);x.textAlign='left';
      if(!showRing){x.fillStyle=line;x.fillRect(left+23,y+25,width-23,5);x.fillStyle=colors[r.key]||colors.equity;x.fillRect(left+23,y+25,(width-23)*Math.min(100,r.pct)/100,5);}
   });
   x.strokeStyle=line;x.lineWidth=1;x.beginPath();x.moveTo(pad,H-83);x.lineTo(W-pad,H-83);x.stroke();
   x.fillStyle=muted;x.font='15px system-ui, sans-serif';x.fillText('Cartera personal. No es una recomendaci\u00f3n de inversi\u00f3n.',pad,H-52);
   x.fillStyle=ink;x.font='600 18px system-ui, sans-serif';x.fillText('quijotefinanzas.com',pad,H-24);
   x.textAlign='right';x.fillStyle=muted;x.fillText('@QuijoteFinanzas',W-pad,H-24);
   return c;
 }
 global.QFPublicCard={render,formats:dims};
})(window);
