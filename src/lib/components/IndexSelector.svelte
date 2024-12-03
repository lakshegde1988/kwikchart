<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ select: string }>();

  const indexFiles = ['largecap.json', 'midcap.json', 'smallcap.json', 'microcap.json','others.json'];

  function handleSelect(event: Event) {
    const selectedFile = (event.target as HTMLSelectElement).value;
    dispatch('select', selectedFile);
  }
</script>

<div class="relative inline-block">
  <select
    id="index-select"
    class="block w-auto text-base bg-slate-950 border-slate-300 focus:outline-none focus:ring-slate-900 focus:border-slate-500 sm:text-sm rounded-md shadow-sm"
    on:change={handleSelect}
  >
    {#each indexFiles as file}
      <option value={file}>{file.replace('.json', '').charAt(0).toUpperCase() + file.replace('.json', '').slice(1)}</option>
    {/each}
  </select>
</div>

