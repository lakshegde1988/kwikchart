<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Interval } from '../types';

  const dispatch = createEventDispatcher<{ change: Interval }>();

  const intervals: Interval[] = [
    { label: '6M', value: '1d', range: '6mo' },
    { label: '1Y', value: '1d', range: '1y' },
    { label: '2Y', value: '1d', range: '2y' },
    { label: '5Y', value: '1wk', range: '5y' },
    { label: 'All', value: '1mo', range: 'max' },
  ];

  function handleChange(event: Event) {
    const selectedInterval = intervals[parseInt((event.target as HTMLSelectElement).value)];
    dispatch('change', selectedInterval);
  }
</script>

<div class="relative inline-block">
  <select
    id="interval-select"
    class="block w-auto pl-3 pr-2 py-2 text-base bg-zinc-50 border-zinc-900 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm rounded-md shadow-sm"
    on:change={handleChange}
  >
    {#each intervals as interval, i}
      <option value={i}>{interval.label}</option>
    {/each}
  </select>
</div>
