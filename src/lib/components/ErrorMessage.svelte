<script lang="ts">
  export let message: string;
</script>

<div class="error-container">
  <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
  </svg>
  <p>{message}</p>
</div>

<style>
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    background-color: #2B1619;
    border: 1px solid #ef5350;
    border-radius: 4px;
    color: #ef5350;
  }

  .icon {
    width: 24px;
    height: 24px;
  }

  p {
    margin: 0;
  }
</style>