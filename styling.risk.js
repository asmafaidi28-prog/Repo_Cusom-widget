
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<style>
    :host {
        sac-gauge-tick: #6b7280;
        sac-gauge-label: var(--sapTextColor, #111);
        sac-gauge-needle: #FFFFFF;
        sac-gauge-knob: #111827;
    }
  </style>`;
  class GaugeStyling extends HTMLElement {
    constructor() { super(); const s = this.attachShadow({ mode: 'open' }); s.appendChild(tpl.content.cloneNode(true)); }
  }
  customElements.define('com-sap-sac-sample-echarts-gaugegrade-styling', GaugeStyling);
})();
