const SlotsGame = (() => {
  const ALL_SYMBOLS = ["wild","scatter","crown","gem","bell","clover","horseshoe","ace","king","queen"];

  // Mirrors PAYLINES in src/games/slots.ts — needed client-side to highlight winning cells.
  const PAYLINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [1,0,0,0,1],[1,2,2,2,1],[0,0,1,2,2],[2,2,1,0,0],[1,0,1,0,1],
    [1,2,1,2,1],[0,1,1,1,0],[2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],
    [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],
    [2,0,0,0,2],[1,0,2,0,1],[1,2,0,2,1],[0,0,2,0,0],[2,2,0,2,2],
  ];

  function render(container, accountState) {
    let busy = false;

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>🎰 Slots</h2>
          <p>5 reels, 3 rows, 25 paylines. Wilds 🌟 substitute for any symbol and double the win per wild in the combo; land 3+ scatters 🎁 for free spins.</p>
        </div>

        <div class="slots-frame">
          <div class="reels" id="slots-reels"></div>
        </div>

        <div class="controls-row">
          <div class="field">
            <label>Bet per line ($)</label>
            <input type="number" id="slots-linebet" value="0.20" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Lines (1-25)</label>
            <input type="number" id="slots-lines" value="25" min="1" max="25" step="1" />
          </div>
          <div class="field">
            <label>Total bet</label>
            <input type="text" id="slots-total" value="$5.00" disabled />
          </div>
          <div class="btn-row">
            <button id="slots-spin" class="primary-btn">🎰 Spin</button>
          </div>
        </div>

        <div id="slots-result" class="result-banner"></div>
        <div id="slots-fairness"></div>
      </div>
    `;

    const els = {
      reels: container.querySelector("#slots-reels"),
      lineBet: container.querySelector("#slots-linebet"),
      lines: container.querySelector("#slots-lines"),
      total: container.querySelector("#slots-total"),
      spin: container.querySelector("#slots-spin"),
      result: container.querySelector("#slots-result"),
      fairness: container.querySelector("#slots-fairness"),
    };

    function buildGrid(grid) {
      els.reels.innerHTML = "";
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let reel = 0; reel < 5; reel++) {
          const symbol = grid ? grid[reel][row] : ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];
          const cell = UI.el("div", { class: "reel-cell" }, UI.symbolGlyph(symbol));
          cell.dataset.reel = reel;
          cell.dataset.row = row;
          els.reels.appendChild(cell);
          cells.push(cell);
        }
      }
      return cells;
    }

    function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

    async function animateReels(finalGrid) {
      // Start all cells spinning with random symbols
      const cells = buildGrid(null);
      let spinHandle = setInterval(() => {
        for (const cell of cells) {
          if (!cell.dataset.stopped) {
            cell.textContent = UI.symbolGlyph(ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]);
            cell.classList.add("spinning");
          }
        }
      }, 80);

      // Stop each reel left-to-right with a stagger
      for (let reel = 0; reel < 5; reel++) {
        await sleep(220);
        for (let row = 0; row < 3; row++) {
          const cell = cells.find((c) => Number(c.dataset.reel) === reel && Number(c.dataset.row) === row);
          if (!cell) continue;
          cell.dataset.stopped = "1";
          cell.classList.remove("spinning");
          cell.classList.add("landing");
          cell.textContent = UI.symbolGlyph(finalGrid[reel][row]);
          setTimeout(() => cell.classList.remove("landing"), 200);
        }
      }

      clearInterval(spinHandle);
      return cells;
    }

    function refreshTotal() {
      const lineBet = Math.round((Number(els.lineBet.value) || 0) * 100);
      const lines = Math.max(1, Math.min(25, Number(els.lines.value) || 1));
      els.total.value = UI.money(lineBet * lines);
    }
    els.lineBet.addEventListener("input", refreshTotal);
    els.lines.addEventListener("input", refreshTotal);

    els.spin.addEventListener("click", async () => {
      if (busy) return;
      const lineBet = Math.round((Number(els.lineBet.value) || 0) * 100);
      const lines = Math.max(1, Math.min(25, Math.round(Number(els.lines.value) || 1)));
      if (lineBet <= 0) return UI.toast("Enter a bet per line.", "loss");

      busy = true;
      els.spin.disabled = true;
      els.result.className = "result-banner";

      // Generate a fresh random salt every spin — breaks any sequential pattern in the seed.
      const spinSalt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      try {
        const res = await Api.post("/games/slots/spin", { lineBet, lines, spinSalt });
        const { grid, lineWins, scatterCount, scatterPayout, freeSpinsAwarded } = res.result.state;

        // Animate reels spinning and landing
        const cells = await animateReels(grid);

        // Highlight every cell that's part of a winning payline
        for (const win of lineWins) {
          const positions = PAYLINES[win.line];
          for (let reel = 0; reel < win.count; reel++) {
            const cell = cells.find((c) => Number(c.dataset.reel) === reel && Number(c.dataset.row) === positions[reel]);
            cell?.classList.add("win-cell");
          }
        }

        const isWin = res.result.result === "win";
        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        const bits = [];
        if (lineWins.length) bits.push(`${lineWins.length} winning line${lineWins.length > 1 ? "s" : ""}`);
        if (scatterCount >= 3) bits.push(`${scatterCount} scatters (+${scatterPayout}x bet)`);
        if (freeSpinsAwarded) bits.push(`${freeSpinsAwarded} free spins awarded! 🎁`);
        els.result.textContent = isWin
          ? `🎉 ${bits.join(" · ") || "You won!"} — paid ${UI.money(res.result.payout)}.`
          : `No win this spin — paid ${UI.money(res.result.payout)} on a ${UI.money(lineBet * lines)} bet.`;

        els.fairness.innerHTML = UI.fairnessLine({
          serverSeedHash: accountState.fairness?.activeServerSeedHash,
          clientSeed: accountState.fairness?.clientSeed,
        });

        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Slots!` : "No win this spin.", isWin ? "win" : "info");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        els.spin.disabled = false;
      }
    });

    buildGrid(null);
    refreshTotal();
  }

  return { render };
})();
