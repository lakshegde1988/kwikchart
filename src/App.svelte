<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import PaginationControls from './lib/components/PaginationControls.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import type { Stock, StockData, Interval } from './lib/types';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';

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

<main class="h-screen flex flex-col bg-gray-100">
  <!-- Content Area -->
  <div class="flex-grow flex flex-col max-w-7xl mx-auto p-4 md:p-8">
    {#if $loading}
      <div class="flex justify-center items-center flex-grow">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    {:else if $error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{$error}</p>
      </div>
    {:else if $stockData.length > 0 && $currentStock}
      <div class="flex-grow bg-white rounded-lg shadow-md p-4 mb-6">
        <StockChart data={$stockData} stockName={$currentStock["Company Name"]} />
      </div>
    {/if}
  </div>

  <!-- Sticky Footer -->
  <footer class="sticky bottom-0 bg-white border-t border-gray-200 shadow-md">
    <div class="max-w-7xl mx-auto p-4 flex flex-col sm:flex-row sm:justify-between items-center space-y-4 sm:space-y-0">
      <!-- Left: Selectors -->
      <div class="flex flex-wrap items-center space-x-4 space-y-2 sm:space-y-0">
        <IndexSelector on:select={handleIndexSelect} />
        <IntervalSelector on:change={handleIntervalChange} />
      </div>

      <!-- Right: Pagination Controls -->
      <PaginationControls 
        {currentIndex}
        {totalStocks}
        on:previous={handlePrevious}
        on:next={handleNext}
      />
    </div>
  </footer>
</main>
