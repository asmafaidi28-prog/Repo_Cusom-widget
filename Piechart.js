var getScriptPromisify = (src) => {
  const __define = window.define;
  window.define = undefined;
  return new Promise((resolve) => {
    $.getScript(src, () => {
      window.define = __define;
      resolve();
    });
  });
};

(function () {
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
    <div id="root" style="width:100%; height:100%;"></div>
  `;

  class CustomPieChartOrangeGrey extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this.shadowRoot.getElementById("root");
      this._props = {};
      this.render();
    }

    // resize behavior
    onCustomWidgetResize(width, height) {
      if (this.chart) this.chart.resize();
    }

    // receive SAC data binding
    set myDataSource(dataBinding) {
      this._myDataSource = dataBinding;
      this.render();
    }

    async render() {
      await getScriptPromisify("https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js");

      if (!this._myDataSource || this._myDataSource.state !== "success") {
        return;
      }

      // extract measure and dimension from SAC data binding
      const dimension = this._myDataSource.metadata.feeds.dimensions.values[0];
      const measure = this._myDataSource.metadata.feeds.measures.values[0];

     const data = this._myDataSource.data
  .map((row) => ({
    name: row[dimension].label,
    value: row[measure].raw
  }))
  .filter(item => {
    if (this._props.hideZeroValues === false) return true;
    return item.value !== 0 && item.value !== null;
  });


      const chart = echarts.init(this._root);
      this.chart = chart;

      // orange-grey theme palette
      const colors = ["#FF8C00", "#FFA733", "#FFD580", "#B0B0B0", "#808080", "#999999"];

      const option = {
        backgroundColor: "#FFFFFF",
        tooltip: {
          trigger: "item",
          formatter: (p) =>
            `<strong>${p.name}</strong><br/>${p.value.toLocaleString()} (${p.percent.toFixed(2)}%)`,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "#ccc",
          borderWidth: 1,
          textStyle: { color: "#333" },
          extraCssText: "box-shadow: 0 2px 6px rgba(0,0,0,0.15);"
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
              show: true,
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
              shadowColor: "rgba(0, 0, 0, 0.15)"
            },
            emphasis: {
              scale: true,
              scaleSize: 6,
              itemStyle: {
                shadowBlur: 20,
                shadowColor: "rgba(0, 0, 0, 0.35)"
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

  customElements.define("com-sap-pie-orangegrey", CustomPieChartOrangeGrey);
})();

