<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData } from '../types';

  export let data: StockData[] = [];
  export let stockName: string = '';

  let chartContainer: HTMLElement;
  let legendContainer: HTMLElement;
  let chart: any;
  let candlestickSeries: any;

  function formatPrice(price: number): string {
    return price.toFixed(2);
  }

  function formatPercentage(percentage: number): string {
    return percentage.toFixed(2) + '%';
  }

  function updateLegend(param: any) {
    const validData = param.seriesData.get(candlestickSeries);
    if (validData) {
      const dataPoint = data.find((d) => d.time === validData.time);
      if (!dataPoint) return;

      const previousDataPoint = data[data.indexOf(dataPoint) - 1];
      const previousClose = previousDataPoint ? previousDataPoint.close : dataPoint.open;

      const priceChange = validData.close - previousClose;
      const percentageChange = (priceChange / previousClose) * 100;
      const isPositive = priceChange >= 0;

      legendContainer.innerHTML = `
        <div class="flex flex-col">
          <div class="text-md font-bold mb-2">${stockName}</div>
          <div class="flex items-center space-x-4 mb-2">
            <div class="flex flex-col">
              <span class="text-sm font-semibold">${formatPrice(validData.close)}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}">
                ${isPositive ? '+' : ''}${formatPrice(priceChange)} (${formatPercentage(percentageChange)})
              </span>
            </div>
          </div>
        </div>
      `;
    }
  }

  function initializeChart() {
    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.parentElement?.clientHeight || window.innerHeight - 64,
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#e2e8f0',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 15,
        minBarSpacing: 2,
      },
    });

    candlestickSeries = chart.addBarSeries({
      upColor: '#22c55e',
      downColor: '#ea580c',
    });
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.2,
        bottom: 0.2,
      },
    });
    chart.timeScale().fitContent();

    updateChartData();
    setInitialLegend();

    chart.subscribeCrosshairMove(updateLegend);

    chartContainer.addEventListener('mouseleave', () => {
      setInitialLegend();
    });
  }

  function updateChartData() {
    if (candlestickSeries && data && data.length > 0) {
      candlestickSeries.setData(data);
      chart.timeScale().fitContent();
      setInitialLegend();
    }
  }

  function setInitialLegend() {
    if (data && data.length > 0) {
      const lastDataPoint = data[data.length - 1];
      updateLegend({
        seriesData: new Map([[candlestickSeries, lastDataPoint]]),
      });
    }
  }

  function adjustChartSize() {
    if (chart && chartContainer) {
      requestAnimationFrame(() => {
        const newWidth = chartContainer.clientWidth;
        const newHeight = chartContainer.parentElement?.clientHeight || window.innerHeight - 64;
        chart.applyOptions({
          width: newWidth,
          height: newHeight,
        });
        chart.timeScale().fitContent();
      });
    }
  }

  function handleResize() {
    adjustChartSize();
  }

  function handleOrientationChange() {
    requestAnimationFrame(adjustChartSize);
  }

  function handleFullscreenChange() {
    requestAnimationFrame(adjustChartSize);
  }

  function forceResize() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  onMount(() => {
    initializeChart();
    forceResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (chart) {
        chart.remove();
      }
    };
  });

  $: {
    if (chart && data) {
      updateChartData();
    }
  }
</script>

<div class="chart-container relative flex-grow">
  <div bind:this={chartContainer} class="w-full h-full"></div>
  <div bind:this={legendContainer} class="absolute top-1 left-1 z-10 font-sans p-1"></div>
</div>

