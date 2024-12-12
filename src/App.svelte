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
  let isMobile: boolean;

  $: totalStocks = $stocks.length;
  $: { document.documentElement.setAttribute('data-theme', $theme); }

  const updateVHUnit = () => {
    vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    isMobile = window.innerWidth < 768;
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
  <header class="bg-primary text-primary-foreground p-4 shadow-md">
    <div class="flex justify-between items-center">
      <h1 class="text-xl font-bold">Stock Tracker</h1>
      <div class="flex items-center space-x-2">
        <ThemeToggle />
        <button
          class="p-2 rounded-full hover:bg-primary-foreground/10 focus:outline-none"
          on:click={toggleFullscreen}
        >
          {#if isFullscreen}
            <Shrink class="w-5 h-5" />
          {:else}
            <Expand class="w-5 h-5" />
          {/if}
        </button>
      </div>
    </div>
  </header>

  <div class="flex-grow overflow-auto p-4">
    {#if $loading}
      <div class="flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    {:else if $error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
        <p>{$error}</p>
      </div>
    {:else if $stockData.length > 0 && $currentStock}
      <div class="h-full">
        <StockChart data={$stockData} stockName={$currentStock["Symbol"]} />
      </div>
    {/if}
  </div>

  <footer class="bg-secondary text-secondary-foreground shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <div class="flex flex-wrap justify-center sm:justify-start items-center space-x-2 sm:space-x-4">
          <IndexSelector class="text-sm sm:text-base" on:select={handleIndexSelect} />
          <IntervalSelector class="text-sm sm:text-base" on:change={handleIntervalChange} />
          <button
            class="p-2 rounded-full hover:bg-secondary-foreground/10 focus:outline-none"
            on:click={toggleFavoritesModal}
          >
            <List class="w-5 h-5" />
          </button>
          <button
            on:click={() => $currentStock && handleToggleFavorite($currentStock)}
            class="p-2 rounded-full hover:bg-secondary-foreground/10 focus:outline-none"
          >
            <span class="w-5 h-5" class:text-yellow-500={$currentStock && $favorites.has($currentStock.Symbol)}>
              <Star />
            </span>
          </button>
          <button
            on:click={toggleTradingViewModal}
            class="p-2 rounded-full hover:bg-secondary-foreground/10 focus:outline-none"
          >
            <Info class="w-5 h-5" />
          </button>
        </div>
        <div class="flex items-center space-x-2 sm:space-x-4">
          <button
            class="py-2 px-4 rounded hover:bg-secondary-foreground/10 focus:outline-none"
            on:click={handlePrevious}
            disabled={currentIndex === 0}
          >
            <span class="sm:hidden"><ArrowLeft class="w-5 h-5" /></span>
            <span class="hidden sm:inline">Previous</span>
          </button>
          <button
            class="py-2 px-4 rounded hover:bg-secondary-foreground/10 focus:outline-none"
            on:click={handleNext}
            disabled={currentIndex === totalStocks - 1}
          >
            <span class="sm:hidden"><ArrowRight class="w-5 h-5" /></span>
            <span class="hidden sm:inline">Next</span>
          </button>
        </div>
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

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .sm\:hidden {
      display: none;
    }
  }

  @media (min-width: 641px) {
    .hidden.sm\:inline {
      display: inline;
    }
  }
</style>

