<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import PaginationControls from './lib/components/PaginationControls.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import type { Stock, StockData, Interval } from './lib/types';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';

  import './app.css';

  let currentIndex = 0;
  let selectedFile = '';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };

  $: totalStocks = $stocks.length;

  async function handleIndexSelect(event: CustomEvent<string>) {
    selectedFile = event.detail;
    await loadStocksFromFile(selectedFile);
  }

  async function handleIntervalChange(event: CustomEvent<Interval>) {
    selectedInterval = event.detail;
    if ($currentStock) {
      await loadStockData($currentStock, selectedInterval);
    }
  }

  async function loadStocksFromFile(file: string) {
    $loading = true;
    $error = null;
    try {
      const response = await fetch(`/${file}`);
      $stocks = await response.json();
      if ($stocks.length > 0) {
        currentIndex = 0;
        await loadStockData($stocks[currentIndex], selectedInterval);
      }
    } catch (err) {
      $error = 'Failed to load stocks';
      console.error(err);
    } finally {
      $loading = false;
    }
  }

  async function loadStockData(stock: Stock, interval: Interval) {
    $loading = true;
    $error = null;
    try {
      $currentStock = stock;
      $stockData = await fetchYahooFinanceData(stock.Symbol, interval.value, interval.range);
    } catch (err) {
      $error = 'Failed to load stock data';
      console.error(err);
    } finally {
      $loading = false;
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      currentIndex--;
      loadStockData($stocks[currentIndex], selectedInterval);
    }
  }

  function handleNext() {
    if (currentIndex < totalStocks - 1) {
      currentIndex++;
      loadStockData($stocks[currentIndex], selectedInterval);
    }
  }

  onMount(() => {
    if (selectedFile) {
      loadStocksFromFile(selectedFile);
    }
  });
</script>

<main class="min-h-screen bg-gray-100 p-4 md:p-8">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Stock Chart Viewer</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <IndexSelector on:select={handleIndexSelect} />
      <IntervalSelector on:change={handleIntervalChange} />
    </div>

    {#if $loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    {:else if $error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{$error}</p>
      </div>
    {:else if $stockData.length > 0 && $currentStock}
      <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <StockChart data={$stockData} stockName={$currentStock["Company Name"]} />
      </div>
    {/if}
    <PaginationControls 
      {currentIndex}
      {totalStocks}
      on:previous={handlePrevious}
      on:next={handleNext}
    />
  </div>
</main>

