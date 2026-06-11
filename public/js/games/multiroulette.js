const MultiRouletteGame = (() => {
  const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  function getColor(n) { return n === 0 ? "#10b981" : RED.has(n) ? "#ef4444" : "#1f2937"; }

  function render(container, state) {
    let socket = null;
    let myBets = [];
    let phaseTimer = null;

    container.innerHTML = `
      <div class="game-panel" style="max-width:720px">
        <h2 style="margin:0 0 4px">🎡 Multiplayer Roulette</h2>
        <p style="margin:0 0 12px;color:var(--text-dim);font-size:0.88rem">Everyone bets on the same spin — new round every 30 seconds.</p>

        <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center">
          <div id="mr-ball" style="width:64px;height:64px;border-radius:50%;background:var(--bg-elev);border:3px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:800;transition:all 0.5s">?</div>
          <div style="flex:1">
            <div id="mr-phase" style="font-size:1rem;font-weight:700;margin-bottom:4px">Loading…</div>
            <div id="mr-history" style="display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto"></div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="mr-amount" type="number" value="100" min="1" style="flex:1;max-width:160px" placeholder="Bet (chips)" />
          <span style="align-self:center;color:var(--text-dim);font-size:0.85rem">× pick a bet type below</span>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          ${[
            {t:"red",l:"🔴 Red",p:2},{t:"black",l:"⚫ Black",p:2},{t:"green",l:"🟢 0",p:36},
            {t:"even",l:"Even",p:2},{t:"odd",l:"Odd",p:2},
            {t:"1-18",l:"Low (1-18)",p:2},{t:"19-36",l:"High (19-36)",p:2},
            {t:"1-12",l:"1st 12",p:3},{t:"13-24",l:"2nd 12",p:3},{t:"25-36",l:"3rd 12",p:3}
          ].map((b) => `<button class="secondary-btn mr-bet-btn" data-type="${b.t}" style="font-size:0.82rem;padding:7px 10px">${b.l} <span style="color:var(--text-dim)">${b.p}x</span></button>`).join("")}
        </div>

        <div id="mr-my-bets" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:10px;font-size:0.84rem;color:var(--text-dim);min-height:36px">No bets placed yet.</div>

        <div id="mr-result" class="result-banner"></div>
      </div>`;

    const ballEl = document.getElementById("mr-ball");
    const phaseEl = document.getElementById("mr-phase");
    const histEl = document.getElementById("mr-history");
    const amountEl = document.getElementById("mr-amount");
    const myBetsEl = document.getElementById("mr-my-bets");
    const resultEl = document.getElementById("mr-result");

    function updateMyBets() {
      if (!myBets.length) { myBetsEl.textContent = "No bets placed yet."; return; }
      myBetsEl.innerHTML = myBets.map((b) => `<span style="background:var(--accent);color:white;border-radius:6px;padding:3px 8px;margin:2px;display:inline-block;font-size:0.78rem">${b.betType}: ${(b.amount/100)}🪙</span>`).join("");
    }

    function startPhaseTimer(ms) {
      if (phaseTimer) clearInterval(phaseTimer);
      let rem = Math.ceil(ms / 1000);
      const tick = () => {
        phaseEl.textContent = `🎰 Betting open — ${rem}s`;
        rem--;
        if (rem < 0) { clearInterval(phaseTimer); phaseTimer = null; }
      };
      tick();
      phaseTimer = setInterval(tick, 1000);
    }

    socket = io("/multiroulette", { auth: { token: Api.getToken() } });

    socket.on("phase", ({ phase, endsAt, number, color, results, history }) => {
      if (history) {
        histEl.innerHTML = (history || []).slice(0,15).map((n) =>
          `<div style="min-width:28px;height:28px;border-radius:50%;background:${getColor(n)};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:white">${n}</div>`
        ).join("");
      }

      if (phase === "betting") {
        myBets = [];
        updateMyBets();
        ballEl.textContent = "?";
        ballEl.style.background = "var(--bg-elev)";
        ballEl.style.borderColor = "var(--border)";
        ballEl.style.color = "var(--text)";
        resultEl.className = "result-banner";
        document.querySelectorAll(".mr-bet-btn").forEach((b) => b.disabled = false);
        const ms = Math.max(0, endsAt - Date.now());
        startPhaseTimer(ms);
      } else if (phase === "spinning") {
        phaseEl.textContent = "🎰 Ball is spinning…";
        if (phaseTimer) { clearInterval(phaseTimer); phaseTimer = null; }
        document.querySelectorAll(".mr-bet-btn").forEach((b) => b.disabled = true);
        let spin = 0;
        const spinAnim = setInterval(() => {
          spin = Math.floor(Math.random() * 37);
          ballEl.textContent = spin;
          ballEl.style.background = getColor(spin);
          ballEl.style.color = "white";
        }, 150);
        setTimeout(() => {
          clearInterval(spinAnim);
          if (number !== undefined) {
            ballEl.textContent = number;
            ballEl.style.background = getColor(number);
          }
        }, 5500);
      } else if (phase === "results") {
        ballEl.textContent = number;
        ballEl.style.background = getColor(number);
        ballEl.style.color = "white";
        ballEl.style.borderColor = getColor(number);

        const myWins = (results || []).filter((r) => r.username === state.username);
        if (myWins.length) {
          const total = myWins.reduce((s, r) => s + r.payout, 0);
          resultEl.className = "result-banner win";
          resultEl.textContent = `🎉 You win! +${(total/100).toLocaleString()} chips on ${myWins.map((r) => r.betType).join(", ")}`;
          App.refreshAccount();
        } else if (myBets.length) {
          resultEl.className = "result-banner loss";
          resultEl.textContent = `Ball landed on ${number} — no win this round.`;
        }
        phaseEl.textContent = `Result: ${number} (${getColor(number) === "#ef4444" ? "🔴 Red" : getColor(number) === "#10b981" ? "🟢 Zero" : "⚫ Black"})`;
      }
    });

    socket.on("bet_ok", () => {});
    socket.on("bets_update", (count) => {
      phaseEl.textContent = phaseEl.textContent.replace(/\d+ bet.*$/, "") + ` · ${count} bets placed`;
    });
    socket.on("error", (msg) => UI.toast(msg, "loss"));

    document.querySelectorAll(".mr-bet-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const amount = Math.round(Number(amountEl.value) * 100);
        if (amount < 100) return UI.toast("Min bet: 1 chip", "loss");
        const betType = btn.dataset.type;
        socket.emit("bet", { betType, amount });
        myBets.push({ betType, amount });
        updateMyBets();
        App.refreshAccount();
      });
    });

    return () => { if (socket) socket.disconnect(); if (phaseTimer) clearInterval(phaseTimer); };
  }

  return { render };
})();
