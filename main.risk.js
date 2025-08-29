
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
      #center {
        position: absolute; left: 0; right: 0; bottom: 10%;
        text-align: center; pointer-events: none;
      }
      #value { font-weight: 700; line-height: 1.1; }
      #label { opacity: .85; line-height: 1.1; }
    </style>
    <div id="root">
      <svg id="gauge" preserveAspectRatio="xMidYMid meet" part="gauge"></svg>
      <div id="center" part="center">
        <div id="value" part="value"></div>
        <div id="label" part="label"></div>
      </div>
    </div>
  `;

  const P = (el, name, def) => (el[name] !== undefined ? el[name] : def);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const remap = (v, a1, a2, b1, b2) => b1 + (clamp(v, a1, a2) - a1) * (b2 - b1) / (a2 - a1 || 1);

  function shade(hex, pct) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    let r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
    r = Math.round(Math.max(0, Math.min(255, r * (1 + pct/100))));
    g = Math.round(Math.max(0, Math.min(255, g * (1 + pct/100))));
    b = Math.round(Math.max(0, Math.min(255, b * (1 + pct/100))));
    const toHex = n => n.toString(16).padStart(2,'0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  class RiskGauge extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._svg = this._shadow.getElementById('gauge');
      this._valueEl = this._shadow.getElementById('value');
      this._labelEl = this._shadow.getElementById('label');
      this._w = 300; this._h = 200;
    }

    connectedCallback() { this._resize(); this._render(); }
    onCustomWidgetResize() { this._resize(); this._render(); }
    onCustomWidgetBeforeUpdate() {}
    onCustomWidgetAfterUpdate() { this._render(); }

    _resize() {
      const r = this.getBoundingClientRect();
      this._w = Math.max(220, r.width || 300);
      this._h = Math.max(160, r.height || 200);
      this._svg.setAttribute('viewBox', `0 0 ${this._w} ${this._h}`);
    }

    _getStops() {
      // For 0..5 scale with 6 ticks: [0,1,2,3,4,5]
      let stops = this.stops;
      if (!Array.isArray(stops)) stops = [0, 1, 2, 3, 4, 5];
      stops = stops.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
      stops = [...new Set(stops)];
      if (stops.length < 2) stops = [0,5];
      return stops;
    }

    _extractValue() {
      const b = this.dataBinding;
      const firstNumber = (obj, visited=new Set()) => {
        if (obj == null) return null;
        if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
        if (typeof obj !== 'object' || visited.has(obj)) return null;
        visited.add(obj);
        if (Array.isArray(obj)) {
          for (const v of obj) { const n = firstNumber(v, visited); if (Number.isFinite(n)) return n; }
        } else {
          for (const k of Object.keys(obj)) {
            if (k.toLowerCase().includes('value') || k.toLowerCase().includes('raw')) {
              const n = firstNumber(obj[k], visited); if (Number.isFinite(n)) return n;
            }
          }
          for (const k of Object.keys(obj)) { const n = firstNumber(obj[k], visited); if (Number.isFinite(n)) return n; }
        }
        return null;
      };
      try {
        if (b && typeof b.getData === 'function') {
          const d = b.getData();
          const n = firstNumber(d);
          if (Number.isFinite(n)) return n;
        }
      } catch (e) {}
      if (b) {
        for (const k of ['data','dataset','values','rows','resultSet']) {
          if (b[k]!=null) { const n = firstNumber(b[k]); if (Number.isFinite(n)) return n; }
        }
      }
      if (Number.isFinite(Number(this.value))) return Number(this.value);
      return NaN;
    }

    _render() {
      const w = this._w, h = this._h;
      const cx = w/2, cy = h*0.92;

      // Properties / defaults
      const stops = this._getStops(); // [0,1,2,3,4,5]
      const scaleMin = Number(P(this,'scaleMin',0));
      const scaleMax = Number(P(this,'scaleMax',5));
      const inputMin = Number(P(this,'inputMin',0));
      const inputMax = Number(P(this,'inputMax',5));

      const startDeg = Number(P(this,'startAngle',-180));
      const endDeg   = Number(P(this,'endAngle',0));
      const reverse  = !!P(this,'reverse', false);

      const bandColors = Array.isArray(this.bandColors) && this.bandColors.length
        ? this.bandColors
        : ['#256f3a', '#87c122', '#f9e339', '#ea9617', '#ea1e32']; // green → red
      const bandThickness = Math.max(10, Number(P(this,'bandThickness', 24)));
      const innerOpacity = Number(P(this,'innerBandOpacity', 0.35));
      const showTicks = !!P(this,'showTicks', true);
      const showLabels = !!P(this,'showLabels', true);
      const tickColor = String(P(this,'tickColor', '#9ca3af'));
      const showValue = !!P(this,'showValue', false); // default hidden as requested earlier
      const showRiskLabel = !!P(this,'showRiskLabel', true);
      const snapToStops = !!P(this,'snapToStops', true);
      const needleColor = String(P(this,'needleColor', '#ffffff')); // white needle
      const valueFS = Number(P(this,'valueFontScale', 0.10));
      const labelFS = Number(P(this,'labelFontScale', 0.045));
      const decimals = Number(P(this,'decimals', 0));

      const toRad = d => (d * Math.PI) / 180;
      const toAngle = v => toRad(startDeg) + ((v - scaleMin)/(scaleMax - scaleMin)) * (toRad(endDeg) - toRad(startDeg));
      const pathArc = (R, a1, a2) => {
        const large = (a2 - a1) > Math.PI ? 1 : 0;
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
      };

      const r = Math.min(w, h*2) * 0.46;
      const strokeW = bandThickness;
      const innerStrokeW = Math.max(6, strokeW * 0.55);
      const innerR = r - (strokeW*0.25);

      // Clear
      while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

      // Draw bands
      for (let i = 0; i < stops.length-1; i++) {
        let c = bandColors[Math.min(i, bandColors.length-1)];
        if (reverse) c = bandColors[Math.min(stops.length-2-i, bandColors.length-1)];
        const a1 = toAngle(stops[i]);
        const a2 = toAngle(stops[i+1]);

        const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        outer.setAttribute('d', pathArc(r, a1, a2));
        outer.setAttribute('stroke', c);
        outer.setAttribute('stroke-width', strokeW);
        outer.setAttribute('fill','none');
        outer.setAttribute('opacity','0.96');
        this._svg.appendChild(outer);

        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        inner.setAttribute('d', pathArc(innerR, a1, a2));
        inner.setAttribute('stroke', shade(c, -18));
        inner.setAttribute('stroke-width', innerStrokeW);
        inner.setAttribute('fill','none');
        inner.setAttribute('opacity', String(innerOpacity));
        this._svg.appendChild(inner);
      }

      // Ticks + labels
      if (showTicks) {
        for (const s of stops) {
          const a = toAngle(s);
          const inner = r - strokeW * 0.75;
          const outer = r + strokeW * 0.05;
          const x1 = cx + inner * Math.cos(a), y1 = cy + inner * Math.sin(a);
          const x2 = cx + outer * Math.cos(a), y2 = cy + outer * Math.sin(a);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1); line.setAttribute('y1', y1);
          line.setAttribute('x2', x2); line.setAttribute('y2', y2);
          line.setAttribute('stroke', tickColor);
          line.setAttribute('stroke-width', Math.max(1.5, strokeW * 0.06));
          this._svg.appendChild(line);

          if (showLabels) {
            const lx = cx + (r + strokeW * 0.45) * Math.cos(a);
            const ly = cy + (r + strokeW * 0.45) * Math.sin(a);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = s;
            text.setAttribute('x', lx);
            text.setAttribute('y', ly);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('alignment-baseline', 'middle');
            text.setAttribute('font-size', Math.max(10, w * labelFS));
            text.setAttribute('fill', 'currentColor');
            this._svg.appendChild(text);
          }
        }
      }

      // Value from binding/property
      let raw = this._extractValue();
      if (!Number.isFinite(raw)) raw = inputMin;
      let v = remap(raw, inputMin, inputMax, scaleMin, scaleMax);
      v = clamp(v, scaleMin, scaleMax);

      // Snap to nearest stop if requested
      if (snapToStops) {
        let best = stops[0], bestDist = Math.abs(v - best);
        for (let i=1; i<stops.length; i++) {
          const d = Math.abs(v - stops[i]);
          if (d < bestDist) { best = stops[i]; bestDist = d; }
        }
        v = best;
      }

      // Needle
      const a = toAngle(v);
      const nx = cx + (r - strokeW * 0.6) * Math.cos(a);
      const ny = cy + (r - strokeW * 0.6) * Math.sin(a);
      const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      needle.setAttribute('x1', cx); needle.setAttribute('y1', cy);
      needle.setAttribute('x2', nx); needle.setAttribute('y2', ny);
      needle.setAttribute('stroke', needleColor);
      needle.setAttribute('stroke-linecap', 'round');
      needle.setAttribute('stroke-width', Math.max(3, strokeW * 0.14));
      this._svg.appendChild(needle);

      // Knob (white ring + white center with dark outline)
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
      ring.setAttribute('r', Math.max(10, strokeW * 0.42));
      ring.setAttribute('fill', '#fff');
      ring.setAttribute('stroke', needleColor);
      ring.setAttribute('stroke-width', Math.max(2, strokeW * 0.10));
      this._svg.appendChild(ring);

      const knob = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      knob.setAttribute('cx', cx); knob.setAttribute('cy', cy);
      knob.setAttribute('r', Math.max(6, strokeW * 0.26));
      knob.setAttribute('fill', needleColor);
      this._svg.appendChild(knob);

      // Center texts
      if (showValue) {
        this._valueEl.textContent = String(v.toFixed(decimals));
        this._valueEl.style.display = '';
        this._valueEl.style.fontSize = Math.max(16, w * valueFS) + 'px';
      } else {
        this._valueEl.textContent = '';
        this._valueEl.style.display = 'none';
      }

      // Risk label
      const riskLabels = Array.isArray(this.riskLabels) && this.riskLabels.length
        ? this.riskLabels
        : ['Low','Medium Low','Medium','Medium High','High'];
      const idx = stops.findIndex(s => v <= s);
      const bucket = Math.max(1, idx);
      const label = riskLabels[Math.min(bucket-1, riskLabels.length-1)] || '';
      if (showRiskLabel) {
        this._labelEl.textContent = label;
        this._labelEl.style.display = '';
        this._labelEl.style.fontSize = Math.max(10, w * labelFS) + 'px';
      } else {
        this._labelEl.textContent = '';
        this._labelEl.style.display = 'none';
      }
    }
  }

  customElements.define('com-sap-sac-sample-echarts-gaugegrade', RiskGauge);
})();
