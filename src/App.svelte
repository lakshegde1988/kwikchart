<script lang="ts">
  import { onMount } from 'svelte';
  import { stocks, currentStock, stockData, loading, error } from './lib/stores/stockStore';
  import type { Stock, Interval } from './lib/types';
  import { FaArrowLeft, FaArrowRight, FaExpand, FaCompress } from 'svelte-icons/fa';

  let currentIndex = 0;
  let selectedFile = 'largecap.json';
  let selectedInterval: Interval = { label: 'Daily', value: '1d', range: '1y' };
  let isFullscreen = false;

  // Fullscreen Toggle Logic
  function toggleFullscreen() {
    const appElement = document.documentElement; // Make the entire app fullscreen
    if (!isFullscreen) {
      appElement.requestFullscreen?.()
        .then(() => {
          isFullscreen = true;

          // Trigger reflow to fit content after entering fullscreen
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
        })
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen?.()
        .then(() => {
          isFullscreen = false;

          // Trigger reflow to fit content after exiting fullscreen
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
        })
        .catch((err) => console.error('Error exiting fullscreen:', err));
    }
  }

  // Listen for fullscreen changes
  onMount(() => {
    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;

      // Trigger a reflow whenever the fullscreen state changes
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });
</script>

<main id="app" class="flex flex-col h-[100dvh] bg-gray-100 overflow-hidden">
  <!-- Fullscreen Button -->
  <div class="absolute top-4 right-4">
    <button
      class="p-2 bg-blue-500 text-white rounded-md flex items-center justify-center"
      on:click={toggleFullscreen}
    >
      {#if isFullscreen}
        <FaCompress class="w-6 h-6" />
      {:else}
        <FaExpand class="w-6 h-6" />
      {/if}
    </button>
  </div>

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
          <StockChart data={$stockData} stockName={$currentStock["Company Name"]} />
        </div>
      {/if}
    </div>
  </div>

  <!-- Sticky Footer -->
  <footer class="h-16 flex-shrink-0 bg-white border-t border-gray-200 shadow-md">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between space-x-4">
      <!-- Pagination Controls -->
      <button
        class="p-2 text-base text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
        on:click={handlePrevious}
        disabled={currentIndex === 0}
      >
        <FaArrowLeft class="w-6 h-6" />
      </button>
      <button
        class="p-2 text-base text-gray-600 hover:text-gray-900 focus:outline-none disabled:text-gray-400"
        on:click={handleNext}
        disabled={currentIndex === $stocks.length - 1}
      >
        <FaArrowRight class="w-6 h-6" />
      </button>
    </div>
  </footer>
</main>
