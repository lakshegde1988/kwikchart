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
    
    console.log('Calculating yearly pivot with data length:', data.length);
    
    // Sort data by time to ensure proper chronological order
    const sortedData = [...data].sort((a, b) => a.time - b.time);
    
    const yearlyData = new Map<number, { high: number, low: number, close: number, firstDate: Date, lastDate: Date, dataPoints: StockData[] }>();
    
    // Group data by calendar year (Jan 1 - Dec 31)
    sortedData.forEach(point => {
      const date = new Date(point.time * 1000);
      const year = date.getFullYear();
      
      if (!yearlyData.has(year)) {
        yearlyData.set(year, {
          high: point.high,
          low: point.low,
          close: point.close,
          firstDate: date,
          lastDate: date,
          dataPoints: [point]
        });
      } else {
        const yearData = yearlyData.get(year)!;
        yearData.high = Math.max(yearData.high, point.high);
        yearData.low = Math.min(yearData.low, point.low);
        
        // Update close only if this is a later date in the year
        if (date >= yearData.lastDate) {
          yearData.close = point.close;
          yearData.lastDate = date;
        }
        
        // Update first date if this is earlier
        if (date < yearData.firstDate) {
          yearData.firstDate = date;
        }
        
        yearData.dataPoints.push(point);
      }
    });
    
    const pivotPoints: { time: number, value: number }[] = [];
    const sortedYears = Array.from(yearlyData.keys()).sort();
    
    console.log('Years found:', sortedYears);
    
    // Log the date ranges for each year to verify we have complete calendar years
    sortedYears.forEach(year => {
      const yearData = yearlyData.get(year)!;
      console.log(`Year ${year}: ${yearData.firstDate.toDateString()} to ${yearData.lastDate.toDateString()}`);
      console.log(`  Data points: ${yearData.dataPoints.length}`);
    });
    
    // Calculate pivot points for each year based on COMPLETE PREVIOUS CALENDAR YEAR
    for (let i = 1; i < sortedYears.length; i++) {
      const currentYear = sortedYears[i];
      const previousYear = sortedYears[i - 1];
      const previousYearData = yearlyData.get(previousYear)!;
      const currentYearData = yearlyData.get(currentYear)!;
      
      // Verify we have complete previous year data (should ideally start near Jan 1 and end near Dec 31)
      const janFirst = new Date(previousYear, 0, 1);
      const decThirtyFirst = new Date(previousYear, 11, 31);
      
      console.log(`Previous year ${previousYear} date range check:`);
      console.log(`  Should be: ${janFirst.toDateString()} to ${decThirtyFirst.toDateString()}`);
      console.log(`  Actually: ${previousYearData.firstDate.toDateString()} to ${previousYearData.lastDate.toDateString()}`);
      
      // Calculate yearly pivot point using the complete previous calendar year: (H + L + C) / 3
      const pivotPoint = (previousYearData.high + previousYearData.low + previousYearData.close) / 3;
      
      console.log(`Year ${currentYear} pivot point: ${pivotPoint.toFixed(4)}`);
      console.log(`  Based on complete ${previousYear} calendar year:`);
      console.log(`  High: ${previousYearData.high.toFixed(4)} (highest during ${previousYear})`);
      console.log(`  Low: ${previousYearData.low.toFixed(4)} (lowest during ${previousYear})`);
      console.log(`  Close: ${previousYearData.close.toFixed(4)} (last close of ${previousYear})`);
      console.log(`  Calculation: (${previousYearData.high.toFixed(4)} + ${previousYearData.low.toFixed(4)} + ${previousYearData.close.toFixed(4)}) / 3 = ${pivotPoint.toFixed(4)}`);
      
      // Add pivot point for all data points in the current year
      currentYearData.dataPoints.forEach(point => {
        pivotPoints.push({ time: point.time, value: pivotPoint });
      });
    }
    
    console.log('Total pivot points created:', pivotPoints.length);
    return pivotPoints.sort((a, b) => a.time - b.time);
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
      lineStyle: 0, // Solid line (0 = solid, 1 = dotted, 2 = dashed)
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
      console.log('Yearly pivot data:', yearlyPivotData);
      
      barSeries.setData(barData);
      volumeSeries.setData(volumeData);
      
      // Set yearly pivot point data
      if (yearlyPivotSeries) {
        if (yearlyPivotData.length > 0) {
          console.log('Setting pivot data, first few points:', yearlyPivotData.slice(0, 5));
          yearlyPivotSeries.setData(yearlyPivotData);
        } else {
          console.log('No yearly pivot data calculated');
          // Try a simple test line to see if the series works at all
          const testData = data.map(point => ({
            time: point.time,
            value: data[0].close * 1.1 // 10% above first close price
          }));
          console.log('Setting test data instead:', testData.slice(0, 3));
          yearlyPivotSeries.setData(testData);
        }
      } else {
        console.log('yearlyPivotSeries is not initialized');
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
