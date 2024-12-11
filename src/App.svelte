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
  let isMenuOpen = false;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
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
  // add event listener for keydown event
  window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      }
    });
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

  <!-- Redesigned Responsive Footer -->
 <footer
    class="flex-shrink-0 shadow-md transition-all duration-300 ease-in-out"
    class:bg-slate-50={$theme === 'light'}
    class:border-slate-600={$theme === 'light'}
    class:bg-slate-950={$theme === 'dark'}
    class:border-slate-400={$theme === 'dark'}
    class:h-16={!isMenuOpen}
    class:h-auto={isMenuOpen}
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Always visible controls -->
        <div class="flex items-center space-x-4">
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

        <!-- Navigation buttons -->
        <div class="flex items-center space-x-4">
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

        <!-- Menu toggle for mobile -->
        <div class="flex md:hidden">
          <button
            class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
            on:click={toggleMenu}
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      <!-- Expandable menu items -->
      <div class="md:flex md:items-center md:justify-between" class:hidden={!isMenuOpen}>
        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 py-4 md:py-0">
          <IndexSelector on:select={handleIndexSelect} />
          <IntervalSelector on:change={handleIntervalChange} />
        </div>
        <div class="flex items-center space-x-4 py-4 md:py-0">
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
            <Star class="w-5 h-5" class:text-yellow-500={$currentStock && $favorites.has($currentStock.Symbol)} />
          </button>
          <button
            class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
            on:click={toggleTradingViewModal}
          >
            <Info class="w-5 h-5" />
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
