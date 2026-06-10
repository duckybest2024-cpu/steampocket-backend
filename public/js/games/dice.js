const DiceGame = (() => {
  function render(container, accountState) {
    let target = 50;
    let direction = "under"; // "under" wins below target, "over" wins above

    container.innerHTML = `
      <div class="game-panel"><div class="game-layout">

        <aside class="bet-panel">
          <div class="bp-tabs">
            <button class="bp-tab active" id="dice-tab-manual">Manual</button>
            <button class="bp-tab" id="dice-tab-auto">Auto</button>
          </div>

          <div class="bp-field">
            <label class="bp-label">Bet Amount ($)</label>
            <div class="bp-input-row">
              <input type="number" id="dice-amount" value="10" min="0.01" step="0.01" />
              <button class="quick-btn" id="dice-half">½</button>
              <button class="quick-btn" id="dice-dbl">2×</button>
            </div>
          </div>

          <div class="bp-field">
            <label class="bp-label">Target (0 – 99.99)</label>
            <input type="number" id="dice-target" value="50" min="0.01" max="99.99" step="0.01" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Direction</label>
            <div class="toggle-group">
              <button id="dice-under" class="active">Roll Under</button>
              <button id="dice-over">Roll Over</button>
            </div>
          </div>

          <hr class="bp-divider" />

          <div class="bp-bottom">
            <button class="play-btn" id="dice-bet">Roll Dice</button>
          </div>
        </aside>

        <div class="game-canvas">
          <div class="roll-display"><span id="dice-roll-number" class="roll-number">--</span></div>

          <div class="range-track" id="dice-track" style="--split: 50%">
            <div class="range-marker" id="dice-marker" style="left: 50%"></div>
          </div>

          <div class="range-ticks">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>

          <div class="stat-boxes">
            <div class="stat-box" id="dice-mult-box">
              <div class="sb-label">Multiplier</div>
              <div class="sb-value" id="dice-mult-display">1.98×</div>
            </div>
            <div class="stat-box" id="dice-target-box">
              <div class="sb-label">Roll Under</div>
              <div class="sb-value" id="dice-target-display">&lt; 50.00</div>
            </div>
            <div class="stat-box" id="dice-chance-box">
              <div class="sb-label">Win Chance</div>
              <div class="sb-value" id="dice-chance-display">50.00%</div>
            </div>
          </div>

          <div id="dice-result" class="result-banner"></div>
          <div id="dice-fairness" class="fairness-line"></div>
        </div>

      </div></div>
    `;

    const els = {
      number: container.querySelector("#dice-roll-number"),
      track: container.querySelector("#dice-track"),
      marker: container.querySelector("#dice-marker"),
      chance: container.querySelector("#dice-chance-display"),
      mult: container.querySelector("#dice-mult-display"),
      multDisplay: container.querySelector("#dice-mult-display"),
      targetDisplay: container.querySelector("#dice-target-display"),
      chanceDisplay: container.querySelector("#dice-chance-display"),
      amount: container.querySelector("#dice-amount"),
      half: container.querySelector("#dice-half"),
      dbl: container.querySelector("#dice-dbl"),
      target: container.querySelector("#dice-target"),
      under: container.querySelector("#dice-under"),
      over: container.querySelector("#dice-over"),
      betBtn: container.querySelector("#dice-bet"),
      result: container.querySelector("#dice-result"),
      fairness: container.querySelector("#dice-fairness"),
    };

    function refreshOdds() {
      target = Math.min(99.99, Math.max(0.01, Number(els.target.value) || 50));
      const winChance = direction === "over" ? 100 - target : target;
      const fairMultiplier = 100 / winChance;
      const multiplier = fairMultiplier * 0.99;
      const outcome = { multiplier, winChance };

      els.track.style.setProperty("--split", `${target}%`);
      // Colour the track so the *winning* zone is green regardless of direction.
      els.track.style.background =
        direction === "under"
          ? `linear-gradient(90deg, var(--win) 0%, var(--win) ${target}%, var(--loss) ${target}%, var(--loss) 100%)`
          : `linear-gradient(90deg, var(--loss) 0%, var(--loss) ${target}%, var(--win) ${target}%, var(--win) 100%)`;

      els.multDisplay.textContent = `${outcome.multiplier.toFixed(4)}×`;
      els.targetDisplay.textContent = direction === "under" ? `< ${target.toFixed(2)}` : `> ${target.toFixed(2)}`;
      els.chanceDisplay.textContent = `${outcome.winChance.toFixed(4)}%`;
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

    // ½ and 2× quick buttons
    els.half.addEventListener("click", () => {
      els.amount.value = Math.max(1, Math.floor(Number(els.amount.value) * 0.5));
    });
    els.dbl.addEventListener("click", () => {
      els.amount.value = Math.floor(Number(els.amount.value) * 2);
    });

    // Manual/Auto tabs (visual only)
    container.querySelectorAll(".bp-tab").forEach(t => t.addEventListener("click", function() {
      container.querySelectorAll(".bp-tab").forEach(x => x.classList.remove("active"));
      this.classList.add("active");
    }));

    els.betBtn.addEventListener("click", async () => {
      const dollars = Number(els.amount.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a bet amount first.", "loss");
      const amount = Math.round(dollars * 100);

      els.betBtn.disabled = true;
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
        els.betBtn.disabled = false;
      }
    });

    refreshOdds();
  }

  return { render };
})();
