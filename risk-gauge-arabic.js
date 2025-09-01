
(function () {
  const template = document.createElement('template');
  template.innerHTML = `<div id="root" style="width:100%;height:100%;"></div>`;

  const STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const COLORS = ["#256f3a", "#87c122", "#f9e339", "#ea9617", "#ea1e32"];
  const AR_LABELS = ["منخفض", "منخفض-متوسط", "متوسط", "متوسط-مرتفع", "مرتفع"];

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function toRad(d){ return (Math.PI/180) * d; }
  function arcPath(cx, cy, r, startDeg, endDeg){
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    const sx = cx + r * Math.cos(toRad(startDeg));
    const sy = cy + r * Math.sin(toRad(startDeg));
    const ex = cx + r * Math.cos(toRad(endDeg));
    const ey = cy + r * Math.sin(toRad(endDeg));
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  }
  function bandIndex(v){
    for (let i = 0; i < STOPS.length - 1; i++){
      if (v >= STOPS[i] && v <= STOPS[i+1]) return i;
    }
    return STOPS.length - 2;
  }

  class RiskGaugeArabic extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(template.content.cloneNode(true));
      this._root = this._shadow.getElementById('root');
      this._value = 0.5;
    }

    connectedCallback(){ this._render(); }
    onCustomWidgetBeforeUpdate(changed){ if ("value" in changed) this._value = changed.value; }
    onCustomWidgetAfterUpdate(changed){ this._render(); }

    _render(){
      const v = clamp01(this._value ?? 0);
      const idx = bandIndex(v);
      const label = AR_LABELS[idx];
      const labelColor = COLORS[idx];

      const w = this.clientWidth || 300;
      const h = this.clientHeight || 180;
      const cx = w/2;
      const cy = h*0.9;       // push center down so label fits under the pivot
      const rOuter = Math.min(w, h*2) * 0.45;
      const rInner = rOuter - Math.max(10, rOuter*0.18); // band thickness ~18%

      // needle angle: -180 (v=0) to 0 (v=1)
      const ang = -180 + v*180;
      const nx = cx + rOuter * Math.cos(toRad(ang));
      const ny = cy + rOuter * Math.sin(toRad(ang));

      // Build SVG bands (five segments across the semicircle)
      let bands = "";
      for (let i = 0; i < COLORS.length; i++){
        const start = -180 + (STOPS[i] * 180);
        const end   = -180 + (STOPS[i+1] * 180);
        // outer and inner arcs to form a ring segment
        const pathOuter = arcPath(cx, cy, rOuter, start, end);
        const pathInner = arcPath(cx, cy, rInner, end, start); // reversed to close shape
        bands += `<path d="${pathOuter} ${pathInner} Z" fill="${COLORS[i]}" opacity="1"></path>`;
      }

      // needle + pivot + label (under pivot circle, fully visible)
      const pivotR = Math.max(6, rOuter*0.06);
      const fontSize = Math.max(12, Math.round(rOuter*0.16));
      const labelY = cy + pivotR + fontSize;  // directly under the circle
      const svg = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="background:transparent">
          <g>
            ${bands}
            <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#ffffff" stroke-width="${Math.max(2, rOuter*0.02)}" stroke-linecap="round"></line>
            <circle cx="${cx}" cy="${cy}" r="${pivotR}" fill="#ffffff"></circle>
            <text x="${cx}" y="${labelY}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle"
                  style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif;" fill="${labelColor}">${label}</text>
          </g>
        </svg>`;

      this._root.innerHTML = svg;
    }
  }

  customElements.define('com-sapient-risk-gauge-ar01', RiskGaugeArabic);
})();
