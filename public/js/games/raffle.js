const RaffleGame = (() => {
  function render(container, state) {
    let socket = null;
    let nextDrawAt = Date.now() + 300_000;
    let timerInterval = null;

    container.innerHTML = `
      <div class="game-panel" style="max-width:560px">
        <h2 style="margin:0 0 4px">🎟️ Raffle</h2>
        <p style="margin:0 0 14px;color:var(--text-dim);font-size:0.88rem">Buy tickets — every 5 minutes a winner is drawn. More tickets = better odds!</p>

        <div style="display:flex;gap:10px;margin-bottom:14px">
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Ticket Price</div>
            <div id="rf-price" style="font-size:1.4rem;font-weight:800;color:var(--gold)">10 🪙</div>
          </div>
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Tickets Sold</div>
            <div id="rf-total" style="font-size:1.4rem;font-weight:800">0</div>
          </div>
          <div style="flex:1;background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase">Draw In</div>
            <div id="rf-countdown" style="font-size:1.4rem;font-weight:800;color:var(--accent)">—</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <input id="rf-count" type="number" value="5" min="1" max="100" style="flex:1" placeholder="Number of tickets" />
          <button id="rf-buy" class="primary-btn">Buy Tickets (10 🪙 each)</button>
        </div>

        <div id="rf-my-tickets" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;font-size:0.85rem;color:var(--text-dim)">
          You have no tickets this round yet.
        </div>

        <div id="rf-result" class="result-banner"></div>

        <div style="margin-top:14px">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Recent Winners</div>
          <div id="rf-history" style="display:flex;flex-direction:column;gap:4px"></div>
        </div>
      </div>`;

    const priceEl = document.getElementById("rf-price");
    const totalEl = document.getElementById("rf-total");
    const cdEl = document.getElementById("rf-countdown");
    const countEl = document.getElementById("rf-count");
    const buyBtn = document.getElementById("rf-buy");
    const myTicketsEl = document.getElementById("rf-my-tickets");
    const resultEl = document.getElementById("rf-result");
    const historyEl = document.getElementById("rf-history");

    let myTickets = [];

    function startTimer() {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((nextDrawAt - Date.now()) / 1000));
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        cdEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
        if (rem === 0) { clearInterval(timerInterval); cdEl.textContent = "🎰"; }
      }, 1000);
    }

    socket = io("/raffle", { auth: { token: Api.getToken() } });

    socket.on("state", ({ tickets, nextDrawAt: nda, ticketPrice, history }) => {
      nextDrawAt = nda;
      totalEl.textContent = tickets;
      priceEl.textContent = (ticketPrice / 100) + " 🪙";
      buyBtn.textContent = `Buy Tickets (${(ticketPrice / 100)} 🪙 each)`;
      startTimer();
      renderHistory(history);
    });

    socket.on("tickets_ok", ({ count, ticketNums }) => {
      myTickets = [...myTickets, ...ticketNums];
      myTicketsEl.innerHTML = `<span style="color:var(--text)">Your tickets this round: </span>${myTickets.map((n) => `<span style="background:var(--accent);color:white;border-radius:4px;padding:2px 7px;margin:2px;display:inline-block;font-size:0.8rem">#${n}</span>`).join("")}`;
      buyBtn.disabled = false;
      App.refreshAccount();
    });

    socket.on("draw_result", ({ winner, winnerTicket, prize, totalTickets }) => {
      const isWinner = winner === state.username;
      resultEl.className = "result-banner " + (isWinner ? "win" : "loss");
      resultEl.innerHTML = isWinner
        ? `🎟️ YOUR ticket #${winnerTicket} was drawn! +${(prize/100).toLocaleString()} chips 🏆`
        : `🎟️ Ticket #${winnerTicket} (${winner}) wins ${(prize/100).toLocaleString()} chips from ${totalTickets} tickets`;
      if (isWinner) App.refreshAccount();
      myTickets = [];
      myTicketsEl.innerHTML = "You have no tickets this round yet.";
    });

    socket.on("error", (msg) => { UI.toast(msg, "loss"); buyBtn.disabled = false; });

    buyBtn.addEventListener("click", () => {
      const count = parseInt(countEl.value, 10);
      if (!count || count < 1 || count > 100) return UI.toast("1-100 tickets per purchase", "loss");
      buyBtn.disabled = true;
      socket.emit("buy_tickets", { count });
    });

    function renderHistory(history) {
      historyEl.innerHTML = (history || []).map((h) =>
        `<div style="display:flex;justify-content:space-between;background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:0.82rem">
          <span><strong>${h.winner}</strong></span>
          <span style="color:var(--gold)">+${(h.prize/100).toLocaleString()} 🪙</span>
          <span style="color:var(--text-dim)">${h.tickets} tickets</span>
        </div>`
      ).join("");
    }

    return () => { if (socket) socket.disconnect(); if (timerInterval) clearInterval(timerInterval); };
  }

  return { render };
})();
