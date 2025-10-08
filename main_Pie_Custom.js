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

  if (this._chart) this._chart.dispose();

  // ⚙️ Reset SAC inherited styling (critical)
  const styleReset = document.createElement("style");
  styleReset.innerHTML = `
    :host { all: initial !important; }
    #root { background: transparent !important; }
  `;
  this._shadowRoot.appendChild(styleReset);

  const myChart = echarts.init(this._root, null, { renderer: "canvas" });

  // 🎨 Custom color palette (orange-grey)
  const primary = this._primaryColor || "#E67E22";
  const secondary = this._secondaryColor || "#95A5A6";
  const palette = [primary, secondary, "#F39C12", "#BDC3C7"];

  const option = {
    backgroundColor: "transparent",
    color: palette,
    useTheme: false, // ✅ prevents SAC theme override
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: "55%",
        center: ["50%", "50%"],
        data,
        label: { color: "#1D2D3E" },
        labelLine: {
          lineStyle: { color: "#1D2D3E" },
          smooth: 0.3,
          length: 10,
          length2: 20,
        },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 2,
          shadowBlur: 15,
          shadowColor: "rgba(0,0,0,0.3)",
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 30,
            shadowColor: "rgba(255,180,100,0.6)",
          },
        },
        animationType: "scale",
        animationEasing: "elasticOut",
        animationDelay: (idx) => Math.random() * 200,
      },
    ],
  };

  // ✅ Force full override to bypass SAC theme merge
  myChart.clear();
  myChart.setOption(option, { notMerge: true, lazyUpdate: false });
  this._chart = myChart;
}


  // 🧱 Register the widget
  customElements.define(
    "com-sap-sample-echarts-custom_pie_chart",
    CustomPieSample
  );
})();
