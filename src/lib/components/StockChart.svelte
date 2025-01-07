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
  let volumeSeries: any;
  let resizeObserver: ResizeObserver;

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

  function updateLegend(param: any) {
    const barData = param.seriesData.get(barSeries);
    const volumeData = param.seriesData.get(volumeSeries);
    if (barData) {
      const dataPoint = data.find((d) => d.time === barData.time);
      if (!dataPoint) return;

      const previousDataPoint = data[data.indexOf(dataPoint) - 1];
      const previousClose = previousDataPoint ? previousDataPoint.close : dataPoint.open;

      const priceChange = barData.close - previousClose;
      const percentageChange = (priceChange / previousClose) * 100;
      const isPositive = priceChange >= 0;

      legendContainer.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="flex flex-col">
            <span class="text-sm font-bold text-gray-900">${stockName}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-gray-900">${formatPrice(barData.close)}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold" style="color: ${isPositive ? '#4f46e5' : '#c026d3'}">
              ${isPositive ? '+' : ''}${formatPrice(priceChange)} (${formatPercentage(percentageChange)})
            </span>
          </div>
        </div>
      `;
    }
  }

  function initializeChart() {
    if (!chartContainer) return;

    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: { 
          type: ColorType.Solid, 
          color: '#ffffff' 
        },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#e5e7eb', style: 1 },
        horzLines: { color: '#e5e7eb', style: 1 },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 5,
        minBarSpacing: 1,
        borderColor: '#e5e7eb',
      },
    });

    barSeries = chart.addBarSeries({
      upColor: '#1d4ed8',
      downColor: '#c026d3',
      thinBars: false
    });

    volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      lineWidth: 1,
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      borderColor: '#e5e7eb',
    });

    barSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
      borderColor: '#e5e7eb',
    });

    updateChartData();
    setInitialLegend();

    chart.subscribeCrosshairMove(updateLegend);

    chartContainer.addEventListener('mouseleave', () => {
      setInitialLegend();
    });
  }

  function updateChartData() {
    if (barSeries && volumeSeries && data && data.length > 0) {
      const barData = data.map(({ time, high, low, close }, index) => {
        const previousClose = index > 0 ? data[index - 1].close : close;
        const isUp = close >= previousClose;
        return {
          time,
          open: close,
          high,
          low,
          close,
          color: isUp ? '#1d4ed8' : '#c026d3',
        };
      });

      const volumeData = data.map(({ time, close, volume }, index) => {
        const previousClose = index > 0 ? data[index - 1].close : close;
        const isUp = close >= previousClose;
        return {
          time,
          value: volume,
          color: isUp ? 'rgba(30, 64, 175, 0.75)' : 'rgba(192, 38, 211, 0.75)', // Same colors with transparency
          lineWidth: 1,
        };
      });

      barSeries.setData(barData);
      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
      setInitialLegend();
    }
  }

  function setInitialLegend() {
    if (data && data.length > 0) {
      const lastDataPoint = data[data.length - 1];
      updateLegend({
        seriesData: new Map([
          [barSeries, lastDataPoint],
        ]),
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
    
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(adjustChartSize);
    });
    
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

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

  $: if (chart && data) {
    updateChartData();
  }
</script>

<div class="chart-container relative w-full h-full min-h-[300px]">
  <div bind:this={chartContainer} class="w-full h-full"></div>
  <div 
    bind:this={legendContainer} 
    class="absolute top-1 left-1 z-10 font-sans p-1"
  ></div>
</div>
