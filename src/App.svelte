<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import FavoriteStocks from './lib/components/FavoriteStocks.svelte';
  import FavoritesModal from './lib/components/FavoritesModal.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites, toggleFavorite } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { Star, ArrowLeft, ArrowRight, Expand, Shrink, List } from 'lucide-svelte';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '6mo' };
  let isFullscreen = false;
  let showFavoritesModal = false;
  let vh: number;

  $: totalStocks = $stocks.length;

  function updateVHUnit() {
    vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          isFullscreen = true;
          setTimeout(throttledUpdateVH, 100);
        })
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => {
          isFullscreen = false;
          setTimeout(throttledUpdateVH, 100);
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

  function handleToggleFavorite(stock: Stock) {
    toggleFavorite(stock.Symbol);
  }

  function toggleFavoritesModal() {
    showFavoritesModal = !showFavoritesModal;
  }

  onMount(() => {
    updateVHUnit();
    window.addEventListener('resize', throttledUpdateVH);
    window.addEventListener('orientationchange', throttledUpdateVH);

    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
      throttledUpdateVH();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

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
  class="flex flex-col bg-slate-950 text-slate-100 overflow-hidden"
  style="height: {vh ? `${vh * 100}px` : '100vh'};"
>
  <!-- Content Area -->
  <div class="flex flex-grow overflow-auto">
    <!-- Main Content -->
    <div class="flex-grow flex flex-col">
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
  <footer class="h-12 flex-shrink-0 bg-slate-950 border-t border-slate-600 shadow-md">
    <div class="mx-auto px-2 h-full flex items-center justify-between space-x-4">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-slate-100 hover:text-slate-50 focus:outline-none lg:hidden"
          on:click={toggleFullscreen}
        >
          {#if isFullscreen}
            <Shrink class="w-5 h-5" />
          {:else}
            <Expand class="w-5 h-5" />
          {/if}
        </button>
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
        <button
          class="p-2 text-slate-100 hover:text-slate-50 focus:outline-none"
          on:click={toggleFavoritesModal}
        >
          <List class="w-5 h-5" />
        </button>
        <button
          on:click={() => $currentStock && handleToggleFavorite($currentStock)}
          class="p-2 text-slate-300 hover:text-yellow-500 focus:outline-none"
        >
          <span
            class="w-5 h-5"
            class:text-yellow-500={$currentStock && $favorites.has($currentStock.Symbol)}
          >
            <Star />
          </span>
        </button>
      </div>
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-slate-100 hover:text-slate-50 focus:outline-none disabled:opacity-50"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <button
          class="p-2 text-slate-100 hover:text-slate-50 focus:outline-none disabled:opacity-50"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <ArrowRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </footer>
  {#if showFavoritesModal}
    <FavoritesModal on:close={toggleFavoritesModal} />
  {/if}
</main>
