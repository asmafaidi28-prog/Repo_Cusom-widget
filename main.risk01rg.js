
/* main.risk.js — clean gauge with Arabic label only.
   Color intervals (0–1 green, 1–2 light-green, 2–3 yellow, 3–4 orange, 4–5 red).
   Numeric value removed. Needle + knob forced white. Subtle track & animation. */
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        color: var(--sapTextColor, #111);
        font-family: var(--sapFontFamily, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica, Arial);
      }
      #root { position: relative; width: 100%; height: 100%; }
      svg { width: 100%; height: 100%; display: block; }
      /* Label only (no numeric value) */
      #label {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        text-align: center;
        pointer-events: none;
        line-height: 1.1;
        font-weight: 700;
        letter-spacing: .3px;
        padding-bottom: 4px;
      }
    </style>
    <div id="root">
      <svg id="gauge" preserveAspectRatio="xMidYMid meet" part="gauge"></svg>
      <div id="label" part="label"></div>
    </div>
  `;

  // helpers
  const P = (el, n, d) => (el[n] !== undefined ? el[n] : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const shade = (hex, pct) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if (!m) return hex;
    let r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
    const H = n => n.toString(16).padStart(2,'0');
    r = Math.round(clamp(r*(1+pct/100),0,255));
    g = Math.round(clamp(g*(1+pct/100),0,255));
    b = Math.round(clamp(b*(1+pct/100),0,255));
    return `#${H(r)}${H(g)}${H(b)}`;
  };

  class RiskGauge extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._svg = this._shadow.getElementById('gauge');
      this._labelEl = this._shadow.getElementById('label');
      this._w = 300; this._h = 200;
      this._prevValue = null; // for tween
    }

    connectedCallback() { this._resize(); this._render(true); }
    onCustomWidgetResize() { this._resize(); this._render(); }
    onCustomWidgetAfterUpdate() { this._render(); }

    _resize() {
      const r = this.getBoundingClientRect();
      this._w = Math.max(240, r.width || 300);
      this._h = Math.max(180, r.height || 200);
      this._svg.setAttribute('viewBox', `0 0 ${this._w} ${this._h}`);
    }

    _stops() {
      // Default 0..5; works with 0..1 stops too if provided in manifest
      let s = this.stops;
      if (!Array.isArray(s)) s = [0,1,2,3,4,5];
      s = [...new Set(s.map(Number).filter(Number.isFinite).sort((a,b)=>a-b))];
      return s.length >= 2 ? s : [0,5];
    }

    _extract() {
      const b = this.dataBinding;
      const first = (o, seen=new Set()) => {
        if (o == null) return null;
        if (typeof o === 'number' && Number.isFinite(o)) return o;
        if (typeof o !== 'object' || seen.has(o)) return null;
        seen.add(o);
        if (Array.isArray(o)) { for (const v of o) { const n = first(v, seen); if (Number.isFinite(n)) return n; } }
        else {
          for (const k of Object.keys(o)) {
            if (k.toLowerCase().includes('value') || k.toLowerCase().includes('raw')) {
              const n = first(o[k], seen); if (Number.isFinite(n)) return n;
            }
          }
          for (const k of Object.keys(o)) { const n = first(o[k], seen); if (Number.isFinite(n)) return n; }
        }
        return null;
      };
      try { if (b && typeof b.getData === 'function') { const d = b.getData(); const n = first(d); if (Number.isFinite(n)) return n; } } catch(e){}
      if (b) { for (const k of ['data','dataset','values','rows','resultSet']) { if (b[k] != null) { const n = first(b[k]); if (Number.isFinite(n)) return n; } } }
      if (Number.isFinite(Number(this.value))) return Number(this.value);
      return NaN;
    }

    _render(first = false) {
      const w = this._w, h = this._h, cx = w/2, cy = h*0.92;
      const stops = this._stops();

      // scale (works for 0..5 default or 0..1 if set in manifest)
      const scaleMin = Number(P(this,'scaleMin', stops[0]));
      const scaleMax = Number(P(this,'scaleMax', stops[stops.length-1]));
      const inputMin = Number(P(this,'inputMin', scaleMin));
      const inputMax = Number(P(this,'inputMax', scaleMax));

      const startDeg = Number(P(this,'startAngle', -180));
      const endDeg   = Number(P(this,'endAngle', 0));
      const reverse  = !!P(this,'reverse', false);

      const bandColors = Array.isArray(this.bandColors) && this.bandColors.length
        ? this.bandColors
        : ['#256f3a', '#87c122', '#f9e339', '#ea9617', '#ea1e32']; // green→red

      const r  = Math.min(w, h*2)*0.46;
      const strokeW = Math.max(12, Number(P(this,'bandThickness', 26)));
      const innerStrokeW = Math.max(6, strokeW * 0.55);
      const innerR = r - (strokeW*0.25);

      const toRad = d => (d*Math.PI)/180;
      const toAngle = v => toRad(startDeg) + ((v - scaleMin)/(scaleMax - scaleMin)) * (toRad(endDeg) - toRad(startDeg));
      const arc = (R, a1, a2) => {
        const large = (a2 - a1) > Math.PI ? 1 : 0;
        const x1 = cx + R*Math.cos(a1), y1 = cy + R*Math.sin(a1);
        const x2 = cx + R*Math.cos(a2), y2 = cy + R*Math.sin(a2);
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
      };

      // prepare face
      while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

      // soft track behind segments (very light grey)
      const track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      track.setAttribute('d', arc(r, toRad(startDeg), toRad(endDeg)));
      track.setAttribute('stroke', 'rgba(17,24,39,0.08)'); // slate-900 @ 8%
      track.setAttribute('stroke-width', strokeW);
      track.setAttribute('stroke-linecap', 'round');
      track.setAttribute('fill', 'none');
      this._svg.appendChild(track);

      // segments with rounded caps + inner shade
      for (let i = 0; i < stops.length - 1; i++) {
        let c = bandColors[Math.min(i, bandColors.length - 1)];
        if (reverse) c = bandColors[Math.min(stops.length - 2 - i, bandColors.length - 1)];
        const a1 = toAngle(stops[i]), a2 = toAngle(stops[i+1]);

        const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        outer.setAttribute('d', arc(r, a1, a2));
        outer.setAttribute('stroke', c);
        outer.setAttribute('stroke-width', strokeW);
        outer.setAttribute('stroke-linecap', 'butt');   // crisp band junctions
        outer.setAttribute('fill', 'none');
        outer.setAttribute('opacity', '0.98');
        this._svg.appendChild(outer);

        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        inner.setAttribute('d', arc(innerR, a1, a2));
        inner.setAttribute('stroke', shade(c, -18));
        inner.setAttribute('stroke-width', innerStrokeW);
        inner.setAttribute('stroke-linecap', 'butt');
        inner.setAttribute('fill', 'none');
        inner.setAttribute('opacity', '0.35');
        this._svg.appendChild(inner);
      }

      // ----- compute value -----
      let raw = this._extract();
      if (!Number.isFinite(raw)) raw = inputMin;
      let target = clamp(
        (raw - inputMin) / (inputMax - inputMin || 1) * (scaleMax - scaleMin) + scaleMin,
        scaleMin, scaleMax
      );

      // animate needle from previous to new
      const start = (this._prevValue == null || first) ? target : this._prevValue;
      const duration = 420; // ms
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / duration, 0, 1);
        const v = lerp(start, target, t);

        // redraw needle/center only (leave bands)
        this._drawNeedle(cx, cy, r, strokeW, toAngle(v));
        this._paintLabel(v, scaleMin, scaleMax, w);

        if (t < 1) requestAnimationFrame(step);
        else this._prevValue = target;
      };
      requestAnimationFrame(step);
    }

    _drawNeedle(cx, cy, r, strokeW, angleRad) {
      // remove old needle group if exists
      let old = this._svg.querySelector('g[data-needle]');
      if (old) old.remove();

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-needle', '1');

      // needle line (white)
      const nx = cx + (r - strokeW * 0.6) * Math.cos(angleRad);
      const ny = cy + (r - strokeW * 0.6) * Math.sin(angleRad);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', nx); line.setAttribute('y2', ny);
      line.setAttribute('stroke', '#ffffff');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('stroke-width', Math.max(3, strokeW * 0.14));
      // tiny soft glow
      line.setAttribute('filter', 'url(#none)');
      g.appendChild(line);

      // center ring + knob (both white)
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
      ring.setAttribute('r', Math.max(10, strokeW * 0.42));
      ring.setAttribute('fill', '#ffffff');
      ring.setAttribute('stroke', '#ffffff');
      ring.setAttribute('stroke-width', Math.max(2, strokeW * 0.10));
      g.appendChild(ring);

      const knob = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      knob.setAttribute('cx', cx); knob.setAttribute('cy', cy);
      knob.setAttribute('r', Math.max(6, strokeW * 0.26));
      knob.setAttribute('fill', '#ffffff');
      g.appendChild(knob);

      this._svg.appendChild(g);
    }

    _paintLabel(v, scaleMin, scaleMax, w) {
      // normalize to 0..5 for interval coloring even if actual scale is 0..1
      const v05 = (v - scaleMin) / (scaleMax - scaleMin || 1) * 5;
      let color = '#ea1e32', text = 'منخفض';
      if      (v05 >= 0 && v05 < 1) { color = '#ea1e32'; text = 'منخفض'; }
      else if (v05 >= 1 && v05 < 2) { color = '#ea9617'; text = 'منخفض متوسط'; }
      else if (v05 >= 2 && v05 < 3) { color = '#f9e339'; text = 'متوسط'; }
      else if (v05 >= 3 && v05 < 4) { color = '#87c122'; text = 'مرتفع متوسط'; }
      else                          { color = '#256f3a'; text = 'مرتفع'; }

      this._labelEl.textContent = text;
      this._labelEl.style.color = color;
      this._labelEl.style.fontSize = Math.min(Math.max(14, w * 0.07), 28) + 'px';
    }
  }

  customElements.define('com-sap-sac-sample-echarts-gaugegrade01rg', RiskGauge);
})();
