/* Optimized SAP ECharts Pie Chart – Orange–Grey Theme, Fast Refresh, Hide Zero Values, Center KPI */
(function () {
  class CustomPieSample extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.innerHTML = `
        <style>
          :host { display:block; width:100%; height:100%; }
          .center-kpi {
            position:absolute; left:50%; top:50%;
            transform:translate(-50%,-50%);
            text-align:center; color:#333;
            font-family:"72","Helvetica Neue",Helvetica,Arial,sans-serif;
            pointer-events:none;
          }
          .center-kpi .value { font-size:22px; font-weight:700; }
          .center-kpi .label { font-size:11px; opacity:.7; }
        </style>
        <div id="root" style="width:100%;height:100%;position:relative;">
          <div id="centerKPI" class="center-kpi"></div>
        </div>
      `;
      this._root = this._shadowRoot.getElementById("root");
      this._centerKPI = this._shadowRoot.getElementById("centerKPI");
      this._props = {};
      this._chart = null;
      this._chartLoaded = false;
      this._lastDataKey = ""; // cache to detect redundant re-renders
    }

    onCustomWidgetResize() {
      if (this._chart) this._chart.resize();
    }

    set myDataSource(binding) {
      this._myDataSource = binding;
      this.render();
    }

    // --- load ECharts library once globally
    async ensureECharts() {
      if (window.echarts) return;
      if (this._chartLoaded) return;
      this._chartLoaded = true;
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async render() {
      await this.ensureECharts();
      if (!this._myDataSource || this._myDataSource.state !== "success") return;

      // --- Extract dimension & measure
      const dim = this._myDataSource.metadata.feeds.dimensions.values[0];
      const mea = this._myDataSource.metadata.feeds.measures.values[0];

      // --- Prepare dataset
      let data = this._myDataSource.data
        .map((r) => ({ name: r[dim].label, value: r[mea].raw }))
        .filter((d) => d.value && d.value !== 0);

      if (!data.length) {
        this._root.innerHTML =
          "<div style='text-align:center;padding-top:40%;color:#888;'>No non-zero data</div>";
        return;
      }

      // --- Build a quick hash key to skip identical renders
      const dataKey = data.map((d) => d.name + d.value).join("|");
      if (this._lastDataKey === dataKey && this._chart) {
        return; // skip re-render if data unchanged (faster with filters)
      }
      this._lastDataKey = dataKey;

      // --- Compute total
      const total = data.reduce((sum, d) => sum + d.value, 0);
      this._centerKPI.querySelector
        ? (this._centerKPI.querySelector(".value")
            ? (this._centerKPI.querySelector(".value").textContent =
                total.toLocaleString())
            : (this._centerKPI.innerHTML = `
                <div class="value">${total.toLocaleString()}</div>
                <div class="label">Total</div>
              `))
        : (this._centerKPI.innerHTML = `
            <div class="value">${total.toLocaleString()}</div>
            <div class="label">Total</div>
          `);

      // --- Color palette & minimal styling
      const palette = ["#FF8C00", "#FFA733", "#FFD580", "#B0B0B0", "#808080", "#999999"];

      // --- Reuse chart instance instead of re-init
      if (!this._chart) this._chart = echarts.init(this._root);
      else this._chart.clear();

      const option = {
        animation: false, // disables heavy animation for fast refresh
        tooltip: {
          trigger: "item",
          formatter: (p) =>
            `<strong>${p.name}</strong><br/>${p.value.toLocaleString()} (${p.percent.toFixed(
              1
            )}%)`,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "#ccc",
          borderWidth: 1,
          textStyle: { color: "#333" },
          extraCssText: "box-shadow:0 2px 6px rgba(0,0,0,0.15);",
        },
        series: [
          {
            type: "pie",
            radius: ["35%", "75%"],
            center: ["50%", "50%"],
            roseType: "radius",
            data,
            color: palette,
            label: {
              show: true,
              formatter: "{b}",
              color: "#4A4A4A",
              fontSize: 12,
              fontWeight: 500,
              alignTo: "edge",
              bleedMargin: 5,
            },
            labelLine: {
              show: true,
              smooth: 0.2,
              length: 12,
              length2: 18,
              lineStyle: { color: "#999", width: 1 },
            },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              shadowBlur: 3,
              shadowOffsetY: 1,
              shadowColor: "rgba(0,0,0,0.15)",
            },
            emphasis: {
              scale: true,
              scaleSize: 5,
              itemStyle: {
                shadowBlur: 8,
                shadowColor: "rgba(0,0,0,0.25)",
              },
            },
          },
        ],
      };

      this._chart.setOption(option, false, true);
    }
  }

  customElements.define("com-sap-sample-echarts-custom_pie_chart", CustomPieSample);
})();


