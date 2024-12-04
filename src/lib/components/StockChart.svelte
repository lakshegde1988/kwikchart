<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData } from '../types';

  export let data: StockData[] = [];
  export let stockName: string = '';

  let chartContainer: HTMLElement;
  let legendContainer: HTMLElement;
  let chart: any;
  let barSeries: any;
  let resizeObserver: ResizeObserver;

  function formatPrice(price: number): string {
    return price.toFixed(2);
  }

  function formatPercentage(percentage: number): string {
    return percentage.toFixed(2) + '%';
  }

  function updateLegend(param: any) {
    const validData = param.seriesData.get(barSeries);
    if (validData) {
      const dataPoint = data.find((d) => d.time === validData.time);
      if (!dataPoint) return;

      const previousDataPoint = data[data.indexOf(dataPoint) - 1];
      const previousClose = previousDataPoint ? previousDataPoint.close : dataPoint.open;

      const priceChange = validData.close - previousClose;
      const percentageChange = (priceChange / previousClose) * 100;
      const isPositive = priceChange >= 0;

      legendContainer.innerHTML = `
          <h2 class="text-md font-bold mb-2">${stockName}</h2>
      `;
    }
  }

  function initializeChart() {
    if (!chartContainer) return;

    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#fafafa' },
        textColor: '#09090b',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 15,
        minBarSpacing: 3,
      },
    });

    barSeries = chart.addBarSeries({
      upColor: '#22c55e',
      downColor: '#b91c1c',
      thinBars : false,
    });
    barSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.2,
        bottom: 0.2,
      },
    });

    updateChartData();
    setInitialLegend();

    chart.subscribeCrosshairMove(updateLegend);

    chartContainer.addEventListener('mouseleave', () => {
      setInitialLegend();
    });
  }

  function updateChartData() {
  if (barSeries && data && data.length > 0) {
    // Preprocess data to include dynamic coloring
    const transformedData = data.map(({ time, high, low, close }, index) => {
      const previousClose = index > 0 ? data[index - 1].close : close;
      const isUp = close >= previousClose;
      return {
        time,
        open: close, // To exclude open visually
        high,
        low,
        close,
        color: isUp ? '#0c0a09' : '#dc2626', // Green for up, orange for down
      };
    });

    // Update the chart with the transformed data
    barSeries.setData(transformedData);

    // Adjust the chart view and reset legend
    chart.timeScale().fitContent();
    setInitialLegend();
  }
}



  function setInitialLegend() {
    if (data && data.length > 0) {
      const lastDataPoint = data[data.length - 1];
      updateLegend({
        seriesData: new Map([[barSeries, lastDataPoint]]),
      });
    }
  }

  function adjustChartSize() {
    if (chart && chartContainer) {
      requestAnimationFrame(() => {
        const newWidth = chartContainer.clientWidth;
        const newHeight = chartContainer.clientHeight;
        chart.applyOptions({
          width: newWidth,
          height: newHeight,
        });
        chart.timeScale().fitContent();
      });
    }
  }

  function handleResize() {
    requestAnimationFrame(() => {
      if (chartContainer) {
        adjustChartSize();
      }
    });
  }

  onMount(() => {
    initializeChart();
    
    // Use ResizeObserver for continuous monitoring of size changes
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(adjustChartSize);
    });
    
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    // Handle orientation change and fullscreen events
    window.addEventListener('orientationchange', () => {
      setTimeout(adjustChartSize, 100);
    });

    document.addEventListener('fullscreenchange', adjustChartSize);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('orientationchange', () => {
        setTimeout(adjustChartSize, 100);
      });
      document.removeEventListener('fullscreenchange', adjustChartSize);
      if (chart) {
        chart.remove();
      }
    };
  });

  // Use reactive statement instead of afterUpdate
  $: if (chart && data) {
    updateChartData();
  }
</script>

<div class="chart-container relative w-full h-full min-h-[300px]">
  <div bind:this={chartContainer} class="w-full h-full"></div>
  <div bind:this={legendContainer} class="absolute top-1 left-1 z-10 font-sans p-1"></div>
</div>

