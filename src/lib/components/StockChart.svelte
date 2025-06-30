<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createChart, ColorType } from 'lightweight-charts';
  import type { StockData, Interval } from '../types';

  export let data: StockData[] = [];
  export let stockName: string = '';
  export let interval: Interval = { label: 'D', value: '1d', range: '2y' };

  let chartContainer: HTMLElement;
  let legendContainer: HTMLElement;
  let chart: any;
  let barSeries: any;
  let volumeSeries: any;
  let maSeries1: any;
  let maSeries2: any;
  let yearlyPivotSeries: any;
  
  
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

  function calculateYearlyPivotPoint(data: StockData[]): { time: number, value: number }[] {
    if (!data || data.length === 0) return [];
    
    const yearlyData = new Map<number, { high: number, low: number, close: number, firstTime: number, lastTime: number }>();
    
    // Group data by year and find yearly high, low, and last close
    data.forEach(point => {
      const date = new Date(point.time * 1000);
      const year = date.getFullYear();
      
      if (!yearlyData.has(year)) {
        yearlyData.set(year, {
          high: point.high,
          low: point.low,
          close: point.close,
          firstTime: point.time,
          lastTime: point.time
        });
      } else {
        const yearData = yearlyData.get(year)!;
        yearData.high = Math.max(yearData.high, point.high);
        yearData.low = Math.min(yearData.low, point.low);
        yearData.close = point.close; // This will be the last close of the year
        yearData.lastTime = point.time;
      }
    });
    
    const pivotPoints: { time: number, value: number }[] = [];
    const sortedYears = Array.from(yearlyData.keys()).sort();
    
    // Calculate pivot points for each year based on previous year's data
    for (let i = 1; i < sortedYears.length; i++) {
      const currentYear = sortedYears[i];
      const previousYear = sortedYears[i - 1];
      const previousYearData = yearlyData.get(previousYear)!;
      const currentYearData = yearlyData.get(currentYear)!;
      
      // Calculate yearly pivot point: (H + L + C) / 3
      const pivotPoint = (previousYearData.high + previousYearData.low + previousYearData.close) / 3;
      
      // Add pivot point for the entire current year
      const currentYearStart = new Date(currentYear, 0, 1).getTime() / 1000;
      const currentYearEnd = currentYearData.lastTime;
      
      // Find all data points in the current year to create a continuous line
      const currentYearPoints = data.filter(point => {
        const pointDate = new Date(point.time * 1000);
        return pointDate.getFullYear() === currentYear;
      });
      
      currentYearPoints.forEach(point => {
        pivotPoints.push({ time: point.time, value: pivotPoint });
      });
    }
    
    return pivotPoints;
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
            <span class="text-sm font-semibold" style="color: ${isPositive ? '#3AAB3A' : '#FF0000'}">
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
        minBarSpacing: 2,
        borderColor: '#444444',
      },
    });

    barSeries = chart.addBarSeries({
      upColor: '#3AAB3A',
      downColor: '#FF0000',
      thinBars: true,
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
        top: 0.7,
        bottom: 0,
      },
      lineWidth: 1,
    }, { pane: "volume" });

    // Add yearly pivot point line series
    yearlyPivotSeries = chart.addLineSeries({
      color: '#FFD700', // Gold color for yearly pivot
      lineWidth: 2,
      lineStyle: 1, // Dashed line
      title: 'Yearly Pivot'
    });

   // maSeries1 = chart.addLineSeries({ color: 'green', lineWidth: 1 });
    //maSeries2 = chart.addLineSeries({ color: 'yellow', lineWidth: 1 });
    
    

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      borderColor: '#444444',
    });

    barSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
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
          color: isUp ? '#3AAB3A' : '#FF0000',
        };
      });

      const volumeData = data.map(({ time, close, volume }, index) => {
        const previousClose = index > 0 ? data[index - 1].close : close;
        const isUp = close >= previousClose;
        return {
          time,
          value: volume,
          color: isUp ? 'rgba(58, 171, 58, 0.75)' : 'rgba(255, 0, 0, 0.75)',
          lineWidth: 1,
        };
      });

      // Calculate and set yearly pivot point data
      const yearlyPivotData = calculateYearlyPivotPoint(data);
      
  
      
      
    

      barSeries.setData(barData);
      volumeSeries.setData(volumeData);
      
      // Set yearly pivot point data
      if (yearlyPivotSeries && yearlyPivotData.length > 0) {
        yearlyPivotSeries.setData(yearlyPivotData);
      }

    //  maSeries1.setData(calculateMovingAverage(data, 10));
     // maSeries2.setData(calculateMovingAverage(data, 21));

      
      

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
