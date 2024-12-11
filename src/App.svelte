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

  $: {
    document.documentElement.setAttribute('data-theme', $theme);
  }

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

  function toggleTradingViewModal() {
    showTradingViewModal = !showTradingViewModal;
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
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      }
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
  class="flex flex-col h-screen overflow-hidden"
  class:bg-slate-50={$theme === 'light'}
  class:text-slate-900={$theme === 'light'}
  class:bg-slate-900={$theme === 'dark'}
  class:text-slate-50={$theme === 'dark'}
>
  <!-- Content Area -->
  <div class="flex-grow overflow-auto">
    <!-- Main Content -->
    <div class="h-full flex flex-col">
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

  <!-- Footer -->
  <footer class="bg-slate-100 dark:bg-slate-800 shadow-md py-2 px-4">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center space-x-2">
        <ThemeToggle />
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
          on:click={toggleFullscreen}
        >
          {#if isFullscreen}
            <Shrink class="w-5 h-5" />
          {:else}
            <Expand class="w-5 h-5" />
          {/if}
        </button>
      </div>
      
      <div class="flex items-center space-x-2">
        <IndexSelector on:select={handleIndexSelect} />
        <IntervalSelector on:change={handleIntervalChange} />
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
          on:click={toggleFavoritesModal}
        >
          <List class="w-5 h-5" />
        </button>
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
          on:click={() => $currentStock && handleToggleFavorite($currentStock)}
        >
          <span class="w-5 h-5" class:text-yellow-500={$currentStock && $favorites.has($currentStock.Symbol)}>
            <Star />
          </span>
        </button>
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
          on:click={toggleTradingViewModal}
        >
          <Info class="w-5 h-5" />
        </button>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <button
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
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
  {#if showTradingViewModal && $currentStock}
    <TradingViewModal symbol={$currentStock.Symbol} onClose={toggleTradingViewModal} />
  {/if}
</main>

