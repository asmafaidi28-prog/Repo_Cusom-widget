var getScriptPromisify = (src) => {
  // Handle ECharts load safely with SAC define conflict fix
  const __define = define;
  define = undefined;
  return new Promise((resolve) => {
    $.getScript(src, () => {
      define = __define;
      resolve();
    });
  });
};

(function () {
  const prepared = document.createElement("template");
  prepared.innerHTML = `
    <style></style>
    <div id="root" style="width: 100%; height: 100%;"></div>
  `;

  class CustomPieSample extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: "open" });
      this._shadowRoot.appendChild(prepared.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById("root");
      this._props = {};
      this.render();
    }

    onCustomWidgetResize(width, height) {
      this.render();
    }

    set myDataSource(dataBinding) {
      this._myDataSource = dataBinding;
      this.render();
    }

    // 🧩 Add property setters for color customization
    set primaryColor(value) {
      this._primaryColor = value;
      this.render();
    }

    set secondaryColor(value) {
      this._secondaryColor = value;
      this.render();
    }

    async render() {
      await getScriptPromisify(
        "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"
      );

      if (!this._myDataSource || this._myDataSource.state !== "success") {
        return;
      }

      const dimension = this._myDataSource.metadata.feeds.dimensions.values[0];
      const measure = this._myDataSource.metadata.feeds.measures.values[0];

      const data = this._myDataSource.data
        .map((d) => ({
          name: d[dimension].label,
          value: d[measure].raw,
        }))
        .sort((a, b) => a.value - b.value);

      if (this._chart) {
        this._chart.dispose();
      }

      const myChart = echarts.init(this._root, null, { renderer: "canvas" });

      // 🎨 Pull colors from SAC or fallback to defaults
      const primary = this._primaryColor || "#E67E22"; // orange default
      const secondary = this._secondaryColor || "#95A5A6"; // grey default

      const customColors = [primary, secondary, "#F39C12", "#BDC3C7"];

      const option = {
        backgroundColor: "transparent",
        color: customColors,
        tooltip: { trigger: "item" },
        series: [
          {
            type: "pie",
            radius: "55%",
            center: ["50%", "50%"],
            data,
            roseType: "radius",
            label: {
              color: "#1D2D3E",
            },
            labelLine: {
              lineStyle: { color: "#1D2D3E" },
              smooth: 0.2,
              length: 10,
              length2: 20,
            },
            itemStyle: {
              shadowBlur: 20,
              shadowColor: "rgba(0, 0, 0, 0.3)",
              borderColor: "#1D2D3E",
              borderWidth: 1.5,
            },
            emphasis: {
              scale: true,
              scaleSize: 10,
              itemStyle: {
                shadowColor: "rgba(255, 200, 120, 0.6)",
                shadowBlur: 25,
              },
            },
            animationType: "scale",
            animationEasing: "elasticOut",
            animationDelay: (idx) => Math.random() * 200,
          },
        ],
      };

      myChart.clear();
      myChart.setOption(option, { notMerge: true, lazyUpdate: false });
      this._chart = myChart;
    }
  }

  // 🧱 Register the widget
  customElements.define(
    "com-sap-sample-echarts-custom_pie_chart",
    CustomPieSample
  );
})();
