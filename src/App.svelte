<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import FavoritesModal from './lib/components/FavoritesModal.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites, toggleFavorite } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { Star, ArrowLeft, ArrowRight, Expand, Shrink } from 'lucide-svelte';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };
  let isFullscreen = false;
  let showFavoritesModal = false;
  let appContainer: HTMLElement;

  $: totalStocks = $stocks.length;

  function updateAppHeight() {
    if (appContainer) {
      appContainer.style.height = `${window.innerHeight}px`;
    }
  }

  // Fullscreen API logic
  function toggleFullscreen() {
    if (!isFullscreen) {
      appContainer.requestFullscreen?.()
        .then(() => {
          isFullscreen = true;
        })
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen?.()
        .then(() => {
          isFullscreen = false;
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

  function toggleFavoritesModal() {
    showFavoritesModal = !showFavoritesModal;
  }

  onMount(() => {
    updateAppHeight();
    
    const resizeObserver = new ResizeObserver(() => {
      updateAppHeight();
    });
    
    resizeObserver.observe(appContainer);

    loadStocksFromFile(selectedFile);

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<main
  bind:this={appContainer}
  class="flex flex-col bg-gray-100 text-gray-800 overflow-hidden h-screen"
>
  <!-- Chart Container -->
  <div class="flex-grow overflow-hidden">
    {#if $loading}
      <div class="flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    {:else if $error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
        <p>{$error}</p>
      </div>
    {:else if $stockData.length > 0 && $currentStock}
      <StockChart data={$stockData} />
    {/if}
  </div>

  <!-- Sticky Footer -->
  <footer class="h-16 flex-shrink-0 bg-white border-t border-gray-200 shadow-md sticky bottom-0 w-full">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
      <!-- Left: Selectors -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <IndexSelector class="text-sm sm:text-base" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base" on:change={handleIntervalChange} />
      </div>
      <!-- Right: Controls -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:opacity-50"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:opacity-50"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <ArrowRight class="w-5 h-5" />
        </button>
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
          on:click={toggleFullscreen}
        >
          {#if isFullscreen}
            <Shrink class="w-5 h-5" />
          {:else}
            <Expand class="w-5 h-5" />
          {/if}
        </button>
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
          on:click={toggleFavoritesModal}
        >
          <Star class="w-5 h-5" />
        </button>
      </div>
    </div>
  </footer>
</main>

{#if showFavoritesModal}
  <FavoritesModal on:close={toggleFavoritesModal} />
{/if}

