<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData } from '../types';

  export let data: StockData[] = [];

  let chartContainer: HTMLElement;
  let chart: any;
  let candlestickSeries: any;

  onMount(() => {
    chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        minBarSpacing: 4,
        rightOffset: 5,
      },
    });

    candlestickSeries = chart.addBarSeries();
    updateChartData();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainer.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  });

  $: if (data && candlestickSeries) {
    updateChartData();
  }

  function updateChartData() {
    if (candlestickSeries && data && data.length > 0) {
      candlestickSeries.setData(data);
      chart.timeScale().fitContent();
    }
  }
</script>

<div bind:this={chartContainer} class="w-full h-[500px]"></div>

