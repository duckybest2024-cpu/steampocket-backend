// Full marketplace UI coming — stub keeps the nav entry working
const NFTMarketGame = (() => {
  function render(container) {
    container.innerHTML = `
      <div class="game-panel" style="text-align:center;padding:60px 20px">
        <div style="font-size:3rem;margin-bottom:12px">🏪</div>
        <h2 style="margin:0 0 8px">NFT Marketplace</h2>
        <p style="color:var(--text-dim);margin:0">Loading catalog…</p>
      </div>`;
  }
  return { render };
})();
