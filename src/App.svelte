<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { FaArrowLeft, FaArrowRight, FaExpand, FaCompress, FaMoon, FaSun } from 'svelte-icons/fa';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };
  let isFullscreen = false;

  $: totalStocks = $stocks.length;

  // Theme toggle
  const theme = writable('light'); // Default to light theme

  // Sync theme with localStorage
  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    theme.set(savedTheme);
    applyTheme(savedTheme);

    const unsubscribe = theme.subscribe((value) => {
      applyTheme(value);
    });

    return () => unsubscribe();
  });

  function toggleTheme() {
    theme.update((current) => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }

  function applyTheme(theme: string) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  // Fullscreen API logic
  function toggleFullscreen() {
    const appElement = document.documentElement; // Fullscreen the entire page
    if (!isFullscreen) {
      appElement.requestFullscreen?.()
        .then(() => {
          isFullscreen = true;

          // Trigger resize after entering fullscreen
          window.dispatchEvent(new Event('resize'));
        })
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen?.()
        .then(() => {
          isFullscreen = false;

          // Trigger resize after exiting fullscreen
          window.dispatchEvent(new Event('resize'));
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
</script>

<main id="app" class="flex flex-col h-[100dvh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden">
  <!-- Theme Toggle Button -->
  <button
    class="fixed top-4 right-4 z-50 p-2 bg-gray-200 dark:bg-gray-800 rounded-full shadow-md focus:outline-none"
    on:click={toggleTheme}
  >
    <div class="w-6 h-6">
      {#if $theme === 'dark'}
        <FaSun /> <!-- Light mode icon -->
      {:else}
        <FaMoon /> <!-- Dark mode icon -->
      {/if}
    </div>
  </button>

  <!-- Content Area -->
  <div class="flex-grow">
    <div class="h-full flex flex-col">
      {#if $loading}
        <div class="flex justify-center items-center flex-grow">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      {:else if $error}
        <div class="bg-red-100 dark:bg-red-800 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mx-4" role="alert">
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
  <footer class="h-16 flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between space-x-4">
      <!-- Left: Selectors -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
      </div>

      <!-- Right: Pagination + Fullscreen Button -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <!-- Previous Button -->
        <button
          class="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none disabled:text-gray-400"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <div class="w-5 h-5">
            <FaArrowLeft />
          </div>
        </button>

        <!-- Next Button -->
        <button
          class="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none disabled:text-gray-400"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <div class="w-5 h-5">
            <FaArrowRight />
          </div>
        </button>

        <!-- Fullscreen Button -->
        <button
          class="p-2 bg-blue-500 text-white rounded-md lg:hidden flex items-center justify-center"
          on:click={toggleFullscreen}
        >
          <div class="w-5 h-5">
            {#if isFullscreen}
              <FaCompress /> <!-- Icon for exiting fullscreen -->
            {:else}
              <FaExpand /> <!-- Icon for entering fullscreen -->
            {/if}
          </div>
        </button>
      </div>
    </div>
  </footer>
</main>
