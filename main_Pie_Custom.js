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

  // 🧹 Clean up old chart instance if it exists
  if (this._chart) {
    this._chart.dispose();
  }

  // ✅ Create dynamic style to match your attached color palette
  const styleOverride = document.createElement("style");
  styleOverride.innerHTML = `
    :host {
      all: initial !important;
    }
    #root {
      background-color: #1D2D3E;       /* dark background */
      border-top: 5px solid #BD9E68;   /* orange/gold top stripe */
      border-radius: 6px;
    }
  `;
  this._shadowRoot.appendChild(styleOverride);

  // ✅ Initialize chart safely without SAC theme
  const myChart = echarts.init(this._root, null, { renderer: "canvas" });

  // 🎨 Color palette adjustable here:
  const palette = {
    primary: "#BD9E68",  // gold/orange
    secondary: "#A7A9AC", // grey tone
    accent1: "#E67E22",  // deep orange
    accent2: "#95A5A6",  // lighter grey
  };

  const customColors = [
    palette.primary,
    palette.secondary,
    palette.accent1,
    palette.accent2,
  ];

  const option = {
    backgroundColor: "#1D2D3E", // match container
    color: customColors,
    tooltip: {
      trigger: "item",
      backgroundColor: "#2C3E50",
      borderColor: "#BD9E68",
      textStyle: { color: "#F8F8F8" },
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
      textStyle: { color: "#E0E0E0" },
    },
    series: [
      {
        name: "",
        type: "pie",
        radius: ["45%", "70%"], // donut style
        center: ["45%", "50%"],
        data,
        label: {
          color: "#F0F0F0",
          fontWeight: 500,
        },
        labelLine: {
          lineStyle: { color: "#BD9E68" },
          smooth: 0.2,
          length: 10,
          length2: 20,
        },
        itemStyle: {
          borderColor: "#1D2D3E",
          borderWidth: 2,
          shadowBlur: 20,
          shadowColor: "rgba(0, 0, 0, 0.3)",
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          itemStyle: {
            shadowColor: "rgba(255, 215, 160, 0.6)",
            shadowBlur: 25,
          },
        },
        animationType: "scale",
        animationEasing: "elasticOut",
        animationDelay: (idx) => Math.random() * 200,
      },
    ],
  };

  // 🧩 Apply options and refresh chart
  myChart.clear();
  myChart.setOption(option, { notMerge: true, lazyUpdate: false });
  this._chart = myChart;
}
