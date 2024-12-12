<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import FavoritesModal from './lib/components/FavoritesModal.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
  import TradingViewModal from './lib/components/TradingViewModal.svelte';
  import { theme } from './lib/stores/themeStore';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites, toggleFavorite } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { Star, ArrowLeft, ArrowRight, Expand, Shrink, List, Info } from 'lucide-svelte';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: '3M', value: '1d', range: '3mo' };
  let isFullscreen = false;
  let showFavoritesModal = false;
  let showTradingViewModal = false;
  let vh: number;

  $: totalStocks = $stocks.length;
  $: { document.documentElement.setAttribute('data-theme', $theme); }

  const updateVHUnit = () => {
    vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  const throttle = (fn: () => void, delay: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return () => {
      if (!timeout) {
        timeout = setTimeout(() => {
          fn();
          timeout = null;
        }, delay);
      }
    };
  };

  const throttledUpdateVH = throttle(updateVHUnit, 200);

  const toggleFullscreen = () => {
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
  };

  const toggleTradingViewModal = () => showTradingViewModal = !showTradingViewModal;
  const toggleFavoritesModal = () => showFavoritesModal = !showFavoritesModal;

  const handleIndexSelect = async (event: CustomEvent<string>) => {
    selectedFile = event.detail;
    await loadStocksFromFile(selectedFile);
  };

  const handleIntervalChange = async (event: CustomEvent<Interval>) => {
    selectedInterval = event.detail;
    if ($currentStock) {
      await loadStockData($currentStock, selectedInterval);
    }
  };

  const loadStocksFromFile = async (file: string) => {
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
  };

  const loadStockData = async (stock: Stock, interval: Interval) => {
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
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      currentIndex--;
      loadStockData($stocks[currentIndex], selectedInterval);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalStocks - 1) {
      currentIndex++;
      loadStockData($stocks[currentIndex], selectedInterval);
    }
  };

  const handleToggleFavorite = (stock: Stock) => toggleFavorite(stock.Symbol);

  onMount(() => {
    updateVHUnit();
    window.addEventListener('resize', throttledUpdateVH);
    window.addEventListener('orientationchange', throttledUpdateVH);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') handlePrevious();
      else if (event.key === 'ArrowRight') handleNext();
    });

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
  class="flex flex-col overflow-hidden {$theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-50'}"
  style="height: {vh ? `${vh * 100}px` : '100vh'};"
>
  <div class="flex flex-grow overflow-auto">
    <div class="flex-grow flex flex-col">
      {#if $loading}
        <div class="flex justify-center items-center flex-grow">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-slate-400"></div>
        </div>
      {:else if $error}
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4" role="alert">
          <p>{$error}</p>
        </div>
      {:else if $stockData.length > 0 && $currentStock}
        <div class="flex-grow">
          <StockChart data={$stockData} stockName={$currentStock["Symbol"]} />
        </div>
      {/if}
    </div>
  </div>

  <footer class="h-12 flex-shrink-0 shadow-md {$theme === 'light' ? 'bg-slate-50 border-slate-600' : 'bg-slate-950 border-slate-400'}">
    <div class="max-w-4xl mx-auto px-2 h-full flex items-center justify-between">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <ThemeToggle />
        <button
          class="p-2 hover:text-slate-900 focus:outline-none lg:hidden {$theme === 'light' ? 'text-slate-800' : 'text-slate-200'}"
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
          class="p-2 hover:text-slate-800 focus:outline-none {$theme === 'light' ? 'text-slate-900' : 'text-slate-100'}"
          on:click={toggleFavoritesModal}
        >
          <List class="w-5 h-5" />
        </button>
        <button
          on:click={() => $currentStock && handleToggleFavorite($currentStock)}
          class="p-2 hover:text-orange-600 focus:outline-none {$theme === 'light' ? 'text-slate-800' : 'text-slate-200'}"
        >
          <span class="w-5 h-5" class:text-orange-700={$currentStock && $favorites.has($currentStock.Symbol)}>
            <Star />
          </span>
        </button>
        <button
          on:click={toggleTradingViewModal}
          class="p-2 hover:text-slate-800 focus:outline-none {$theme === 'light' ? 'text-slate-900' : 'text-slate-100'}"
        >
          <Info class="w-5 h-5" />
        </button>
      </div>
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="py-2 px-4 {$theme === 'light' ? 'text-slate-900' : 'text-slate-100'}"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <span class="lg:block hidden">Previous</span>
          <ArrowLeft class="w-5 h-5 lg:hidden" />
        </button>
        <button
          class="py-2 px-4 {$theme === 'light' ? 'text-slate-900' : 'text-slate-100'}"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <span class="lg:block hidden">Next</span>
          <ArrowRight class="w-5 h-5 lg:hidden" />
        </button>
      </div>
    </div>
  </footer>

  {#if showFavoritesModal}
    <FavoritesModal on:close={toggleFavoritesModal} />
  {/if}

  {#if showTradingViewModal && $currentStock}
    <TradingViewModal symbol={$currentStock.Symbol} onClose={toggleTradingViewModal} />
  {/if}
</main>

<style>
  :global(html) {
    overflow: hidden;
  }

  :global(body) {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: calc(var(--vh, 1vh) * 100);
  }

  @media (min-width: 640px) {
    .sm\:space-x-4 > :not([hidden]) ~ :not([hidden]) {
      --tw-space-x-reverse: 0;
      margin-right: calc(1rem * var(--tw-space-x-reverse));
      margin-left: calc(1rem * calc(1 - var(--tw-space-x-reverse)));
    }
  }
</style>

