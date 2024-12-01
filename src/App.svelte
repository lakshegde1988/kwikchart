<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';
  import type { Stock, StockData, Interval } from './lib/types';
  import { FaArrowLeft, FaArrowRight } from 'svelte-icons/fa';

  let currentIndex = 0;
  let selectedFile = '';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };
  let isFullscreen = false;

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

  // Fullscreen API logic
  function toggleFullscreen() {
    const appElement = document.documentElement; // Use the whole page, not just #app
    if (!isFullscreen) {
      if (appElement.requestFullscreen) {
        appElement.requestFullscreen()
          .then(() => {
            console.log("Fullscreen enabled");
            isFullscreen = true;
          })
          .catch(err => console.error('Error entering fullscreen:', err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            console.log("Fullscreen exited");
            isFullscreen = false;
          })
          .catch(err => console.error('Error exiting fullscreen:', err));
      }
    }
  }

  // Listen for fullscreen changes
  onMount(() => {
    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  onMount(() => {
    if (selectedFile) {
      loadStocksFromFile(selectedFile);
    }
  });
</script>

<main id="app" class="flex flex-col h-[100dvh] bg-gray-100 overflow-hidden">
  <!-- Content Area -->
  <div class="flex-grow">
    <div class="h-full flex flex-col">
      {#if $loading}
        <div class="flex justify-center items-center flex-grow">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      {:else if $error}
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4" role="alert">
          <p>{$error}</p>
        </div>
      {:else if $stockData.length > 0 && $currentStock}
        <div class="flex-grow">
          <StockChart data={$stockData} stockName={$currentStock["Company Name"]} />
        </div>
      {/if}
    </div>
  </div>

  <!-- Sticky Footer -->
  <footer class="h-16 flex-shrink-0 bg-white border-t border-gray-200 shadow-md">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between space-x-4">
      <!-- Left: Selectors -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
      </div>

      <!-- Right: Pagination + Fullscreen Button -->
      <div class="flex items-center space-x-4">
        <!-- Previous Button -->
        <button
          class="p-2 text-base text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <div class="w-6 h-6">
            <FaArrowLeft />
          </div>
        </button>
      
        <!-- Next Button -->
        <button
          class="p-2 text-base text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <div class="w-6 h-6">
            <FaArrowRight />
          </div>
        </button>

        <!-- Fullscreen Button -->
        <button
          class="p-2 bg-blue-500 text-white rounded-md sm:hidden"
          on:click={toggleFullscreen}
        >
          Full Screen
        </button>
      </div>
    </div>
  </footer>
</main>
