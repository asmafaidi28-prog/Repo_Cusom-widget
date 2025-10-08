(function () {
  class CustomPieChartOrangeGrey extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; }
        </style>
        <div id="root" style="width:100%; height:100%;"></div>
      `;
      this._root = this.shadowRoot.getElementById("root");
      this._props = {};
    }

    onCustomWidgetResize(width, height) {
      if (this.chart) this.chart.resize();
    }

    set myDataSource(dataBinding) {
      this._myDataSource = dataBinding;
      this.render();
    }

    async ensureECharts() {
      if (window.echarts) return;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    async render() {
      await this.ensureECharts();

      if (!this._myDataSource || this._myDataSource.state !== "success") {
        return;
      }

      const dimension = this._myDataSource.metadata.feeds.dimensions.values[0];
      const measure = this._myDataSource.metadata.feeds.measures.values[0];

      // Prepare and filter data
      let data = this._myDataSource.data.map((row) => ({
        name: row[dimension]?.label,
        value: row[measure]?.raw
      }));

      if (this._props.hideZeroValues !== false) {
        data = data.filter((item) => item.value !== 0 && item.value !== null);
      }

      // Initialize chart
      const chart = echarts.init(this._root);
      this.chart = chart;

      const colors = ["#FF8C00", "#FFA733", "#FFD580", "#B0B0B0", "#808080", "#999999"];

      const option = {
        backgroundColor: "#FFFFFF",
        tooltip: {
          show: this._props.showTooltip !== false,
          trigger: "item",
          formatter: (p) => `
            <strong>${p.name}</strong><br/>
            ${p.value.toLocaleString()} (${p.percent.toFixed(2)}%)
          `,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "#ccc",
          borderWidth: 1,
          textStyle: { color: "#333" },
          extraCssText: "box-shadow:0 2px 6px rgba(0,0,0,0.15);"
        },
        series: [
          {
            name: "Pie Chart",
            type: "pie",
            radius: ["35%", "75%"],
            center: ["50%", "50%"],
            roseType: "radius",
            avoidLabelOverlap: true,
            label: {
              show: this._props.showLabels !== false,
              formatter: "{b}",
              color: "#4A4A4A",
              fontWeight: "500",
              fontSize: 12,
              alignTo: "edge",
              bleedMargin: 5
            },
            labelLine: {
              show: true,
              smooth: 0.2,
              length: 15,
              length2: 25,
              lineStyle: {
                color: "#999",
                width: 1.5
              }
            },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              shadowBlur: 10,
              shadowOffsetX: 0,
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
            color: colors,
            data
          }
        ],
        animationType: "scale",
        animationEasing: "elasticOut",
        animationDelay: (idx) => Math.random() * 200
      };

      chart.setOption(option);
    }
  }

  // define widget immediately to avoid SAC timeout
  customElements.define("com-sap-pie-orangegrey", CustomPieChartOrangeGrey);
})();
