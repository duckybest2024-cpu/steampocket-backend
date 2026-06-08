const DiceGame = (() => {
  function render(container, accountState) {
    let target = 50;
    let direction = "under"; // "under" wins below target, "over" wins above

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>🎲 Dice</h2>
          <p>Roll a number between 0 and 100. Pick a target and bet on whether the roll lands over or under it — narrower ranges pay more.</p>
        </div>

        <div class="roll-display"><span id="dice-roll-number" class="roll-number">--</span></div>
        <div class="range-track" id="dice-track" style="--split: 50%">
          <div class="range-marker" id="dice-marker" style="left: 50%"></div>
        </div>
        <p style="text-align:center; color:var(--text-dim); font-size:0.8rem; margin: 8px 0 0">
          Win chance: <span id="dice-chance">50.00</span>% &nbsp;·&nbsp; Multiplier: <span id="dice-mult">1.98</span>x
        </p>

        <div class="controls-row" style="margin-top:20px">
          <div class="field">
            <label>Bet amount ($)</label>
            <input type="number" id="dice-amount" value="10" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Target</label>
            <input type="number" id="dice-target" value="50" min="0.01" max="99.99" step="0.01" />
          </div>
          <div class="field">
            <label>Direction</label>
            <div class="toggle-group">
              <button id="dice-under" class="active">Roll Under</button>
              <button id="dice-over">Roll Over</button>
            </div>
          </div>
          <div class="btn-row">
            <button id="dice-roll" class="primary-btn">Roll the dice</button>
          </div>
        </div>

        <div id="dice-result" class="result-banner"></div>
        <div id="dice-fairness"></div>
      </div>
    `;

    const els = {
      number: container.querySelector("#dice-roll-number"),
      track: container.querySelector("#dice-track"),
      marker: container.querySelector("#dice-marker"),
      chance: container.querySelector("#dice-chance"),
      mult: container.querySelector("#dice-mult"),
      amount: container.querySelector("#dice-amount"),
      target: container.querySelector("#dice-target"),
      under: container.querySelector("#dice-under"),
      over: container.querySelector("#dice-over"),
      rollBtn: container.querySelector("#dice-roll"),
      result: container.querySelector("#dice-result"),
      fairness: container.querySelector("#dice-fairness"),
    };

    function refreshOdds() {
      target = Math.min(99.99, Math.max(0.01, Number(els.target.value) || 50));
      const winChance = direction === "over" ? 100 - target : target;
      const fairMultiplier = 100 / winChance;
      const multiplier = fairMultiplier * 0.99;
      els.chance.textContent = winChance.toFixed(2);
      els.mult.textContent = multiplier.toFixed(4);
      els.track.style.setProperty("--split", `${target}%`);
      // Colour the track so the *winning* zone is green regardless of direction.
      els.track.style.background =
        direction === "under"
          ? `linear-gradient(90deg, var(--win) 0%, var(--win) ${target}%, var(--loss) ${target}%, var(--loss) 100%)`
          : `linear-gradient(90deg, var(--loss) 0%, var(--loss) ${target}%, var(--win) ${target}%, var(--win) 100%)`;
    }

    els.target.addEventListener("input", refreshOdds);

    function setDirection(dir) {
      direction = dir;
      els.under.classList.toggle("active", dir === "under");
      els.over.classList.toggle("active", dir === "over");
      refreshOdds();
    }
    els.under.addEventListener("click", () => setDirection("under"));
    els.over.addEventListener("click", () => setDirection("over"));

    els.rollBtn.addEventListener("click", async () => {
      const dollars = Number(els.amount.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a bet amount first.", "loss");
      const amount = Math.round(dollars * 100);

      els.rollBtn.disabled = true;
      els.number.textContent = "…";
      els.number.className = "roll-number";

      try {
        const res = await Api.post("/games/dice", { amount, target, direction });
        const rollValue = res.result.state.roll;
        const isWin = res.result.result === "win";

        els.marker.style.left = `${rollValue}%`;
        els.number.textContent = rollValue.toFixed(2);
        els.number.className = `roll-number ${isWin ? "win" : "loss"}`;

        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        els.result.textContent = isWin
          ? `🎉 Rolled ${rollValue.toFixed(2)} — you won ${UI.money(res.result.payout)} (${res.result.multiplier}x)`
          : `Rolled ${rollValue.toFixed(2)} — that didn't clear your target. Lost ${UI.money(amount)}.`;

        els.fairness.innerHTML = UI.fairnessLine({
          serverSeedHash: accountState.fairness?.activeServerSeedHash,
          clientSeed: accountState.fairness?.clientSeed,
          nonce: res.nextNonce - 1,
        });

        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Dice!` : `Lost ${UI.money(amount)} on Dice.`, isWin ? "win" : "loss");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        els.rollBtn.disabled = false;
      }
    });

    refreshOdds();
  }

  return { render };
})();
