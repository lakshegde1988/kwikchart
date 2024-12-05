<script lang="ts">
  import { theme } from '../stores/themeStore';
  import { Sun, Moon } from 'lucide-svelte';

  function toggleTheme() {
    theme.update(currentTheme => currentTheme === 'light' ? 'dark' : 'light');
  }
</script>

<button
  on:click={toggleTheme}
  class="p-2 rounded-full focus:outline-none"
  class:bg-zinc-200={$theme === 'light'}
  class:bg-zinc-700={$theme === 'dark'}
  aria-label="Toggle theme"
>
  {#if $theme === 'light'}
    <Moon class="w-5 h-5 text-zinc-700" />
  {:else}
    <Sun class="w-5 h-5 text-zinc-200" />
  {/if}
</button>

