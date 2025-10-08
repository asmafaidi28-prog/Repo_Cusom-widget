/* Optimized ECharts Pie Chart (Orange–Grey Theme, Hide Zeros, Center KPI) */
(function () {
  class CustomPieSample extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; }
          .center-kpi {
            position:absolute; left:50%; top:50%;
            transform:translate(-50%,-50%);
            text-align:center; color:#333;
            font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif;
          }
          .center-kpi .value { font-size: 22px; font-weight:700; }
          .center-kpi .label { font-size: 11px; opacity:.7; }
        </style>
        <div id="root" style="width:100%; height:100%; position:relative;">
          <div id="centerKPI" class="center-kpi"></div>
        </div>
      `;
      this._root = this._shadowRoot.getElementById("root");
      this._centerKPI = this._shadowRoot.getElementById("centerKPI");
      this._props = {};
    }

    onCustomWidgetResize() {
      if (this._chart) this._chart.resize();
    }

    set myDataSource(dataBinding) {
      this._myDataSource = dataBinding;
      this.render();
    }

    async ensureECharts() {
      if (window.echarts) return;
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async render() {
      await this.ensureECharts();
      if (!this._myDataSource || this._myDataSource.state !== "success") return;

      const dim = this._myDataSource.metadata.feeds.dimensions.values[0];
      const mea = this._myDataSource.metadata.feeds.measures.values[0];

      // Prepare data and filter out zero/nulls
      let data = this._myDataSource.data
        .map((r) => ({ name: r[dim].label, value: r[mea].raw }))
        .filter((d) => d.value && d.value !== 0);

      if (!data.length) {
        this._root.innerHTML = "<div style='text-align:center;padding-top:40%;color:#888;'>No non-zero data</div>";
        return;
      }

      const total = data.reduce((sum, d) => sum + d.value, 0);

      // Update center KPI
      this._centerKPI.innerHTML = `
        <div class="value">${total.toLocaleString()}</div>
        <div class="label">Total</div>
      `;

      const palette = ["#FF8C00", "#FFA733", "#FFD580", "#B0B0B0", "#808080", "#999999"];

      if (!this._chart) this._chart = echarts.init(this._root);

      const option = {
        tooltip: {
          trigger: "item",
          formatter: (p) =>
            `<strong>${p.name}</strong><br/>${p.value.toLocaleString()} (${p.percent.toFixed(2)}%)`,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "#ccc",
          borderWidth: 1,
          textStyle: { color: "#333" },
          extraCssText: "box-shadow:0 2px 6px rgba(0,0,0,0.15);"
        },
        series: [
          {
            name: "Pie",
            type: "pie",
            radius: ["35%", "75%"],
            center: ["50%", "50%"],
            roseType: "radius",
            avoidLabelOverlap: true,
            data,
            color: palette,
            label: {
              show: true,
              formatter: "{b}",
              color: "#4A4A4A",
              fontSize: 12,
              fontWeight: "500",
              alignTo: "edge",
              bleedMargin: 5
            },
            labelLine: {
              show: true,
              smooth: 0.2,
              length: 15,
              length2: 25,
              lineStyle: { color: "#999", width: 1.5 }
            },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              shadowBlur: 10,
              shadowOffsetY: 2,
              shadowColor: "rgba(0,0,0,0.15)"
            },
            emphasis: {
              scale: true,
              scaleSize: 6,
              itemStyle: {
                shadowBlur: 20,
                shadowColor: "rgba(0,0,0,0.35)"
              }
            },
            animationType: "scale",
            animationEasing: "elasticOut",
            animationDelay: (idx) => Math.random() * 200
          }
        ]
      };

      this._chart.setOption(option);
      this._chart.resize();
    }
  }

  customElements.define("com-sap-sample-echarts-custom_pie_chart", CustomPieSample);
})();
