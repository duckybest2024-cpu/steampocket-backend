const TowerGame = (() => {
  const LEVELS = [1.05, 1.10, 1.20, 1.35, 1.55, 1.80, 2.15, 2.60, 3.20, 4.00, 5.00, 6.50, 8.50, 11.0, 15.0, 20.0, 30.0, 50.0, 75.0, 100.0];

  function render(container, state) {
    let socket = null;
    let active = false;
    let currentLevel = 0;
    let bet = 0;

    container.innerHTML = `
      <div class="game-panel" style="max-width:540px">
        <h2 style="margin:0 0 4px">🗼 Tower</h2>
        <p style="margin:0 0 14px;color:var(--text-dim);font-size:0.88rem">Climb the tower floor by floor — each floor has a 20% chance of collapse. Cash out anytime!</p>

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <input id="tw-amount" type="number" value="100" min="1" style="flex:1" placeholder="Bet (chips)" />
          <button id="tw-start" class="primary-btn">Start Climb</button>
        </div>

        <div id="tw-tower" style="display:flex;flex-direction:column-reverse;gap:3px;margin-bottom:14px;min-height:200px"></div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button id="tw-climb" class="primary-btn" style="flex:1;display:none">Climb Higher</button>
          <button id="tw-cashout" class="secondary-btn" style="flex:1;display:none">Cash Out</button>
        </div>

        <div id="tw-result" class="result-banner"></div>
      </div>`;

    const amountEl = document.getElementById("tw-amount");
    const startBtn = document.getElementById("tw-start");
    const climbBtn = document.getElementById("tw-climb");
    const cashoutBtn = document.getElementById("tw-cashout");
    const towerEl = document.getElementById("tw-tower");
    const resultEl = document.getElementById("tw-result");

    function renderTower(level) {
      towerEl.innerHTML = LEVELS.map((mult, i) => {
        const floor = i + 1;
        const isActive = floor === level;
        const isPassed = floor < level;
        const isPending = floor > level;
        let bg = "var(--bg-elev)";
        let border = "var(--border)";
        let color = "var(--text-dim)";
        if (isActive) { bg = "var(--accent)"; border = "var(--accent)"; color = "white"; }
        else if (isPassed) { bg = "rgba(52,211,153,0.15)"; border = "var(--win)"; color = "var(--win)"; }

        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-radius:8px;background:${bg};border:1px solid ${border};color:${color};font-size:0.85rem;transition:all 0.3s">
          <span style="font-weight:700">Floor ${floor}</span>
          <span>${isPassed ? "✅" : isActive ? "👤" : ""}</span>
          <span style="font-weight:700;color:${isActive ? "white" : "var(--gold)"}">×${mult}</span>
          <span style="font-size:0.75rem">${(bet > 0 ? (bet * mult / 100).toFixed(0) : "—")} 🪙</span>
        </div>`;
      }).join("");
    }

    socket = io("/tower", { auth: { token: Api.getToken() } });

    socket.on("tower_state", ({ level, multiplier, maxLevels }) => {
      active = true;
      currentLevel = level;
      renderTower(level);
      amountEl.disabled = true;
      startBtn.style.display = "none";
      climbBtn.style.display = "";
      cashoutBtn.style.display = "";
      cashoutBtn.textContent = `Cash Out (×${multiplier} = ${(bet * multiplier / 100).toFixed(0)} 🪙)`;
      resultEl.className = "result-banner";
      if (level === 0) resultEl.textContent = "";
      else resultEl.textContent = `Floor ${level} — multiplier: ×${multiplier}`;
    });

    socket.on("tower_fail", ({ level }) => {
      active = false;
      currentLevel = 0;
      resultEl.className = "result-banner loss";
      resultEl.textContent = `💥 Floor ${level + 1} collapsed! You lost ${(bet / 100).toFixed(0)} chips.`;
      reset();
    });

    socket.on("tower_cashout", ({ multiplier, payout }) => {
      active = false;
      currentLevel = 0;
      resultEl.className = "result-banner win";
      resultEl.textContent = `💰 Cashed out at ×${multiplier} — +${(payout / 100).toLocaleString()} chips!`;
      App.refreshAccount();
      reset();
    });

    socket.on("error", (msg) => { UI.toast(msg, "loss"); if (!active) reset(); });

    function reset() {
      amountEl.disabled = false;
      startBtn.style.display = "";
      climbBtn.style.display = "none";
      cashoutBtn.style.display = "none";
      renderTower(0);
    }

    startBtn.addEventListener("click", () => {
      bet = Math.round(Number(amountEl.value) * 100);
      if (bet < 100) return UI.toast("Min bet: 1 chip", "loss");
      socket.emit("start", { amount: bet });
      renderTower(0);
    });

    climbBtn.addEventListener("click", () => { socket.emit("climb"); });
    cashoutBtn.addEventListener("click", () => { socket.emit("cashout"); });

    renderTower(0);

    return () => { if (socket) socket.disconnect(); };
  }

  return { render };
})();
