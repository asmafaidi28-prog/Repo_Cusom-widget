
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <style>
      :host { display:block; width:100%; height:100%; color:var(--sapTextColor,#111); font-family: var(--sapFontFamily, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica, Arial); }
      #root { position:relative; width:100%; height:100%; }
      svg { width:100%; height:100%; display:block; }
      #center { position:absolute; left:0; right:0; bottom:10%; text-align:center; pointer-events:none; }
      #value { display:none !important; } /* Force hide numeric value */
      #label { opacity:.85; line-height:1.1; }
    </style>
    <div id="root">
      <svg id="gauge" preserveAspectRatio="xMidYMid meet" part="gauge"></svg>
      <div id="center" part="center">
        <div id="value" part="value"></div>
        <div id="label" part="label"></div>
      </div>
    </div>
  `;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const remap = (v,a1,a2,b1,b2)=> b1 + (clamp(v,a1,a2)-a1)*(b2-b1)/(a2-a1 || 1);
  const shade = (hex,pct)=>{
    const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if(!m) return hex;
    let r=parseInt(m[1],16),g=parseInt(m[2],16),b=parseInt(m[3],16);
    r=Math.round(clamp(r*(1+pct/100),0,255)); g=Math.round(clamp(g*(1+pct/100),0,255)); b=Math.round(clamp(b*(1+pct/100),0,255));
    const H=n=>n.toString(16).padStart(2,'0'); return '#'+H(r)+H(g)+H(b);
  };

  class GaugeForce extends HTMLElement {
    constructor(){
      super();
      this._shadow=this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._svg=this._shadow.getElementById('gauge');
      this._labelEl=this._shadow.getElementById('label');
      this._w=300; this._h=200;
    }
    connectedCallback(){ this._resize(); this._render(); }
    onCustomWidgetResize(){ this._resize(); this._render(); }
    onCustomWidgetAfterUpdate(){ this._render(); }

    _resize(){
      const r=this.getBoundingClientRect();
      this._w=Math.max(220,r.width||300);
      this._h=Math.max(160,r.height||200);
      this._svg.setAttribute('viewBox',`0 0 ${this._w} ${this._h}`);
    }

    _stops(){
      let s=this.stops;
      if(!Array.isArray(s)) s=[0,0.2,0.4,0.6,0.8,1];
      s=s.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
      return [...new Set(s)];
    }

    _extract(){
      const b=this.dataBinding;
      const find=(o,seen=new Set())=>{
        if(o==null) return null;
        if(typeof o==='number' && Number.isFinite(o)) return o;
        if(typeof o!=='object' || seen.has(o)) return null; seen.add(o);
        if(Array.isArray(o)){ for(const v of o){ const n=find(v,seen); if(Number.isFinite(n)) return n; } }
        else { for(const k of Object.keys(o)){ if(k.toLowerCase().includes('value')||k.toLowerCase().includes('raw')){ const n=find(o[k],seen); if(Number.isFinite(n)) return n; } }
               for(const k of Object.keys(o)){ const n=find(o[k],seen); if(Number.isFinite(n)) return n; } }
        return null;
      };
      try{ if(b && typeof b.getData==='function'){ const d=b.getData(); const n=find(d); if(Number.isFinite(n)) return n; } }catch(e){}
      if(b){ for(const k of ['data','dataset','values','rows','resultSet']){ if(b[k]!=null){ const n=find(b[k]); if(Number.isFinite(n)) return n; } } }
      if(Number.isFinite(Number(this.value))) return Number(this.value);
      return NaN;
    }

    _render(){
      const w=this._w, h=this._h, cx=w/2, cy=h*0.92;
      const stops=this._stops(); // 0..1
      const scaleMin=0, scaleMax=1;    // Force 0..1
      const inputMin=0, inputMax=1;    // Force 0..1
      const startDeg=-180, endDeg=0;   // Semicircle
      const bandColors=Array.isArray(this.bandColors)&&this.bandColors.length?this.bandColors:["#256f3a","#87c122","#f9e339","#ea9617","#ea1e32"]; // green→red

      const toRad=d=>(d*Math.PI)/180;
      const toAngle=v=> toRad(startDeg) + ((v-scaleMin)/(scaleMax-scaleMin))*(toRad(endDeg)-toRad(startDeg));
      const pathArc=(R,a1,a2)=>{
        const large=(a2-a1)>Math.PI?1:0;
        const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
        const x2=cx+R*Math.cos(a2), y2=cy+R*Math.sin(a2);
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
      };

      const r=Math.min(w,h*2)*0.46;
      const strokeW=24;
      const innerStrokeW=Math.max(6, strokeW*0.55);
      const innerR=r-(strokeW*0.25);

      while(this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

      // Bands (outer + inner darker)
      for(let i=0;i<stops.length-1;i++){
        const c=bandColors[Math.min(i,bandColors.length-1)];
        const a1=toAngle(stops[i]), a2=toAngle(stops[i+1]);
        const outer=document.createElementNS('http://www.w3.org/2000/svg','path');
        outer.setAttribute('d', pathArc(r,a1,a2));
        outer.setAttribute('stroke', c); outer.setAttribute('stroke-width', strokeW);
        outer.setAttribute('fill','none'); outer.setAttribute('opacity','0.96');
        this._svg.appendChild(outer);
        const inner=document.createElementNS('http://www.w3.org/2000/svg','path');
        inner.setAttribute('d', pathArc(innerR,a1,a2));
        inner.setAttribute('stroke', shade(c,-18)); inner.setAttribute('stroke-width', innerStrokeW);
        inner.setAttribute('fill','none'); inner.setAttribute('opacity','0.35');
        this._svg.appendChild(inner);
      }

      // Ticks at stops
      for(const s of stops){
        const a=toAngle(s), inn=r-strokeW*0.75, out=r+strokeW*0.05;
        const x1=cx+inn*Math.cos(a), y1=cy+inn*Math.sin(a);
        const x2=cx+out*Math.cos(a), y2=cy+out*Math.sin(a);
        const line=document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1',x1); line.setAttribute('y1',y1);
        line.setAttribute('x2',x2); line.setAttribute('y2',y2);
        line.setAttribute('stroke','#9ca3af'); line.setAttribute('stroke-width',Math.max(1.5, strokeW*0.06));
        this._svg.appendChild(line);
      }

      // Value from binding/property, clamped and snapped to stops
      let raw=this._extract(); if(!Number.isFinite(raw)) raw=inputMin;
      let scaled=remap(raw,inputMin,inputMax,scaleMin,scaleMax);
      scaled=clamp(scaled,scaleMin,scaleMax);
      // snap
      let nearest=stops[0], dist=Math.abs(scaled-nearest);
      for(let i=1;i<stops.length;i++){ const d=Math.abs(scaled-stops[i]); if(d<dist){ nearest=stops[i]; dist=d; } }
      scaled=nearest;

      // Needle (FORCED WHITE)
      const a=toAngle(scaled);
      const nx=cx+(r-strokeW*0.6)*Math.cos(a);
      const ny=cy+(r-strokeW*0.6)*Math.sin(a);
      const needle=document.createElementNS('http://www.w3.org/2000/svg','line');
      needle.setAttribute('x1',cx); needle.setAttribute('y1',cy);
      needle.setAttribute('x2',nx); needle.setAttribute('y2',ny);
      needle.setAttribute('stroke','#ffffff'); needle.setAttribute('stroke-linecap','round');
      needle.setAttribute('stroke-width', Math.max(3, strokeW*0.14));
      this._svg.appendChild(needle);

      // Knob: white fill + black ring
      const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
      ring.setAttribute('cx',cx); ring.setAttribute('cy',cy);
      ring.setAttribute('r', Math.max(10, strokeW*0.42));
      ring.setAttribute('fill','#ffffff'); ring.setAttribute('stroke','#000');
      ring.setAttribute('stroke-width', Math.max(2, strokeW*0.10));
      this._svg.appendChild(ring);

      const knob=document.createElementNS('http://www.w3.org/2000/svg','circle');
      knob.setAttribute('cx',cx); knob.setAttribute('cy',cy);
      knob.setAttribute('r', Math.max(6, strokeW*0.26));
      knob.setAttribute('fill','#ffffff');
      this._svg.appendChild(knob);

      // Risk label
      const labels=Array.isArray(this.riskLabels)&&this.riskLabels.length?this.riskLabels:["Low","Medium Low","Medium","Medium High","High"];
      const idx=stops.findIndex(s=>scaled<=s); const bucket=Math.max(1,idx);
      const label=labels[Math.min(bucket-1, labels.length-1)] || '';
      this._labelEl.textContent=label;
      this._labelEl.style.fontSize=Math.max(10, w*0.045)+'px';
    }
  }

  customElements.define('com-sap-sac-sample-echarts-gaugegrade', GaugeForce);
})();

   
         
     
       
      
