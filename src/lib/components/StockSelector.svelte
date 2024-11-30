<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { stocks } from '../stores/stockStore';
  import type { Stock } from '../types';

  const dispatch = createEventDispatcher<{ select: Stock }>();

  function handleSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      const selectedStock = $stocks.find(stock => stock.Symbol === target.value);
      if (selectedStock) {
        dispatch('select', selectedStock);
      }
    }
  }
</script>

<div class="relative">
  <label for="stock-select" class="block text-sm font-medium text-gray-700 mb-1">Select a Stock</label>
  <select
    id="stock-select"
    class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
    on:change={handleSelect}
  >
    <option value="">Choose a stock</option>
    {#each $stocks as stock}
      <option value={stock.Symbol}>{stock["Company Name"]} ({stock.Symbol})</option>
    {/each}
  </select>
</div>

