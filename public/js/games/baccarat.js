const BaccaratGame = (() => {
  function render(container, accountState) {
    let busy = false;
    let betSide = "player";

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>🎴 Baccarat</h2>
          <p>Bet on Player (2x), Banker (1.95x), or Tie (9x). Closest to 9 wins.</p>
        </div>

        <div class="bacc-table" id="bacc-table"></div>

        <div class="controls-row">
          <div class="field">
            <label>Bet ($)</label>
            <input type="number" id="bacc-amount" value="5.00" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Side</label>
            <div class="toggle-group">
              <button data-s="player" class="active">Player</button>
              <button data-s="banker">Banker</button>
              <button data-s="tie">Tie</button>
            </div>
          </div>
          <div class="btn-row" style="align-items:flex-end">
            <button id="bacc-deal" class="primary-btn">Deal</button>
          </div>
        </div>

        <div id="bacc-result" class="result-banner"></div>
        <div id="bacc-fairness"></div>
      </div>
    `;

    const els = {
      table: container.querySelector("#bacc-table"),
      amount: container.querySelector("#bacc-amount"),
      deal: container.querySelector("#bacc-deal"),
      result: container.querySelector("#bacc-result"),
      fairness: container.querySelector("#bacc-fairness"),
    };

    function renderTable(playerCards, bankerCards, playerTotal, bankerTotal, winner) {
      function cardsHtml(cards) {
        return cards.map((c) => UI.renderCard(c)).join("");
      }
      const pWin = winner === "player";
      const bWin = winner === "banker";
      const tie = winner === "tie";

      els.table.innerHTML = `
        <div class="bacc-side ${pWin ? "bacc-win" : tie ? "bacc-tie" : ""}">
          <div class="bacc-label">Player${pWin ? " 🏆" : tie ? " 🤝" : ""}</div>
          <div class="cards">${cardsHtml(playerCards)}</div>
          <div class="bacc-total">Total: <b>${playerTotal}</b></div>
        </div>
        <div class="bacc-vs">VS</div>
        <div class="bacc-side ${bWin ? "bacc-win" : tie ? "bacc-tie" : ""}">
          <div class="bacc-label">Banker${bWin ? " 🏆" : tie ? " 🤝" : ""}</div>
          <div class="cards">${cardsHtml(bankerCards)}</div>
          <div class="bacc-total">Total: <b>${bankerTotal}</b></div>
        </div>
      `;
    }

    function clearTable() {
      els.table.innerHTML = `
        <div class="bacc-side"><div class="bacc-label">Player</div><div class="cards bacc-placeholder">?? ??</div></div>
        <div class="bacc-vs">VS</div>
        <div class="bacc-side"><div class="bacc-label">Banker</div><div class="cards bacc-placeholder">?? ??</div></div>
      `;
    }
    clearTable();

    container.querySelectorAll(".toggle-group button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (busy) return;
        betSide = btn.dataset.s;
        container.querySelectorAll(".toggle-group button").forEach((b) => b.classList.toggle("active", b === btn));
      });
    });

    els.deal.addEventListener("click", async () => {
      if (busy) return;
      const amount = Math.round((Number(els.amount.value) || 0) * 100);
      if (amount <= 0) return UI.toast("Enter a bet.", "loss");

      busy = true;
      els.deal.disabled = true;
      els.result.className = "result-banner";

      try {
        const res = await Api.post("/games/baccarat", { amount, bet: betSide });
        const { playerCards, bankerCards, playerTotal, bankerTotal, winner } = res.result.state;

        renderTable(playerCards, bankerCards, playerTotal, bankerTotal, winner);

        const isWin = res.result.result === "win";
        const winnerLabel = winner === "player" ? "Player wins" : winner === "banker" ? "Banker wins" : "Tie";
        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        els.result.textContent = isWin
          ? `🎉 ${winnerLabel}! Paid ${UI.money(res.result.payout)}.`
          : `${winnerLabel} — you bet on ${betSide}. No win.`;

        els.fairness.innerHTML = UI.fairnessLine({ serverSeedHash: accountState.fairness?.activeServerSeedHash, clientSeed: accountState.fairness?.clientSeed });
        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Baccarat!` : "No win this hand.", isWin ? "win" : "info");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        els.deal.disabled = false;
      }
    });
  }

  return { render };
})();
