<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '../stores/themeStore';
  import type { Interval } from '../types';

  const dispatch = createEventDispatcher<{ change: Interval }>();

  const intervals: Interval[] = [
    { label: '3m', value: '1d', range: '3mo' },
    { label: '1y', value: '1d', range: '1y' },
    { label: '2y', value: '1wk', range: '2y' },
    { label: '5y', value: '1wk', range: '5y' },
    { label: '10y', value: '1mo', range: '10y' }
  ];

  function handleChange(interval: Interval) {
    dispatch('change', interval);
  }
</script>

<div class="relative inline-block">
  <div class="flex space-x-1">
    {#each intervals as interval}
      <button
        class="px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm rounded-md shadow-sm"
        class:bg-slate-50={$theme === 'light'}
        class:text-slate-900={$theme === 'light'}
        class:border-slate-300={$theme === 'light'}
        class:focus:ring-slate-500={$theme === 'light'}
        class:focus:border-slate-50={$theme === 'light'}
        class:bg-slate-950={$theme === 'dark'}
        class:text-slate-100={$theme === 'dark'}
        class:border-slate-950={$theme === 'dark'}
        class:focus:ring-slate-950={$theme === 'dark'}
        class:focus:border-slate-950={$theme === 'dark'}
        on:click={() => handleChange(interval)}
      >
        {interval.label}
      </button>
    {/each}
  </div>
</div>
