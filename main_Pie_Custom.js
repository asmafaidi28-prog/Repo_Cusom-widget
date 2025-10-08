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

  // 🧹 Ensure no old chart instance stays in memory
  if (this._chart) {
    this._chart.dispose();
  }

  // ⛔️ Remove any inherited SAC CSS styles
  const styleOverride = document.createElement("style");
  styleOverride.innerHTML = `
    :host {
      all: initial !important;
    }
  `;
  this._shadowRoot.appendChild(styleOverride);

  // ✅ Initialize chart without SAC theme context
  const myChart = echarts.init(this._root, null, { renderer: "canvas" });

  // ✅ Force your color palette
  const customColors = ["#E67E22", "#95A5A6", "#F39C12", "#BDC3C7"];

  const option = {
    backgroundColor: "transparent",
    color: customColors, // Force global colors
    tooltip: { trigger: "item" },
    series: [
      {
        name: "",
        type: "pie",
        radius: "60%",
        center: ["50%", "50%"],
        data,
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
          shadowColor: "rgba(0, 0, 0, 0.2)",
        },
        animationType: "scale",
        animationEasing: "elasticOut",
        animationDelay: (idx) => Math.random() * 200,
      },
    ],
  };

  // ✅ Force full override — prevents SAC theme merge
  myChart.clear();
  myChart.setOption(option, { notMerge: true, lazyUpdate: false });
  this._chart = myChart;
}

