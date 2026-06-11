const HorseRaceGame = (() => {
  const HORSES = [
    { id: 0, name: "Lightning", emoji: "⚡", color: "#f59e0b", odds: 2.0 },
    { id: 1, name: "Thunder",   emoji: "⛈️", color: "#6366f1", odds: 3.0 },
    { id: 2, name: "Phoenix",   emoji: "🦅", color: "#ef4444", odds: 4.0 },
    { id: 3, name: "Shadow",    emoji: "🌑", color: "#374151", odds: 5.0 },
    { id: 4, name: "Blaze",     emoji: "🔥", color: "#f97316", odds: 7.0 },
    { id: 5, name: "Lucky",     emoji: "🍀", color: "#10b981", odds: 10.0 },
  ];

  function render(container, state) {
    let socket = null;
    let positions = HORSES.map(() => 0);
    let selectedHorse = -1;
    let betPlaced = false;
    let phaseTimer = null;
    let phaseEnd = 0;

    container.innerHTML = `
      <div class="game-panel" style="max-width:740px">
        <h2 style="margin:0 0 4px">🏇 Horse Racing</h2>
        <p style="margin:0 0 14px;color:var(--text-dim);font-size:0.88rem">Pick your horse and bet before the gates open!</p>

        <div id="hr-track" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px"></div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="hr-horse-btns"></div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input id="hr-amount" type="number" value="100" min="1" step="1" style="flex:1" placeholder="Bet amount (chips)" />
          <button id="hr-bet" class="primary-btn">Place Bet</button>
        </div>

        <div id="hr-phase" style="font-size:0.88rem;color:var(--text-dim);margin-bottom:8px">Waiting for phase…</div>
        <div id="hr-result" class="result-banner"></div>

        <div id="hr-history" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"></div>
      </div>`;

    const trackEl = document.getElementById("hr-track");
    const horseBtns = document.getElementById("hr-horse-btns");
    const amountEl = document.getElementById("hr-amount");
    const betBtn = document.getElementById("hr-bet");
    const phaseEl = document.getElementById("hr-phase");
    const resultEl = document.getElementById("hr-result");
    const historyEl = document.getElementById("hr-history");

    // Build horse buttons
    for (const h of HORSES) {
      const btn = document.createElement("button");
      btn.className = "secondary-btn";
      btn.style.cssText = `border-color:${h.color};flex:1;min-width:90px;font-size:0.82rem`;
      btn.innerHTML = `${h.emoji} ${h.name}<br><span style="color:${h.color};font-weight:700">${h.odds}x</span>`;
      btn.dataset.id = h.id;
      btn.addEventListener("click", () => {
        selectedHorse = h.id;
        horseBtns.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
      horseBtns.appendChild(btn);
    }

    function renderTrack(pos) {
      trackEl.innerHTML = HORSES.map((h, i) => {
        const pct = Math.min(100, pos[i] ?? 0);
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:80px;font-size:0.8rem;color:${h.color};font-weight:700">${h.emoji} ${h.name}</span>
          <div style="flex:1;background:var(--bg);border-radius:20px;height:22px;overflow:hidden;position:relative">
            <div style="height:100%;width:${pct}%;background:${h.color};border-radius:20px;transition:width 0.1s;position:relative">
              ${pct > 5 ? `<span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:1rem">${h.emoji}</span>` : ""}
            </div>
          </div>
          <span style="width:36px;font-size:0.78rem;color:var(--text-dim);text-align:right">${pct.toFixed(0)}%</span>
        </div>`;
      }).join("");
    }

    socket = io("/horserace", { auth: { token: Api.getToken() } });

    socket.on("horses", () => {});

    socket.on("phase", ({ phase, endsAt, positions: pos, history, winnerHorse }) => {
      if (pos) { positions = pos; renderTrack(positions); }
      if (history) renderHistory(history);

      if (phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
      phaseEnd = endsAt;

      if (phase === "betting") {
        betBtn.disabled = false;
        betPlaced = false;
        resultEl.className = "result-banner";
        resultEl.textContent = "";
        const tick = () => {
          const rem = Math.max(0, Math.ceil((phaseEnd - Date.now()) / 1000));
          phaseEl.textContent = `🎰 Betting open — ${rem}s remaining`;
          if (rem <= 0 && phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
        };
        tick();
        phaseTimer = setInterval(tick, 1000);
      } else if (phase === "racing") {
        betBtn.disabled = true;
        phaseEl.textContent = "🏁 Race in progress!";
      } else if (phase === "results" && winnerHorse !== null) {
        const h = HORSES[winnerHorse];
        phaseEl.textContent = `🏆 ${h.emoji} ${h.name} wins!`;
      }
    });

    socket.on("positions", (pos) => { positions = pos; renderTrack(positions); });

    socket.on("bet_ok", ({ horseId }) => {
      betPlaced = true;
      betBtn.disabled = true;
      phaseEl.textContent += ` — You bet on ${HORSES[horseId].emoji} ${HORSES[horseId].name}!`;
    });

    socket.on("bets_update", (bets) => {
      // show count
    });

    socket.on("error", (msg) => UI.toast(msg, "loss"));

    betBtn.addEventListener("click", () => {
      if (selectedHorse < 0) return UI.toast("Pick a horse first", "loss");
      if (betPlaced) return UI.toast("Already bet this round", "loss");
      const amount = Math.round(Number(amountEl.value) * 100);
      if (amount < 100) return UI.toast("Min bet: 1 chip", "loss");
      socket.emit("bet", { horseId: selectedHorse, amount });
    });

    function renderHistory(history) {
      historyEl.innerHTML = (history || []).slice(0, 10).map((h) =>
        `<div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:0.8rem">${h.emoji} ${h.winner}</div>`
      ).join("");
    }

    renderTrack(positions);

    return () => { if (socket) socket.disconnect(); if (phaseTimer) clearInterval(phaseTimer); };
  }

  return { render };
})();
