// Scratch Cards — placeholder until backend agent completes full implementation
const ScratchGame = (() => {
  function render(container, accountState) {
    container.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--text-dim);">
        <div style="font-size:3rem;margin-bottom:16px;">🎟️</div>
        <h2 style="margin:0 0 8px;color:var(--text);">Scratch Cards</h2>
        <p>50 ticket types — Coming soon!</p>
      </div>
    `;
  }
  return { render };
})();
