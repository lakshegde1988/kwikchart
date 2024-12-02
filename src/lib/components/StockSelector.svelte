<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { stocks, favorites, toggleFavorite } from '../stores/stockStore';
  import type { Stock } from '../types';
  import { Star } from 'lucide-svelte';

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

  function handleToggleFavorite(event: Event, stock: Stock) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(stock.Symbol);
  }
</script>

<div class="relative">
  <label for="stock-select" class="block text-sm font-medium text-gray-700 mb-1">Select a Stock</label>
  <div class="relative">
    <select
      id="stock-select"
      class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
      on:change={handleSelect}
    >
      <option value="">Choose a stock</option>
      {#each $stocks as stock}
        <option value={stock.Symbol}>
          {stock["Company Name"]} ({stock.Symbol})
          {$favorites.has(stock.Symbol) ? '★' : ''}
        </option>
      {/each}
    </select>
    <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
      <Star class="h-5 w-5 text-gray-400" aria-hidden="true" />
    </div>
  </div>
  <ul class="mt-2 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-sm">
    {#each $stocks as stock}
      <li class="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer" on:click={() => dispatch('select', stock)}>
        <span>{stock["Company Name"]} ({stock.Symbol})</span>
        <button
          class="p-1 text-gray-400 hover:text-yellow-500 focus:outline-none"
          on:click={(e) => handleToggleFavorite(e, stock)}
        >
          <Star class="h-5 w-5" fill={$favorites.has(stock.Symbol) ? 'currentColor' : 'none'} />
        </button>
      </li>
    {/each}
  </ul>
</div>

