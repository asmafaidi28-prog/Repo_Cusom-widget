
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        color: var(--sapTextColor, #111);
        font-family: var(--sapFontFamily, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol');
      }
      #root { position: relative; width: 100%; height: 100%; }
      svg { width: 100%; height: 100%; display: block; }
      #center {
        position: absolute;
        left: 0; right: 0;
        bottom: 12%;
        text-align: center;
        pointer-events: none;
      }
      #value {
        font-weight: 700;
        line-height: 1.1;
      }
      #label {
        opacity: 0.8;
        line-height: 1.1;
      }
    </style>
    <div id="root">
      <svg id="gauge" preserveAspectRatio="xMidYMid meet" part="gauge"></svg>
      <div id="center" part="center">
        <div id="value" part="value"></div>
        <div id="label" part="label"></div>
      </div>
    </div>
  `;

  class GaugeWidget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._svg = this._shadow.getElementById('gauge');
      this._valueEl = this._shadow.getElementById('value');
      this._labelEl = this._shadow.getElementById('label');
      this._w = 300;
      this._h = 200;
    }

    connectedCallback() {
      this._resizeFrame();
      this._render();
    }

    onCustomWidgetResize(width, height) {
      this._resizeFrame();
      this._render();
    }

    onCustomWidgetBeforeUpdate(changedProps) {}
    onCustomWidgetAfterUpdate(changedProps) {
      this._render();
    }

    _resizeFrame() {
      const rect = this.getBoundingClientRect();
      const w = Math.max(160, rect.width || Number(this.width) || 300);
      const h = Math.max(120, rect.height || Number(this.height) || 200);
      this._w = w; this._h = h;
      this._svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    _getStops() {
      // Manifest property 'stops' is number[]; fall back to defaults.
      let s = this.stops;
      if (!Array.isArray(s) && s && typeof s === 'object' && Array.isArray(s.default)) s = s.default;
      if (!Array.isArray(s) || s.length < 2) s = [0, 25, 50, 75, 100];
      // Ensure ascending unique numbers
      s = s.map(Number).filter(v => Number.isFinite(v)).sort((a,b)=>a-b);
      s = [...new Set(s)];
      if (s.length < 2) s = [0, 100];
      return s;
    }

    _extractValueFromBinding() {
      const b = this.dataBinding;
      if (!b) return null;

      // Try common shapes
      try {
        if (typeof b.getData === 'function') {
          const d = b.getData();
          const n = this._findFirstNumber(d);
          if (Number.isFinite(n)) return n;
        }
      } catch (e) {}

      for (const key of ['data', 'dataset', 'values', 'rows', 'resultSet']) {
        if (b[key] != null) {
          const n = this._findFirstNumber(b[key]);
          if (Number.isFinite(n)) return n;
        }
      }
      return null;
    }

    _findFirstNumber(obj, visited = new Set()) {
      if (obj == null) return null;
      if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
      if (visited.has(obj)) return null;
      if (typeof obj === 'object') {
        visited.add(obj);
        if (Array.isArray(obj)) {
          for (const v of obj) {
            const n = this._findFirstNumber(v, visited);
            if (Number.isFinite(n)) return n;
          }
        } else {
          // Prioritize numeric fields named 'value' or 'raw'.
          for (const k of Object.keys(obj)) {
            if (k.toLowerCase().includes('value') || k.toLowerCase().includes('raw')) {
              const n = this._findFirstNumber(obj[k], visited);
              if (Number.isFinite(n)) return n;
            }
          }
          for (const k of Object.keys(obj)) {
            const n = this._findFirstNumber(obj[k], visited);
            if (Number.isFinite(n)) return n;
          }
        }
      }
      return null;
    }

    _currentValue() {
      // Priority: data binding -> 'value' property -> NaN
      const vb = this._extractValueFromBinding();
      if (Number.isFinite(vb)) return vb;
      if (Number.isFinite(Number(this.value))) return Number(this.value);
      return NaN;
    }

    _render() {
      const w = this._w, h = this._h;
      const cx = w / 2, cy = h * 0.9;
      const r = Math.min(w, h * 2) * 0.45;
      const strokeW = Math.max(10, r * 0.16);

      const stops = this._getStops();
      const min = stops[0], max = stops[stops.length - 1];
      const reverse = !!this.reverse;

      // Clear SVG
      while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);

      // Helpers
      const toAngle = (v) => (-Math.PI) + ((v - min) / (max - min)) * Math.PI;
      const arcPath = (a1, a2) => {
        const large = (a2 - a1) > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
      };

      // Colors (green → yellow → orange → red → purple)
      const palette = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8e44ad'];

      // Segments
      for (let i = 0; i < stops.length - 1; i++) {
        let c = palette[Math.min(i, palette.length - 1)];
        if (reverse) c = palette[Math.min(stops.length - 2 - i, palette.length - 1)];
        const a1 = toAngle(stops[i]);
        const a2 = toAngle(stops[i + 1]);
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        seg.setAttribute('d', arcPath(a1, a2));
        seg.setAttribute('stroke', c);
        seg.setAttribute('stroke-width', strokeW);
        seg.setAttribute('fill', 'none');
        seg.setAttribute('opacity', '0.95');
        this._svg.appendChild(seg);
      }

      // Ticks + labels on stop values
      for (const s of stops) {
        const a = toAngle(s);
        const inner = r - strokeW * 0.55;
        const outer = r + strokeW * 0.10;
        const x1 = cx + inner * Math.cos(a), y1 = cy + inner * Math.sin(a);
        const x2 = cx + outer * Math.cos(a), y2 = cy + outer * Math.sin(a);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'var(--sac-gauge-tick, #6b7280)');
        line.setAttribute('stroke-width', Math.max(1.5, strokeW * 0.08));
        this._svg.appendChild(line);

        const lx = cx + (r + strokeW * 0.45) * Math.cos(a);
        const ly = cy + (r + strokeW * 0.45) * Math.sin(a);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = s;
        text.setAttribute('x', lx);
        text.setAttribute('y', ly);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('alignment-baseline', 'middle');
        text.setAttribute('font-size', Math.max(10, w * 0.03));
        text.setAttribute('fill', 'var(--sac-gauge-label, currentColor)');
        this._svg.appendChild(text);
      }

      // Value + needle
      let v = this._currentValue();
      if (!Number.isFinite(v)) v = min; // default when no data
      v = Math.max(min, Math.min(max, v));
      const a = toAngle(v);
      const nx = cx + (r - strokeW * 0.6) * Math.cos(a);
      const ny = cy + (r - strokeW * 0.6) * Math.sin(a);

      const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      needle.setAttribute('x1', cx); needle.setAttribute('y1', cy);
      needle.setAttribute('x2', nx); needle.setAttribute('y2', ny);
      needle.setAttribute('stroke', 'var(--sac-gauge-needle, #111827)');
      needle.setAttribute('stroke-linecap', 'round');
      needle.setAttribute('stroke-width', Math.max(2.5, strokeW * 0.12));
      this._svg.appendChild(needle);

      const knob = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      knob.setAttribute('cx', cx); knob.setAttribute('cy', cy);
      knob.setAttribute('r', Math.max(6, strokeW * 0.25));
      knob.setAttribute('fill', 'var(--sac-gauge-knob, #111827)');
      this._svg.appendChild(knob);

      // Center text
      const valEl = this._valueEl;
      valEl.textContent = String(Math.round(v));
      valEl.style.fontSize = Math.max(16, w * 0.09) + 'px';

      const idx = stops.findIndex(s => v <= s);
      const level = Math.max(1, idx);
      const labels = ['Low', 'Moderate', 'High', 'Critical', 'Severe'];
      const risk = labels[Math.min(level - 1, labels.length - 1)];
      const labelEl = this._labelEl;
      labelEl.textContent = `Risk: ${risk}`;
      labelEl.style.fontSize = Math.max(10, w * 0.04) + 'px';
    }
  }

  customElements.define('com-sap-sac-sample-echarts-gaugegrade', GaugeWidget);
})();
