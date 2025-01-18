<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData, Interval } from '../types';

  export let data: StockData[] = [];
  export let stockName: string = '';
  export let interval: Interval = { label: 'D', value: '1d', range: '5y' };

  let chartContainer: HTMLElement;
  let legendContainer: HTMLElement;
  let chart: any;
  let barSeries: any;
  let volumeSeries: any;
  let ma1Series: any;
  let ma2Series: any;
  let resizeObserver: ResizeObserver;

  function calculateMovingAverage(data: StockData[], period: number): { time: number; value: number }[] {
    let result: { time: number; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
    return result;
  }

  function initializeChart() {
    if (!chartContainer) return;

    chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#CCCCCC',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 7,
        minBarSpacing: 5,
        borderColor: '#444444',
      },
    });

    barSeries = chart.addBarSeries({
      upColor: '#00FF00',
      downColor: '#FF0000',
      thinBars: false,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
      borderColor: '#444444',
    });

    barSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.2, bottom: 0.2 },
      borderColor: '#444444',
      mode: 1,
    });

    updateChartData();
  }

  function updateChartData() {
    if (!data.length) return;

    // Update bar and volume data
    barSeries.setData(data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    volumeSeries.setData(data.map(({ time, volume }) => ({ time, value: volume })));

    // Remove any existing MA series
    if (ma1Series) {
      chart.removeSeries(ma1Series);
      ma1Series = null;
    }
    if (ma2Series) {
      chart.removeSeries(ma2Series);
      ma2Series = null;
    }

    // Add MAs based on the interval
    if (interval.value === '1d') {
      ma1Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1 });
      ma2Series = chart.addLineSeries({ color: '#16a34a', lineWidth: 1 });

      const ma50Data = calculateMovingAverage(data, 50);
      const ma200Data = calculateMovingAverage(data, 200);

      ma1Series.setData(ma50Data);
      ma2Series.setData(ma200Data);
    } else if (interval.value === '1wk') {
      ma1Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1 });

      const ma10Data = calculateMovingAverage(data, 10);
      ma1Series.setData(ma10Data);
    }
    // No MAs for '1mo' or unsupported intervals
  }

  function adjustChartSize() {
    if (chart && chartContainer) {
      requestAnimationFrame(() => {
        const newWidth = chartContainer.clientWidth;
        const newHeight = chartContainer.clientHeight;
        chart.applyOptions({ width: newWidth, height: newHeight });
        chart.timeScale().fitContent();
      });
    }
  }

  onMount(() => {
    initializeChart();

    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(adjustChartSize);
    });

    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
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
  <div bind:this={legendContainer} class="absolute top-1 left-1 z-10 font-sans p-1"></div>
</div>
