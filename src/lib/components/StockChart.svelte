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
  let ma200Series: any;
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

  function calculateMovingAverage(data: StockData[], period: number): { time: number, value: number }[] {
    let result: { time: number, value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
    return result;
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
            <span class="text-sm font-bold text-gray-200">${stockName}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-gray-200">${formatPrice(barData.close)}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold" style="color: ${isPositive ? '#00FF00' : '#FF0000'}">
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
      layout: {
        background: {
          type: ColorType.Solid,
          color: '#000000'
        },
        textColor: '#CCCCCC',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: false,
        rightOffset: 5,
        minBarSpacing: 5,
        borderColor: '#444444',
      },
    });

    barSeries = chart.addBarSeries({
      upColor: '#00FF00',
      downColor: '#FF0000',
      thinBars: false,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
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
    }, { pane: "volume" });

    ma1Series = chart.addLineSeries({ color: 'blue', lineWidth: 1 });
    ma2Series = chart.addLineSeries({ color: 'green', lineWidth: 1 });
    ma200Series = chart.addLineSeries({ color: 'red', lineWidth: 1 });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      borderColor: '#444444',
    });

    barSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.2,
        bottom: 0.2,
      },
      borderColor: '#444444',
      mode: 1,
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
          color: isUp ? '#00FF00' : '#FF0000',
        };
      });

      const volumeData = data.map(({ time, close, volume }, index) => {
        const previousClose = index > 0 ? data[index - 1].close : close;
        const isUp = close >= previousClose;
        return {
          time,
          value: volume,
          color: isUp ? 'rgba(0, 255, 0, 0.75)' : 'rgba(255, 0, 0, 0.75)',
          lineWidth: 1,
        };
      });

      let ma1Period = 21;
      let ma2Period = 50;
      if (interval.value === '1wk') {
        ma1Period = 10;
        ma2Period = 40;
      }

      const ma1Data = calculateMovingAverage(data, ma1Period);
      const ma2Data = calculateMovingAverage(data, ma2Period);
      const ma200Data = calculateMovingAverage(data, 200);

      barSeries.setData(barData);
      volumeSeries.setData(volumeData);

      ma1Series.setData(ma1Data);
      ma2Series.setData(ma2Data);
      ma200Series.setData(ma200Data);

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
