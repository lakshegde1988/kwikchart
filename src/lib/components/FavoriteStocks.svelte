<script lang="ts">
import { favoriteStocks } from '../stores/stockStore';
import { createEventDispatcher } from 'svelte';
import type { Stock } from '../types';
const dispatch = createEventDispatcher<{select: Stock}>();

function copySymbols() {
  const symbols = $favoriteStocks.map(stock => stock.Symbol).join(',');
  navigator.clipboard.writeText(symbols)
    .then(() => alert('Symbols copied to clipboard!'))
    .catch(err => console.error('Failed to copy symbols: ', err));
}
</script>

<div>
  <h2>Favorite Stocks</h2>
  <button on:click={copySymbols}>Copy Symbols</button>
  <ul>
    {#each $favoriteStocks as stock}
      <li>
        <button on:click={() => dispatch('select', stock)}>
          {stock["Company Name"]} ({stock.Symbol})
        </button>
      </li>
    {/each}
  </ul>
</div>
