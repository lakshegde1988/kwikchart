<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData } from '../types';
  import { theme } from '../stores/themeStore';

  export let data: StockData[] = [];
  export let stockName: string = '';

  let chartContainer: HTMLElement;
  let legendContainer: HTMLElement;
  let chart: any;
  let candlestickSeries: any;
  let volumeSeries: any;
  let resizeObserver: ResizeObserver;

  // Formatting utilities
  function formatPrice(price: number): string {
    return price.toFixed(2);
  }

  function formatPercentage(percentage: number): string {
    return percentage.toFixed(2) + '%';
  }

  function formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toString();
  }

  // Initialize and update legend
  function updateLegend(param: any) {
    const candleData = param.seriesData.get(candlestickSeries);
    if (candleData) {
      const dataPoint = data.find((d) => d.time === candleData.time);
      if (!dataPoint) return;

      const previousDataPoint = data[data.indexOf(dataPoint) - 1];
      const previousClose = previousDataPoint ? previousDataPoint.close : dataPoint.open;

      const priceChange = candleData.close - previousClose;
      const percentageChange = (priceChange / previousClose) * 100;
      const isPositive = priceChange >= 0;

      legendContainer.innerHTML = `
        <h2 class="text-md font-bold mb-2">${stockName}</h2>
        <div class="flex items-center space-x-4 mb-2">
          <div class="flex flex-col">
            <span class="text-sm font-semibold">${formatPrice(candleData.close)}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}">
              ${isPositive ? '+' : ''}${formatPrice(priceChange)} (${formatPercentage(percentageChange)})
            </span>
          </div>
        </div>
      `;
    }
  }

  // Chart initialization
  function initializeChart() {
    if (!chartContainer) return;

    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: $theme === 'light' ? '#ffffff' : '#020617' },
        textColor: $theme === 'light' ? '#131722' : '#d1d4dc',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 15,
        minBarSpacing: 3,
        borderColor: $theme === 'light' ? '#e1e3ea' : '#363c4e',
      },
    });

    candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    volumeSeries = chart.addHistogramSeries({
      color: $theme === 'light' ? '#26a69a80' : '#26a69a80',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    updateChartData();
    setInitialLegend();
    chart.subscribeCrosshairMove(updateLegend);

    chartContainer.addEventListener('mouseleave', () => setInitialLegend());
  }

  // Update chart data
  function updateChartData() {
    if (candlestickSeries && volumeSeries && data?.length) {
      candlestickSeries.setData(
        data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
      );

      volumeSeries.setData(
        data.map(({ time, close, volume }, index) => ({
          time,
          value: volume,
          color: close >= (data[index - 1]?.close || close) ? '#26a69a80' : '#ef535080',
        }))
      );

      chart.timeScale().fitContent();
    }
  }

  // Set initial legend
  function setInitialLegend() {
    const lastDataPoint = data[data.length - 1];
    if (lastDataPoint) {
      updateLegend({
        seriesData: new Map([[candlestickSeries, lastDataPoint]]),
      });
    }
  }

  // Adjust chart size dynamically
  function adjustChartSize() {
    if (chart && chartContainer) {
      requestAnimationFrame(() => {
        chart.applyOptions({
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight,
        });
        chart.timeScale().fitContent();
      });
    }
  }

  onMount(() => {
    initializeChart();

    // Resize observer
    resizeObserver = new ResizeObserver(adjustChartSize);
    if (chartContainer) resizeObserver.observe(chartContainer);

    // Event listeners
    window.addEventListener('orientationchange', adjustChartSize);
    document.addEventListener('fullscreenchange', adjustChartSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('orientationchange', adjustChartSize);
      document.removeEventListener('fullscreenchange', adjustChartSize);
      chart?.remove();
    };
  });

  $: if (chart && $theme) {
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: $theme === 'light' ? '#ffffff' : '#020617' },
        textColor: $theme === 'light' ? '#131722' : '#d1d4dc',
      },
    });
    updateChartData();
  }
</script>

<div
  class="chart-container relative w-full h-full min-h-[300px]"
  style="height: calc(var(--vh, 1vh) * 100);"
>
  <div bind:this={chartContainer} class="w-full h-full"></div>
  <div
    bind:this={legendContainer}
    class="absolute top-1 left-1 z-10 font-sans p-1"
    class:text-slate-900={$theme === 'light'}
    class:text-slate-50={$theme === 'dark'}
  ></div>
</div>
