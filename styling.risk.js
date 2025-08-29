
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<style>
    :host {
      --sac-gauge-tick: #c4a062;
    }
  </style>`;
  class GaugeStyling extends HTMLElement {
    constructor() { super(); const s = this.attachShadow({ mode: 'open' }); s.appendChild(tpl.content.cloneNode(true)); }
  }
  customElements.define('com-sap-sac-sample-echarts-gaugegrade-styling', GaugeStyling);
})();
