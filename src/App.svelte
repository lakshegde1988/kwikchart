<script lang="ts">
  import { onMount } from 'svelte';
  import IndexSelector from './lib/components/IndexSelector.svelte';
  import IntervalSelector from './lib/components/IntervalSelector.svelte';
  import StockChart from './lib/components/StockChart.svelte';
  import FavoritesModal from './lib/components/FavoritesModal.svelte';

  import { theme } from './lib/stores/themeStore';

  import { fetchYahooFinanceData } from './lib/api/yahooFinance';
  import { stocks, currentStock, stockData, loading, error, favorites, toggleFavorite } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { Star, ArrowLeft, ArrowRight, Expand, Shrink, FileHeart, Info, TrendingUp, Activity, BarChart3, Sun, Moon } from 'lucide-svelte';

  let currentIndex = 0;
  let selectedFile = 'largecaps.json';
  let selectedInterval: Interval = { label: 'D', value: '1d', range: '1y' };
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

  function toggleTheme() {
    theme.update(t => t === 'light' ? 'dark' : 'light');
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

  // Add event listener for keydown event
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

<style>
  :global(html) {
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --gradient-success: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-medium: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-large: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --blur-backdrop: backdrop-filter: blur(12px);
  }

  .glass-effect {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .glass-effect-light {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .gradient-border {
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2px;
    border-radius: 12px;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: inherit;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: all 0.3s ease;
    transform: translateY(0);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }

  .btn-ghost {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .btn-ghost::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .btn-ghost:hover::before {
    left: 100%;
  }

  .progress-bar {
    background: linear-gradient(90deg, #667eea, #764ba2);
    height: 3px;
    border-radius: 2px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .floating-element {
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .card-hover {
    transition: all 0.3s ease;
  }

  .card-hover:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-large);
  }
</style>

<main
  id="app"
  class="min-h-screen flex flex-col relative overflow-hidden"
  class:bg-gradient-to-br={true}
  class:from-slate-50={$theme === 'light'}
  class:to-slate-100={$theme === 'light'}
  class:text-slate-900={$theme === 'light'}
  class:from-slate-900={$theme === 'dark'}
  class:to-black={$theme === 'dark'}
  class:text-slate-50={$theme === 'dark'}
  style="height: {vh ? `${vh * 100}px` : '100vh'};"
>
  <!-- Background Elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-1/2 -right-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl floating-element"></div>
    <div class="absolute -bottom-1/2 -left-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-teal-400/20 blur-3xl floating-element" style="animation-delay: -3s;"></div>
  </div>

  <!-- Header -->
  <header class="relative z-10 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <TrendingUp class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Stock Analytics
            </h1>
            <p class="text-sm opacity-70">Professional Trading Dashboard</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <button
            class="btn-ghost p-3 rounded-xl hover:bg-white/10 transition-all duration-300"
            on:click={toggleFavoritesModal}
          >
            <FileHeart class="w-5 h-5" />
          </button>
          
          <button
            class="btn-ghost p-3 rounded-xl hover:bg-white/10 transition-all duration-300"
            on:click={toggleTheme}
          >
            {#if $theme === 'light'}
              <Moon class="w-5 h-5" />
            {:else}
              <Sun class="w-5 h-5" />
            {/if}
          </button>
          
          <button
            class="btn-ghost p-3 rounded-xl hover:bg-white/10 transition-all duration-300"
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
    </div>
  </header>

  <!-- Stock Info Card -->
  {#if $currentStock}
    <div class="relative z-10 px-6 pb-4 animate-fade-in">
      <div class="max-w-7xl mx-auto">
        <div class="glass-effect rounded-2xl p-6 shadow-lg border border-white/10">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500">
                <BarChart3 class="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 class="text-2xl font-bold">{$currentStock.Symbol}</h2>
                <p class="text-sm opacity-70">{$currentStock.Name || 'Stock Analysis'}</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <span class="text-sm opacity-70">
                {currentIndex + 1} of {totalStocks}
              </span>
              <button
                class="btn-ghost p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
                on:click={() => handleToggleFavorite($currentStock)}
              >
                <Star 
                  class="w-5 h-5 transition-colors duration-300"
                  class:text-yellow-400={$favorites.includes($currentStock.Symbol)}
                  class:fill-current={$favorites.includes($currentStock.Symbol)}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Main Content Area -->
  <div class="flex-1 px-6 pb-6 relative z-10">
    <div class="max-w-7xl mx-auto h-full">
      <div class="glass-effect rounded-2xl h-full p-6 shadow-lg border border-white/10 card-hover">
        {#if $loading}
          <div class="flex flex-col justify-center items-center h-full space-y-6">
            <div class="relative">
              <div class="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-pink-600 animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
            </div>
            <div class="text-center">
              <h3 class="text-lg font-semibold mb-2">Loading Market Data</h3>
              <div class="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div class="progress-bar w-full h-full"></div>
              </div>
            </div>
          </div>
        {:else if $error}
          <div class="flex flex-col justify-center items-center h-full space-y-4">
            <div class="p-4 rounded-full bg-red-100 text-red-600">
              <Activity class="w-8 h-8" />
            </div>
            <div class="text-center">
              <h3 class="text-lg font-semibold mb-2 text-red-600">Error Loading Data</h3>
              <p class="text-sm opacity-70">{$error}</p>
            </div>
          </div>
        {:else if $stockData.length > 0 && $currentStock}
          <div class="h-full animate-slide-up">
            <StockChart data={$stockData} stockName={$currentStock.Symbol} />
          </div>
        {:else}
          <div class="flex flex-col justify-center items-center h-full space-y-4">
            <div class="p-4 rounded-full bg-gray-100 text-gray-600">
              <BarChart3 class="w-8 h-8" />
            </div>
            <div class="text-center">
              <h3 class="text-lg font-semibold mb-2">No Data Available</h3>
              <p class="text-sm opacity-70">Please select a stock to view its chart</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Control Panel Footer -->
  <footer class="relative z-10 p-6">
    <div class="max-w-7xl mx-auto">
      <div class="glass-effect rounded-2xl p-4 shadow-lg border border-white/10">
        <div class="flex items-center justify-between space-x-4">
          <div class="flex items-center space-x-3">
            <IndexSelector class="text-sm" on:select={handleIndexSelect} />
            <IntervalSelector class="text-sm" on:change={handleIntervalChange} />
          </div>
          
          <div class="flex items-center space-x-2">
            <button
              class="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ArrowLeft class="w-4 h-4" />
              <span class="hidden sm:inline">Previous</span>
            </button>
            
            <button
              class="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={handleNext}
              disabled={currentIndex === totalStocks - 1}
            >
              <span class="hidden sm:inline">Next</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <!-- Modals -->
  {#if showFavoritesModal}
    <FavoritesModal on:close={toggleFavoritesModal} />
  {/if}
  
  {#if showTradingViewModal && $currentStock}
    <TradingViewModal symbol={$currentStock.Symbol} onClose={toggleTradingViewModal} />
  {/if}
</main>
