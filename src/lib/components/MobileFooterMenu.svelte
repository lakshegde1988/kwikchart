<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Moon, Sun, List, Info } from 'lucide-svelte';
  import { theme } from '../stores/themeStore';

  const dispatch = createEventDispatcher();

  export let showFavoritesModal: boolean;
  export let showTradingViewModal: boolean;

  let isOpen = false;

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function handleThemeToggle() {
    theme.update(t => t === 'dark' ? 'light' : 'dark');
    isOpen = false;
  }

  function handleFavoritesClick() {
    dispatch('toggleFavorites');
    isOpen = false;
  }

  function handleInfoClick() {
    dispatch('toggleInfo');
    isOpen = false;
  }
</script>

<div class="md:hidden">
  <button
    on:click={toggleMenu}
    class="p-2 hover:text-slate-800 focus:outline-none"
    class:text-slate-900={$theme === 'light'}
    class:text-slate-100={$theme === 'dark'}
  >
    <List class="w-5 h-5" />
  </button>

  {#if isOpen}
    <div
      class="fixed inset-x-0 bottom-12 bg-slate-50 dark:bg-slate-800 shadow-lg rounded-t-lg p-4 transition-transform transform"
      class:translate-y-full={!isOpen}
      class:translate-y-0={isOpen}
    >
      <div class="flex flex-col space-y-4">
        <button
          on:click={handleThemeToggle}
          class="flex items-center space-x-2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          {#if $theme === 'dark'}
            <Sun class="w-5 h-5" />
            <span>Light Mode</span>
          {:else}
            <Moon class="w-5 h-5" />
            <span>Dark Mode</span>
          {/if}
        </button>
        <button
          on:click={handleFavoritesClick}
          class="flex items-center space-x-2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          <List class="w-5 h-5" />
          <span>Favorites</span>
        </button>
        <button
          on:click={handleInfoClick}
          class="flex items-center space-x-2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          <Info class="w-5 h-5" />
          <span>Info</span>
        </button>
      </div>
    </div>
  {/if}
</div>
