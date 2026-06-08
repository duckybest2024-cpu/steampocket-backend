const MinesGame = (() => {
  function render(container, accountState) {
    let active = null; // { amount, mineCount, revealed, currentMultiplier, nextMultiplier }
    let busy = false;

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>💣 Mines</h2>
          <p>Pick how many mines hide in the 5x5 grid, then reveal tiles one at a time. Every safe tile compounds your multiplier — cash out before you hit a mine.</p>
        </div>

        <div class="mines-grid" id="mines-grid"></div>

        <p style="text-align:center; color:var(--text-dim); font-size:0.9rem">
          Current multiplier: <strong id="mines-current" style="color:var(--win)">1.00x</strong>
          &nbsp;·&nbsp; Next safe tile: <strong id="mines-next">--</strong>
          &nbsp;·&nbsp; Potential payout: <strong id="mines-payout">$0.00</strong>
        </p>

        <div class="controls-row" style="margin-top:14px">
          <div class="field">
            <label>Bet amount ($)</label>
            <input type="number" id="mines-amount" value="10" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Mines (1-24)</label>
            <input type="number" id="mines-count" value="3" min="1" max="24" step="1" />
          </div>
          <div class="btn-row">
            <button id="mines-start" class="primary-btn">Start round</button>
            <button id="mines-cashout" class="secondary-btn" disabled>Cash out</button>
          </div>
        </div>

        <div id="mines-result" class="result-banner"></div>
        <div id="mines-fairness"></div>
      </div>
    `;

    const els = {
      grid: container.querySelector("#mines-grid"),
      current: container.querySelector("#mines-current"),
      next: container.querySelector("#mines-next"),
      payout: container.querySelector("#mines-payout"),
      amount: container.querySelector("#mines-amount"),
      count: container.querySelector("#mines-count"),
      start: container.querySelector("#mines-start"),
      cashout: container.querySelector("#mines-cashout"),
      result: container.querySelector("#mines-result"),
      fairness: container.querySelector("#mines-fairness"),
    };

    function buildGrid() {
      els.grid.innerHTML = "";
      for (let i = 0; i < 25; i++) {
        const tile = UI.el("button", { class: "mine-tile", onclick: () => revealTile(i) }, "");
        tile.dataset.index = i;
        els.grid.appendChild(tile);
      }
    }

    function setControlsForRound(inRound) {
      els.start.disabled = inRound;
      els.amount.disabled = inRound;
      els.count.disabled = inRound;
      els.cashout.disabled = !inRound || !active || active.revealed.length === 0;
    }

    function refreshStats() {
      if (!active) {
        els.current.textContent = "1.00x";
        els.next.textContent = "--";
        els.payout.textContent = "$0.00";
        return;
      }
      els.current.textContent = `${active.currentMultiplier.toFixed(2)}x`;
      els.next.textContent = `${active.nextMultiplier.toFixed(2)}x`;
      els.payout.textContent = UI.money(Math.floor(active.amount * active.currentMultiplier));
    }

    function paintTile(index, kind, glyph) {
      const tile = els.grid.querySelector(`[data-index="${index}"]`);
      tile.classList.add("revealed", kind, "disabled");
      tile.textContent = glyph;
    }

    function showFairness(round) {
      els.fairness.innerHTML = UI.fairnessLine({
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
      });
    }

    els.start.addEventListener("click", async () => {
      if (busy) return;
      const dollars = Number(els.amount.value);
      const mineCount = Number(els.count.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a bet amount.", "loss");
      if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount > 24) return UI.toast("Mines must be 1-24.", "loss");

      busy = true;
      try {
        const res = await Api.post("/games/mines/start", { amount: Math.round(dollars * 100), mineCount });
        active = res.round;
        accountState.balance = res.balance;
        UI.setBalance(res.balance);

        buildGrid();
        els.result.className = "result-banner";
        refreshStats();
        showFairness(active);
        setControlsForRound(true);
        UI.toast(`Round started — ${mineCount} mines hidden in the grid. Pick a tile!`, "info");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
      }
    });

    async function revealTile(index) {
      if (busy || !active) return;
      if (active.revealed.includes(index)) return;

      busy = true;
      try {
        const res = await Api.post("/games/mines/reveal", { tile: index });

        if (res.outcome === "bust") {
          paintTile(index, "mine", "💥");
          for (const m of res.round.mines) if (m !== index) paintTile(m, "mine", "💣");
          for (const r of active.revealed) paintTile(r, "safe", "💎");

          els.result.className = "result-banner show loss";
          els.result.textContent = `💥 Boom — tile ${index} was a mine. Lost ${UI.money(active.amount)}.`;
          UI.toast(`Hit a mine — lost ${UI.money(active.amount)}.`, "loss");

          UI.applyAccountUpdate(accountState, res);
          finishRound();
          return;
        }

        active.revealed.push(index);
        active.currentMultiplier = res.multiplier;
        paintTile(index, "safe", "💎");

        if (res.outcome === "cleared") {
          active.currentMultiplier = res.multiplier;
          for (const m of res.round.mines) paintTile(m, "mine", "🚩");
          els.result.className = "result-banner show win";
          els.result.textContent = `🏆 Board cleared! Cashed out at ${res.multiplier.toFixed(2)}x for ${UI.money(res.payout)}.`;
          UI.toast(`Cleared the board — won ${UI.money(res.payout)}!`, "win");
          UI.applyAccountUpdate(accountState, res);
          finishRound();
          return;
        }

        active.nextMultiplier = res.nextMultiplier;
        refreshStats();
        setControlsForRound(true);
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
      }
    }

    els.cashout.addEventListener("click", async () => {
      if (busy || !active) return;
      busy = true;
      try {
        const res = await Api.post("/games/mines/cashout", {});
        for (const m of res.round.mines) {
          if (!active.revealed.includes(m)) paintTile(m, "mine", "🚩");
        }
        els.result.className = "result-banner show win";
        els.result.textContent = `💰 Cashed out at ${res.multiplier.toFixed(2)}x for ${UI.money(res.payout)}.`;
        UI.toast(`Cashed out — won ${UI.money(res.payout)}!`, "win");
        UI.applyAccountUpdate(accountState, res);
        finishRound();
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
      }
    });

    function finishRound() {
      active = null;
      setControlsForRound(false);
      for (const tile of els.grid.querySelectorAll(".mine-tile")) tile.classList.add("disabled");
    }

    async function resumeIfActive() {
      try {
        const { round } = await Api.get("/games/mines/active");
        active = round;
        buildGrid();
        for (const r of active.revealed) paintTile(r, "safe", "💎");
        refreshStats();
        showFairness(active);
        setControlsForRound(true);
        UI.toast("Resumed your in-progress mines round.", "info");
      } catch {
        buildGrid();
        setControlsForRound(false);
      }
    }

    resumeIfActive();
  }

  return { render };
})();
