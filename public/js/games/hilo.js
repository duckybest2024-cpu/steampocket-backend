const HiloGame = (() => {
  function render(container, accountState) {
    let inRound = false;
    let busy = false;
    let currentMultiplier = 1;

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>↕️ Hi-Lo</h2>
          <p>Guess if the next card is Higher or Lower. Cashout anytime to lock in your multiplier!</p>
        </div>

        <div class="hilo-stage">
          <div class="hilo-card-wrap">
            <div id="hilo-card" class="hilo-card-slot">🂠</div>
          </div>
          <div class="hilo-info">
            <div class="hilo-multi-label">Multiplier</div>
            <div id="hilo-multi" class="hilo-multi">1.00x</div>
            <div id="hilo-chances" class="hilo-chances"></div>
          </div>
        </div>

        <div class="controls-row">
          <div class="field">
            <label>Bet ($)</label>
            <input type="number" id="hilo-amount" value="5.00" min="0.01" step="0.01" />
          </div>
          <div class="btn-row" style="align-items:flex-end" id="hilo-start-row">
            <button id="hilo-start" class="primary-btn">▶ Start</button>
          </div>
          <div class="btn-row hidden" id="hilo-action-row" style="align-items:flex-end">
            <button id="hilo-higher" class="primary-btn">⬆ Higher</button>
            <button id="hilo-lower" class="secondary-btn">⬇ Lower</button>
            <button id="hilo-cashout" class="danger-btn">💰 Cashout</button>
          </div>
        </div>

        <div id="hilo-result" class="result-banner"></div>
        <div id="hilo-fairness"></div>
      </div>
    `;

    const els = {
      card: container.querySelector("#hilo-card"),
      multi: container.querySelector("#hilo-multi"),
      chances: container.querySelector("#hilo-chances"),
      amount: container.querySelector("#hilo-amount"),
      startRow: container.querySelector("#hilo-start-row"),
      actionRow: container.querySelector("#hilo-action-row"),
      start: container.querySelector("#hilo-start"),
      higher: container.querySelector("#hilo-higher"),
      lower: container.querySelector("#hilo-lower"),
      cashout: container.querySelector("#hilo-cashout"),
      result: container.querySelector("#hilo-result"),
      fairness: container.querySelector("#hilo-fairness"),
    };

    function renderCard(card) {
      const red = card.suit === "♥" || card.suit === "♦";
      return `<div class="hilo-card ${red ? "red-suit" : ""}">${card.rank}<span style="font-size:0.75em">${card.suit}</span></div>`;
    }

    function updateChances(higher, lower) {
      els.chances.innerHTML = `
        <span class="chance-badge up">⬆ ${Math.round(higher * 100)}%</span>
        <span class="chance-badge down">⬇ ${Math.round(lower * 100)}%</span>
      `;
    }

    function setMultiplier(m) {
      currentMultiplier = m;
      els.multi.textContent = m.toFixed(2) + "x";
    }

    function enterRound() {
      inRound = true;
      els.startRow.classList.add("hidden");
      els.actionRow.classList.remove("hidden");
      els.amount.disabled = true;
    }

    function exitRound() {
      inRound = false;
      els.actionRow.classList.add("hidden");
      els.startRow.classList.remove("hidden");
      els.amount.disabled = false;
      els.card.innerHTML = "🂠";
      els.chances.innerHTML = "";
      setMultiplier(1);
    }

    els.start.addEventListener("click", async () => {
      if (busy || inRound) return;
      const amount = Math.round((Number(els.amount.value) || 0) * 100);
      if (amount <= 0) return UI.toast("Enter a bet.", "loss");

      busy = true;
      els.start.disabled = true;
      els.result.className = "result-banner";

      try {
        const res = await Api.post("/games/hilo/start", { amount });
        enterRound();
        els.card.innerHTML = renderCard(res.card);
        setMultiplier(res.currentMultiplier);
        updateChances(res.higherChance, res.lowerChance);
        els.fairness.innerHTML = UI.fairnessLine(res.fairness);
        UI.applyAccountUpdate(accountState, res);
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        els.start.disabled = false;
      }
    });

    async function doAction(action) {
      if (busy || !inRound) return;
      busy = true;
      [els.higher, els.lower, els.cashout].forEach((b) => (b.disabled = true));

      try {
        const res = await Api.post("/games/hilo/action", { action });

        if (res.card) els.card.innerHTML = renderCard(res.card);
        if (res.currentMultiplier !== undefined) setMultiplier(res.currentMultiplier);
        if (res.higherChance !== undefined) updateChances(res.higherChance, res.lowerChance);

        if (res.finished) {
          const isWin = res.outcome !== "bust";
          els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
          if (action === "cashout") {
            els.result.textContent = `💰 Cashed out at ${currentMultiplier.toFixed(2)}x — paid ${UI.money(res.payout)}!`;
          } else if (res.outcome === "bust") {
            els.result.textContent = `💥 Wrong guess! You busted — lost your bet.`;
          } else {
            els.result.textContent = `🎉 Paid ${UI.money(res.payout)}.`;
          }
          UI.applyAccountUpdate(accountState, res);
          UI.toast(isWin ? `Won ${UI.money(res.payout)} on Hi-Lo!` : "Busted on Hi-Lo.", isWin ? "win" : "loss");
          exitRound();
        } else if (res.push) {
          UI.toast("Push — same rank, multiplier unchanged.", "info");
        }
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        [els.higher, els.lower, els.cashout].forEach((b) => (b.disabled = false));
      }
    }

    els.higher.addEventListener("click", () => doAction("higher"));
    els.lower.addEventListener("click", () => doAction("lower"));
    els.cashout.addEventListener("click", () => doAction("cashout"));

    // Attempt to resume any active round on mount
    (async () => {
      try {
        const res = await Api.get("/games/hilo/active");
        enterRound();
        els.card.innerHTML = renderCard(res.card);
        setMultiplier(res.currentMultiplier);
        updateChances(res.higherChance, res.lowerChance);
        els.fairness.innerHTML = UI.fairnessLine(res.fairness);
      } catch {
        // No active round — that's fine
      }
    })();
  }

  return { render };
})();
