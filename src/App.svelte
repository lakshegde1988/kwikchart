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
  import { Star, ArrowLeft, ArrowRight, Expand, Shrink, FileHeart, Info } from 'lucide-svelte';

  let currentIndex = 0;
  let selectedFile = 'largecaps.json';
  let selectedInterval: Interval = { label: 'Q', value: '1d', range: '3mo' };
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
  class="max-w-2xl mx-auto flex flex-col h-dvh overflow-hidden"
  class:bg-white={$theme === 'light'}
  class:text-slate-900={$theme === 'light'}
  class:bg-slate-900={$theme === 'dark'}
  class:text-slate-50={$theme === 'dark'}
  style="height: {vh ? `${vh * 100}px` : '80vh'};"
>
  <!-- Content Area -->
  <div class="flex flex-grow overflow-auto justify-center items-center">
    {#if $loading}
      <div class="flex justify-center items-center flex-grow">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-slate-400"></div>
      </div>
    {:else if $error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4" role="alert">
        <p>{$error}</p>
      </div>
    {:else if $stockData.length > 0 && $currentStock}
      <!-- Responsive Chart Container -->
      <div class="w-full h-full sm:h-3/4 sm:max-w-md flex justify-center items-center">
        <StockChart data={$stockData} stockName={$currentStock["Symbol"]} />
      </div>
    {/if}
  </div>

  <!-- Sticky Footer -->
  <footer class="h-8 flex-shrink-0">
    <div class="mx-auto px-2 h-full flex items-center justify-between space-x-2">
      <button class="p-2" on:click={toggleFullscreen}>
        {#if isFullscreen}
          <Shrink class="w-5 h-5" />
        {:else}
          <Expand class="w-5 h-5" />
        {/if}
      </button>
      <IndexSelector on:select={handleIndexSelect} />
      <IntervalSelector on:change={handleIntervalChange} />
      <button on:click={toggleFavoritesModal}>
        <FileHeart class="w-5 h-5" />
      </button>
      <button on:click={() => $currentStock && handleToggleFavorite($currentStock)}>
        <Star class="w-5 h-5" />
      </button>
      <button on:click={handlePrevious} disabled={currentIndex === 0}>
        <ArrowLeft class="w-5 h-5" /> Prev
      </button>
      <button on:click={handleNext} disabled={currentIndex === totalStocks - 1}>
        Next <ArrowRight class="w-5 h-5" />
      </button>
    </div>
  </footer>

  {#if showFavoritesModal}
    <FavoritesModal on:close={toggleFavoritesModal} />
  {/if}
  {#if showTradingViewModal && $currentStock}
    <TradingViewModal symbol={$currentStock.Symbol} onClose={toggleTradingViewModal} />
  {/if}
</main>
