const JackpotGame = (() => {
  function render(container, state) {
    let socket = null;
    let countdown = null;

    container.innerHTML = `
      <div class="game-panel" style="max-width:700px">
        <h2 style="margin:0 0 4px">🏆 Jackpot</h2>
        <p style="margin:0 0 18px;color:var(--text-dim);font-size:0.88rem">Drop chips in the pot — one winner takes it all, weighted by contribution.</p>

        <div style="display:flex;gap:12px;margin-bottom:18px">
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em">Total Pot</div>
            <div id="jp-pot" style="font-size:1.8rem;font-weight:800;color:var(--gold)">0 🪙</div>
          </div>
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em">Players</div>
            <div id="jp-players" style="font-size:1.8rem;font-weight:800">0</div>
          </div>
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em">Spin In</div>
            <div id="jp-countdown" style="font-size:1.8rem;font-weight:800;color:var(--accent)">—</div>
          </div>
        </div>

        <div id="jp-entries" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;min-height:80px;max-height:200px;overflow-y:auto"></div>

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <input id="jp-amount" type="number" value="1000" min="100" step="100" style="flex:1" placeholder="Chips to enter" />
          <button id="jp-enter" class="primary-btn">Enter Jackpot</button>
        </div>

        <div id="jp-result" class="result-banner"></div>

        <div style="margin-top:18px">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Recent Winners</div>
          <div id="jp-history" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        </div>
      </div>`;

    const potEl = document.getElementById("jp-pot");
    const playersEl = document.getElementById("jp-players");
    const cdEl = document.getElementById("jp-countdown");
    const entriesEl = document.getElementById("jp-entries");
    const resultEl = document.getElementById("jp-result");
    const historyEl = document.getElementById("jp-history");
    const amountEl = document.getElementById("jp-amount");
    const enterBtn = document.getElementById("jp-enter");

    socket = io("/jackpot", { auth: { token: Api.getToken() } });

    function renderEntries(entries, totalPot) {
      if (!entries.length) { entriesEl.innerHTML = '<div style="color:var(--text-dim);font-size:0.88rem;text-align:center;padding:20px">No entries yet — be the first!</div>'; return; }
      entriesEl.innerHTML = entries.map((e) => {
        const pct = totalPot > 0 ? ((e.amount / totalPot) * 100).toFixed(1) : "0";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-weight:600">${e.username}</span>
          <span style="color:var(--gold)">${(e.amount / 100).toLocaleString()} 🪙</span>
          <span style="color:var(--text-dim);font-size:0.82rem">${pct}% chance</span>
        </div>`;
      }).join("");
    }

    socket.on("state", ({ entries, totalPot, spinning, history }) => {
      potEl.textContent = (totalPot / 100).toLocaleString() + " 🪙";
      const uniq = new Set(entries.map((e) => e.userId)).size;
      playersEl.textContent = uniq;
      renderEntries(entries, totalPot);
      if (!spinning) cdEl.textContent = entries.length ? "soon" : "—";
      renderHistory(history);
    });

    socket.on("countdown", (ms) => {
      if (countdown) clearInterval(countdown);
      let rem = Math.ceil(ms / 1000);
      cdEl.textContent = rem + "s";
      countdown = setInterval(() => {
        rem--;
        if (rem <= 0) { clearInterval(countdown); cdEl.textContent = "—"; }
        else cdEl.textContent = rem + "s";
      }, 1000);
    });

    socket.on("spinning", () => {
      enterBtn.disabled = true;
      cdEl.textContent = "🎰";
      if (countdown) { clearInterval(countdown); countdown = null; }
    });

    socket.on("result", ({ winner, prize, totalPot }) => {
      const myName = state.username;
      const isWinner = winner === myName;
      resultEl.className = "result-banner " + (isWinner ? "win" : "loss");
      resultEl.textContent = isWinner
        ? `🏆 You won! +${(prize / 100).toLocaleString()} chips`
        : `Winner: ${winner} took ${(prize / 100).toLocaleString()} 🪙`;
      if (isWinner) App.refreshAccount();
      enterBtn.disabled = false;
    });

    socket.on("error", (msg) => { UI.toast(msg, "loss"); enterBtn.disabled = false; });

    function renderHistory(history) {
      historyEl.innerHTML = (history || []).map((h) =>
        `<div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:0.8rem"><strong>${h.winner}</strong> won ${(h.amount/100).toLocaleString()} 🪙</div>`
      ).join("");
    }

    enterBtn.addEventListener("click", () => {
      const amount = Math.round(Number(amountEl.value) * 100);
      if (amount < 100) return UI.toast("Min entry: 1 chip", "loss");
      enterBtn.disabled = true;
      socket.emit("enter", { amount });
      setTimeout(() => { enterBtn.disabled = false; }, 1500);
    });

    return () => { if (socket) socket.disconnect(); if (countdown) clearInterval(countdown); };
  }

  return { render };
})();
