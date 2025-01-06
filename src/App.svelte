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
  let selectedFile = 'largecaps.json';
  let selectedInterval: Interval = { label: 'D', value: '1d', range: '2y' };
  let isFullscreen = false;
  let showFavoritesModal = false;
  let showTradingViewModal = false;

  let vh: number;
  let chartData1: any = null;
  let chartData2: any = null;

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
    await loadDataForCurrentIndex();
  }

  async function loadStocksFromFile(file: string) {
    $loading = true;
    $error = null;

    try {
      const response = await fetch(`/${file}`);
      $stocks = await response.json();

      if ($stocks.length > 0) {
        currentIndex = 0;
        await loadDataForCurrentIndex();
      }
    } catch (err) {
      $error = 'Failed to load stocks';
      console.error(err);
    } finally {
      $loading = false;
    }
  }

  async function loadStockData(stock: Stock, interval: Interval) {
    try {
      return await fetchYahooFinanceData(stock.Symbol, interval.value, interval.range);
    } catch (err) {
      $error = 'Failed to load stock data';
      console.error(err);
      return null;
    }
  }

  async function loadDataForCurrentIndex() {
    if (currentIndex < totalStocks) {
      chartData1 = await loadStockData($stocks[currentIndex], selectedInterval);
    }
    if (currentIndex + 1 < totalStocks) {
      chartData2 = await loadStockData($stocks[currentIndex + 1], selectedInterval);
    }
  }

  function handlePrevious() {
    if (currentIndex > 1) {
      currentIndex -= 2;
      loadDataForCurrentIndex();
    }
  }

  function handleNext() {
    if (currentIndex < totalStocks - 2) {
      currentIndex += 2;
      loadDataForCurrentIndex();
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

  onMount(async () => {
    updateVHUnit();
    window.addEventListener('resize', throttledUpdateVH);
    window.addEventListener('orientationchange', throttledUpdateVH);

    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
      throttledUpdateVH();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    await loadStocksFromFile(selectedFile);
    await loadDataForCurrentIndex();

    return () => {
      window.removeEventListener('resize', throttledUpdateVH);
      window.removeEventListener('orientationchange', throttledUpdateVH);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });
</script>

<main
  id="app"
  class="max-w-full mx-auto flex flex-col overflow-hidden"
  class:bg-slate-50={$theme === 'light'}
  class:text-slate-900={$theme === 'light'}
  class:bg-slate-900={$theme === 'dark'}
  class:text-slate-50={$theme === 'dark'}
  style="height: {vh ? `${vh * 100}px` : '80vh'};"
>
  <!-- Content Area -->
  <div class="flex flex-grow overflow-auto">
    <!-- Main Content -->
    <div class="flex-grow flex flex-row">
      {#if $loading}
        <div class="flex justify-center items-center flex-grow">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-slate-400"></div>
        </div>
      {:else if $error}
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4" role="alert">
          <p>{$error}</p>
        </div>
      {:else}
        <div class="flex-grow flex flex-col w-1/2 relative">
          {#if chartData1 && $stocks[currentIndex]}
            <StockChart data={chartData1} stockName={$stocks[currentIndex].Symbol} />
            <button
              on:click={() => handleToggleFavorite($stocks[currentIndex])}
              class="absolute top-2 right-2 p-2 hover:text-orange-600 focus:outline-none"
              class:text-slate-800={$theme === 'light'}
              class:text-slate-200={$theme === 'dark'}
            >
              <span class="w-5 h-5" class:text-orange-700={$favorites.has($stocks[currentIndex].Symbol)}>
                <Star />
              </span>
            </button>
          {/if}
        </div>
        <div class="flex-grow flex flex-col w-1/2 relative">
          {#if chartData2 && $stocks[currentIndex + 1]}
            <StockChart data={chartData2} stockName={$stocks[currentIndex + 1].Symbol} />
            <button
              on:click={() => handleToggleFavorite($stocks[currentIndex + 1])}
              class="absolute top-2 right-2 p-2 hover:text-orange-600 focus:outline-none"
              class:text-slate-800={$theme === 'light'}
              class:text-slate-200={$theme === 'dark'}
            >
              <span class="w-5 h-5" class:text-orange-700={$favorites.has($stocks[currentIndex + 1].Symbol)}>
                <Star />
              </span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Sticky Footer -->
  <footer class="h-8 flex-shrink-0 shadow-md"
    class:bg-white={$theme === 'light'}
    class:border-slate-600={$theme === 'light'}
    class:bg-slate-950={$theme === 'dark'}
    class:border-slate-400={$theme === 'dark'}
  >
    <div class="max-w-full mx-auto px-2 h-full flex items-center justify-between space-x-2">
      <div class="flex items-center space-x-2">
        <button
          class="p-2 hover:text-slate-900 focus:outline-none lg:hidden"
          class:text-slate-800={$theme === 'light'}
          class:text-slate-200={$theme === 'dark'}
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
          class="p-2 hover:text-slate-800 focus:outline-none"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
          on:click={toggleFavoritesModal}
        >
          <List class="w-5 h-5" />
        </button>
      </div>
      <div class="flex items-center mr-8 space-x-2">
        <button
          class="flex items-center gap-2 py-2 px-2"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft class="w-5 h-5" />
          <span>Prev</span>
        </button>
        <button
          class="flex items-center gap-2 py-2 px-2"
          class:text-slate-900={$theme === 'light'}
          class:text-slate-100={$theme === 'dark'}
          on:click={handleNext}
          disabled={currentIndex >= totalStocks - 2}
        >
          <span>Next</span>
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
