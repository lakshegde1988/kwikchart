<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { FaArrowLeft, FaArrowRight, FaExpand, FaCompress } from 'svelte-icons/fa';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };
  let isFullscreen = false;

  $: totalStocks = $stocks.length;

  // Dynamically update `--vh` on viewport changes
  function updateVHUnit() {
    const vh = window.innerHeight * 0.01; // Calculate 1vh as 1% of the viewport height
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // Throttle function to reduce event spam
  function throttle(fn: () => void, delay: number) {
    let timeout: NodeJS.Timeout | null = null;
    return () => {
      if (!timeout) {
        timeout = setTimeout(() => {
          fn();
          timeout = null;
        }, delay);
      }
    };
  }

  const throttledUpdateVH = throttle(updateVHUnit, 200);

  // Fullscreen API logic
  function toggleFullscreen() {
    const appElement = document.documentElement;
    if (!isFullscreen) {
      appElement.requestFullscreen?.()
        .then(() => {
          isFullscreen = true;
          setTimeout(() => window.dispatchEvent(new Event('resize')), 100); // Trigger resize after entering fullscreen
        })
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen?.()
        .then(() => {
          isFullscreen = false;
          setTimeout(() => window.dispatchEvent(new Event('resize')), 100); // Trigger resize after exiting fullscreen
        })
        .catch((err) => console.error('Error exiting fullscreen:', err));
    }
  }

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
        $currentStock = $stocks[currentIndex];
        await loadStockData($currentStock, selectedInterval);
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
    updateVHUnit(); // Initial calculation for dynamic height
    window.addEventListener('resize', throttledUpdateVH);
    window.addEventListener('orientationchange', throttledUpdateVH);

    // Detect fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        isFullscreen = false;
        throttledUpdateVH(); // Adjust layout after exiting fullscreen
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Load default file and first stock
    loadStocksFromFile(selectedFile);

    return () => {
      window.removeEventListener('resize', throttledUpdateVH);
      window.removeEventListener('orientationchange', throttledUpdateVH);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });
</script>

<main
  id="app"
  class="flex flex-col bg-gray-100 text-gray-800 overflow-hidden"
  style="height: calc(var(--vh, 1vh) * 100);"
>
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

         <button
          class="p-2 text-gray rounded-md lg:hidden flex items-center justify-center"
              on:click={toggleFullscreen}
            >
              <div class="w-5 h-5">
                {#if isFullscreen}
                  <FaCompress />
                {:else}
                  <FaExpand />
                {/if}
              </div>
          </button>
      <div class="flex items-center space-x-2 sm:space-x-4">
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
      </div>
      <!-- Right: Pagination + Fullscreen Button -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <div class="w-5 h-5">
            <FaArrowLeft />
          </div>
        </button>
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <div class="w-5 h-5">
            <FaArrowRight />
          </div>
        </button>
       
      </div>
    </div>
  </footer>
</main>
