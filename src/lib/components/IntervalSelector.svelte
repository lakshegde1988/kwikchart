<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '../stores/themeStore';
  import type { Interval } from '../types';

  const dispatch = createEventDispatcher<{ change: Interval }>();

  const intervals: Interval[] = [
     { label: 'H', value: '1d', range: '6mo' },
     { label: 'D', value: '1d', range: '2y' },
     { label: 'W', value: '1wk', range: '10y' },
   
     { label: 'M', value: '1mo', range: 'max' }
  ];

  function handleChange(event: Event) {
    const selectedInterval = intervals[parseInt((event.target as HTMLSelectElement).value)];
    dispatch('change', selectedInterval);
  }
</script>

<div class="relative inline-block">
  <select
    id="interval-select"
    class="block w-auto text-base focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm rounded-md shadow-sm"
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
    on:change={handleChange}
  >
    {#each intervals as interval, i}
      <option value={i}>{interval.label}</option>
    {/each}
  </select>
</div>
