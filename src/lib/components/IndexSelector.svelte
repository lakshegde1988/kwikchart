<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '../stores/themeStore';

  const dispatch = createEventDispatcher<{ select: string }>();

  const indexFiles = ['nifty50.json','niftynext50.json' 'midcaps.json', 'smallcaps.json', 'microcaps.json','others.json','FnO.json','ipo.json'];

  function handleSelect(event: Event) {
    const selectedFile = (event.target as HTMLSelectElement).value;
    dispatch('select', selectedFile);
  }
</script>

<div class="relative inline-block">
  <select
    id="index-select"
    class="block w-auto text-base focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm rounded-md shadow-sm"
    class:text-slate-900={$theme === 'light'}
    class:border-slate-300={$theme === 'light'}
    class:focus:ring-slate-500={$theme === 'light'}
    class:focus:border-slate-500={$theme === 'light'}
    class:bg-slate-950={$theme === 'dark'}
    class:text-slate-100={$theme === 'dark'}
    class:border-slate-950={$theme === 'dark'}
    class:focus:ring-slate-950={$theme === 'dark'}
    class:focus:border-slate-950={$theme === 'dark'}
    on:change={handleSelect}
  >
    {#each indexFiles as file}
      <option value={file}>{file.replace('.json', '').charAt(0).toUpperCase() + file.replace('.json', '').slice(1)}</option>
    {/each}
  </select>
</div>
