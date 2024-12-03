<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { favorites } from '../stores/stockStore';
  import { X } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function copyFavorites() {
    const favoritesCSV = Array.from($favorites).join(',');
    navigator.clipboard.writeText(favoritesCSV)
      .then(() => alert('Favorites copied to clipboard!'))
      .catch(err => console.error('Failed to copy favorites: ', err));
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 w-96 max-w-full">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Favorite Stocks</h2>
      <button on:click={close} class="text-gray-500 hover:text-gray-700">
        <X size={24} />
      </button>
    </div>
    {#if $favorites.size > 0}
      <ul class="mb-4 max-h-60 overflow-y-auto">
        {#each Array.from($favorites) as symbol}
          <li class="py-2 border-b last:border-b-0">{symbol}</li>
        {/each}
      </ul>
      <button
        on:click={copyFavorites}
        class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Copy Favorites
      </button>
    {:else}
      <p class="text-gray-500">No favorite stocks added yet.</p>
    {/if}
  </div>
</div>

