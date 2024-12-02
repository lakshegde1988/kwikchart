<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { FaArrowLeft, FaArrowRight, FaExpand, FaCompress, FaStar, FaRegStar, FaHeart } from 'svelte-icons/fa';

  let currentIndex = 0;
  let totalStocks = 0;
  let isFullscreen = false;


  async function handleIndexSelect(event: CustomEvent<Stock[]>) {
    $stocks = event.detail;
    totalStocks = $stocks.length;
    currentIndex = 0;
    if (totalStocks > 0) {
      $currentStock = $stocks[currentIndex];
      await loadStockData($currentStock, $selectedInterval);
    }
  }

  async function handleIntervalChange(event: CustomEvent<Interval>) {
    $selectedInterval = event.detail;
    if ($currentStock) {
      await loadStockData($currentStock, $selectedInterval);
    }
  }

  async function loadStockData(stock: Stock, interval: Interval) {
    $loading = true;
    $error = null;
    try {
      $stockData = await fetchYahooFinanceData(stock.Symbol, interval.value, interval.range);
    } catch (err) {
      $error = 'Failed to load stock data';
      console.error(err);
    } finally {
      $loading = false;
    }
  }

  function handleNext() {
    if (totalStocks > 0) {
      currentIndex = (currentIndex + 1) % totalStocks;
      $currentStock = $stocks[currentIndex];
      loadStockData($currentStock, $selectedInterval);
    }
  }

  function handlePrevious() {
    if (totalStocks > 0) {
      currentIndex = (currentIndex - 1 + totalStocks) % totalStocks;
      $currentStock = $stocks[currentIndex];
      loadStockData($currentStock, $selectedInterval);
    }
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      const elem = document.getElementById('app');
      if (elem) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      }
    } else {
      document.exitFullscreen();
    }
  }

  function toggleFavorite(stock: Stock) {
    $favorites = $favorites.some(fav => fav.Symbol === stock.Symbol)
      ? $favorites.filter(fav => fav.Symbol !== stock.Symbol)
      : [...$favorites, stock];
    
    // Save favorites to localStorage
    localStorage.setItem('favorites', JSON.stringify($favorites));
  }

  function copyFavoritesToClipboard() {
    const symbols = $favorites.map(stock => stock.Symbol).join(',');
    navigator.clipboard.writeText(symbols).then(() => {
      alert('Favorite stock symbols copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  }

  onMount(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      $favorites = JSON.parse(savedFavorites);
    }
  });
</script>

<main
  id="app"
  class="flex flex-col bg-gray-100 text-gray-800 overflow-hidden"
  style="height: calc(var(--vh, 1vh) * 100);"
>
  <!-- Content Area -->
  <div class="flex-grow">
    <div class="h-full flex flex-col">
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
          <div class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
            <h2 class="text-xl font-semibold">{$currentStock["Company Name"]} ({$currentStock.Symbol})</h2>
            <button
              class="p-2 text-yellow-500 hover:text-yellow-600 focus:outline-none"
              on:click={() => toggleFavorite($currentStock)}
            >
              <div class="w-6 h-6">
                {#if $favorites.some(fav => fav.Symbol === $currentStock.Symbol)}
                  <FaStar />
                {:else}
                  <FaRegStar />
                {/if}
              </div>
            </button>
          </div>
          <StockChart data={$stockData} stockName={$currentStock["Company Name"]} />
        </div>
      {/if}
    </div>
  </div>

  <!-- Sticky Footer -->
  <footer class="h-16 flex-shrink-0 bg-white border-t border-gray-200 shadow-md">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between space-x-4">
      <!-- Left: Selectors -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <IndexSelector class="text-sm sm:text-base px-2" on:select={handleIndexSelect} />
        <IntervalSelector class="text-sm sm:text-base px-2" on:change={handleIntervalChange} />
      </div>
      <!-- Center: Pagination -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handlePrevious}
          disabled={currentIndex === 0}
        >
          <div class="w-5 h-5">
            <FaArrowLeft />
          </div>
        </button>
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
          on:click={handleNext}
          disabled={currentIndex === totalStocks - 1}
        >
          <div class="w-5 h-5">
            <FaArrowRight />
          </div>
        </button>
      </div>
      <!-- Right: Fullscreen + Favorites -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        <button
          class="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
          on:click={toggleFullscreen}
        >
          <div class="w-5 h-5">
            {#if isFullscreen}
              <FaCompress />
            {:else}
              <FaExpand />
            {/if}
          </div>
        </button>
        <button
          class="p-2 text-red-500 hover:text-red-600 focus:outline-none"
          on:click={copyFavoritesToClipboard}
        >
          <div class="w-5 h-5">
            <FaHeart />
          </div>
        </button>
      </div>
    </div>
  </footer>
</main>

<style>
  /* Existing styles remain unchanged */
</style>

