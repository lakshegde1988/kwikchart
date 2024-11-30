<script lang='ts'>
</script>
<div class="loading-container">
  <div class="spinner"></div>
  <p>Loading stock data...</p>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: #131722;
    border-radius: 4px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #2B2B43;
    border-top: 4px solid #5981F3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  p {
    color: #758696;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
