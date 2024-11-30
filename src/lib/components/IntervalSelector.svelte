<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Interval } from '../types';

  const dispatch = createEventDispatcher<{ change: Interval }>();

  const intervals: Interval[] = [
    { label: 'Daily', value: '1d', range: '1y' },
    { label: 'Weekly', value: '1wk', range: '5y' },
    { label: 'Monthly', value: '1mo', range: 'max' },
  ];

  function handleChange(event: Event) {
    const selectedInterval = intervals[parseInt((event.target as HTMLSelectElement).value)];
    dispatch('change', selectedInterval);
  }
</script>

<div class="relative inline-block">
    <label for="interval-select" class="block text-sm font-medium text-gray-700 mb-1">Select Interval</label>
  <select
    id="interval-select"
    class="block w-auto pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
    on:change={handleChange}
  >
    {#each intervals as interval, i}
      <option value={i}>{interval.label}</option>
    {/each}
  </select>
</div>
