const LimboGame = (() => {
  function render(container, accountState) {
    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>📈 Limbo</h2>
          <p>Call a multiplier. The house generates a "crash point" — clear it and you win exactly your called multiplier.</p>
        </div>

        <div class="roll-display"><span id="limbo-number" class="roll-number">--x</span></div>

        <div class="controls-row">
          <div class="field">
            <label>Bet amount ($)</label>
            <input type="number" id="limbo-amount" value="10" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Target multiplier</label>
            <input type="number" id="limbo-target" value="2.00" min="1.01" step="0.01" />
          </div>
          <div class="field">
            <label>Win chance</label>
            <input type="text" id="limbo-chance" value="49.50%" disabled />
          </div>
          <div class="btn-row">
            <button id="limbo-play" class="primary-btn">Play</button>
          </div>
        </div>

        <div id="limbo-result" class="result-banner"></div>
        <div id="limbo-fairness"></div>
      </div>
    `;

    const els = {
      number: container.querySelector("#limbo-number"),
      amount: container.querySelector("#limbo-amount"),
      target: container.querySelector("#limbo-target"),
      chance: container.querySelector("#limbo-chance"),
      play: container.querySelector("#limbo-play"),
      result: container.querySelector("#limbo-result"),
      fairness: container.querySelector("#limbo-fairness"),
    };

    function refreshChance() {
      const target = Math.max(1.01, Number(els.target.value) || 1.01);
      // Mirrors the server's curve: P(crashAt >= target) = (1 - houseEdge) / target
      const chance = Math.min(100, ((1 - 0.01) / target) * 100);
      els.chance.value = `${chance.toFixed(2)}%`;
    }
    els.target.addEventListener("input", refreshChance);

    els.play.addEventListener("click", async () => {
      const dollars = Number(els.amount.value);
      const targetMultiplier = Number(els.target.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a bet amount.", "loss");
      if (!targetMultiplier || targetMultiplier < 1.01) return UI.toast("Target must be at least 1.01x.", "loss");

      const amount = Math.round(dollars * 100);
      els.play.disabled = true;
      els.number.textContent = "…";
      els.number.className = "roll-number";

      try {
        const res = await Api.post("/games/limbo", { amount, targetMultiplier });
        const crashAt = res.result.state.crashAt;
        const isWin = res.result.result === "win";

        animateCountUp(els.number, crashAt, isWin);
        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        els.result.textContent = isWin
          ? `🎉 Crashed at ${crashAt}x — your ${targetMultiplier}x call landed! Won ${UI.money(res.result.payout)}.`
          : `Crashed at ${crashAt}x — short of your ${targetMultiplier}x call. Lost ${UI.money(amount)}.`;

        els.fairness.innerHTML = UI.fairnessLine({
          serverSeedHash: accountState.fairness?.activeServerSeedHash,
          clientSeed: accountState.fairness?.clientSeed,
          nonce: res.nextNonce - 1,
        });

        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Limbo!` : `Lost ${UI.money(amount)} on Limbo.`, isWin ? "win" : "loss");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        els.play.disabled = false;
      }
    });

    function animateCountUp(node, target, isWin) {
      const duration = 700;
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const value = 1 + (target - 1) * t;
        node.textContent = `${value.toFixed(2)}x`;
        if (t < 1) requestAnimationFrame(frame);
        else node.className = `roll-number ${isWin ? "win" : "loss"}`;
      }
      requestAnimationFrame(frame);
    }

    refreshChance();
  }

  return { render };
})();
