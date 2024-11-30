<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let currentIndex: number;
  export let totalStocks: number;

  const dispatch = createEventDispatcher<{ previous: void; next: void }>();

  function handlePrevious() {
    dispatch('previous');
  }

  function handleNext() {
    dispatch('next');
  }
</script>

<div class="flex justify-between items-center mt-6">
  <button
    on:click={handlePrevious}
    disabled={currentIndex === 0}
    class="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
  >
    Previous
  </button>
  <span class="text-gray-700 font-medium">
    Stock {currentIndex + 1} of {totalStocks}
  </span>
  <button
    on:click={handleNext}
    disabled={currentIndex === totalStocks - 1}
    class="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
  >
    Next
  </button>
</div>

