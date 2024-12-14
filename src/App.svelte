<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import FavoritesModal from './lib/components/FavoritesModal.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
  import TradingViewModal from './lib/components/TradingViewModal.svelte';
  import { Menu, List, Info, ArrowLeft, ArrowRight, Expand, Shrink } from 'lucide-svelte';

  import { theme } from './lib/stores/themeStore';

  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites, toggleFavorite } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: '3M', value: '1d', range: '3mo' };
  let isFullscreen = false;
  let showFavoritesModal = false;
  let showTradingViewModal = false;
  let menuOpen = false;

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

  function toggleMenu() {
    menuOpen = !menuOpen;
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function handleMenuOptionClick(action: () => void) {
    action();
    toggleMenu();
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

  // add event listener for keydown event
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    }
  });
</script>

<main
  id="app"
  class="flex flex-col overflow-hidden"
  class:bg-slate-50={$theme === 'light'}
  class:text-slate-900={$theme === 'light'}
  class:bg-slate-900={$theme === 'dark'}
  class:text-slate-50={$theme === 'dark'}
  style="height: {vh ? `${vh * 100}px` : '100vh'};"
>
  <!-- Content Area -->
  <div class="flex flex-grow overflow-auto">
    <!-- Main Content -->
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

  <!-- Sticky Footer -->
  <footer class="h-12 flex-shrink-0 shadow-md"
    class:bg-slate-50={$theme === 'light'}
    class:border-slate-600={$theme === 'light'}
    class:bg-slate-950={$theme === 'dark'}
    class:border-slate-400={$theme === 'dark'}
  >
    <div class="max-w-4xl mx-auto px-2 h-full flex items-center justify-between space-x-4">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          on:click={toggleMenu}
          class="p-2 hover:text-slate-800 focus:outline-none"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
        >
          <Menu class="w-5 h-5" />
        </button>
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
        <button
          on:click={toggleFullscreen}
          class="p-2 hover:text-slate-800 focus:outline-none"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
        >
          {#if isFullscreen}
            <Shrink class="w-5 h-5" />
          {:else}
            <Expand class="w-5 h-5" />
          {/if}
        </button>
      </div>
      <div class="flex items-center mr-8 space-x-2 sm:space-x-4">
        <button
          class="py-2 px-4"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <span class="lg:block hidden">Previous</span>
          <ArrowLeft class="w-5 h-5 lg:hidden" />
        </button>
        <button
          class="py-2 px-4"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <span class="lg:block hidden">Next</span>
          <ArrowRight class="w-5 h-5 lg:hidden" />
        </button>
      </div>
    </div>
  </footer>
  {#if menuOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-40" on:click={toggleMenu}></div>
    <div class="fixed inset-y-0 right-0 w-64 bg-slate-50 dark:bg-slate-800 shadow-lg p-4 z-50 flex flex-col justify-center">
      <button
        on:click={() => handleMenuOptionClick(toggleFavoritesModal)}
        class="flex items-center space-x-2 p-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg mb-4"
        class:text-slate-900={$theme === 'light'}
        class:text-slate-100={$theme === 'dark'}
      >
        <List class="w-5 h-5" />
        <span>Favorites</span>
      </button>
      <div class="flex items-center space-x-2 p-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg mb-4">
        <ThemeToggle on:click={toggleMenu} />
        <span>Theme</span>
      </div>
      <button
        on:click={() => handleMenuOptionClick(toggleTradingViewModal)}
        class="flex items-center space-x-2 p-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
        class:text-slate-900={$theme === 'light'}
        class:text-slate-100={$theme === 'dark'}
      >
        <Info class="w-5 h-5" />
        <span>Info</span>
      </button>
    </div>
  {/if}
  {#if showFavoritesModal}
    <FavoritesModal on:close={toggleFavoritesModal} />
  {/if}
  {#if showTradingViewModal && $currentStock}
    <TradingViewModal symbol={$currentStock.Symbol} onClose={toggleTradingViewModal} />
  {/if}
</main>

