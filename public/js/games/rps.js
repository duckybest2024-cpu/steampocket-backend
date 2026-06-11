const RPSGame = (() => {
  const EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };

  function render(container, state) {
    let socket = null;
    let matchId = "";
    let inQueue = false;
    let inMatch = false;

    container.innerHTML = `
      <div class="game-panel" style="max-width:500px;text-align:center">
        <h2 style="margin:0 0 4px">✊ Rock Paper Scissors</h2>
        <p style="margin:0 0 18px;color:var(--text-dim);font-size:0.88rem">1v1 — winner takes 95% of the pot.</p>

        <div id="rps-lobby" style="margin-bottom:18px">
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <input id="rps-amount" type="number" value="100" min="1" style="flex:1" placeholder="Bet (chips)" />
            <button id="rps-queue" class="primary-btn">Find Match</button>
          </div>
          <div id="rps-status" style="font-size:0.88rem;color:var(--text-dim)">Enter a bet and click Find Match to be paired with someone.</div>
        </div>

        <div id="rps-match" style="display:none">
          <div id="rps-vs" style="margin-bottom:16px;font-size:1.1rem;font-weight:700"></div>
          <div style="display:flex;gap:14px;justify-content:center;margin-bottom:14px">
            <button class="rps-choice secondary-btn" data-c="rock" style="font-size:2rem;padding:16px 20px;flex:1;max-width:120px">🪨<br><span style="font-size:0.75rem">Rock</span></button>
            <button class="rps-choice secondary-btn" data-c="paper" style="font-size:2rem;padding:16px 20px;flex:1;max-width:120px">📄<br><span style="font-size:0.75rem">Paper</span></button>
            <button class="rps-choice secondary-btn" data-c="scissors" style="font-size:2rem;padding:16px 20px;flex:1;max-width:120px">✂️<br><span style="font-size:0.75rem">Scissors</span></button>
          </div>
          <div id="rps-waiting-choice" style="color:var(--text-dim);font-size:0.88rem;display:none">Waiting for opponent…</div>
        </div>

        <div id="rps-result" class="result-banner" style="font-size:1.1rem"></div>
      </div>`;

    const amountEl = document.getElementById("rps-amount");
    const queueBtn = document.getElementById("rps-queue");
    const statusEl = document.getElementById("rps-status");
    const lobbyEl = document.getElementById("rps-lobby");
    const matchEl = document.getElementById("rps-match");
    const vsEl = document.getElementById("rps-vs");
    const resultEl = document.getElementById("rps-result");
    const waitingEl = document.getElementById("rps-waiting-choice");

    socket = io("/rps", { auth: { token: Api.getToken() } });

    socket.on("queued", () => {
      inQueue = true;
      queueBtn.textContent = "Cancel";
      statusEl.innerHTML = "<span style='color:var(--accent)'>🔍 Looking for an opponent with the same bet…</span>";
    });

    socket.on("dequeued", () => {
      inQueue = false;
      queueBtn.textContent = "Find Match";
      statusEl.textContent = "Enter a bet and click Find Match.";
    });

    socket.on("match_found", ({ matchId: mid, opponent, amount }) => {
      matchId = mid;
      inMatch = true;
      inQueue = false;
      lobbyEl.style.display = "none";
      matchEl.style.display = "";
      vsEl.innerHTML = `⚔️ You vs <strong>${opponent}</strong> — ${(amount/100).toLocaleString()} 🪙 each`;
      resultEl.className = "result-banner";
      resultEl.textContent = "";
    });

    socket.on("choice_recorded", () => {
      document.querySelectorAll(".rps-choice").forEach((b) => b.disabled = true);
      waitingEl.style.display = "";
    });

    socket.on("result", ({ p1, p2, winner, prize }) => {
      const myName = state.username;
      const me = p1.username === myName ? p1 : p2;
      const opp = p1.username === myName ? p2 : p1;
      const isWinner = winner === myName;
      const isTie = !winner;

      resultEl.className = "result-banner " + (isWinner ? "win" : isTie ? "" : "loss");
      resultEl.innerHTML = `
        <div style="font-size:1.4rem">${EMOJI[me.choice]} vs ${EMOJI[opp.choice]}</div>
        <div>${isWinner ? `🏆 You win! +${(prize/100).toLocaleString()} chips` : isTie ? "🤝 Tie — refunded!" : `${winner} wins with ${EMOJI[opp.choice]}`}</div>`;

      if (isWinner || isTie) App.refreshAccount();

      // Back to lobby after 4s
      setTimeout(() => {
        matchEl.style.display = "none";
        lobbyEl.style.display = "";
        waitingEl.style.display = "none";
        document.querySelectorAll(".rps-choice").forEach((b) => b.disabled = false);
        queueBtn.textContent = "Find Match";
        inMatch = false;
        matchId = "";
      }, 4000);
    });

    socket.on("error", (msg) => UI.toast(msg, "loss"));

    queueBtn.addEventListener("click", () => {
      if (inQueue) {
        socket.emit("dequeue");
      } else if (!inMatch) {
        const amount = Math.round(Number(amountEl.value) * 100);
        if (amount < 100) return UI.toast("Min bet: 1 chip", "loss");
        socket.emit("queue", { amount });
      }
    });

    document.querySelectorAll(".rps-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!matchId) return;
        socket.emit("choose", { matchId, choice: btn.dataset.c });
      });
    });

    return () => { if (socket) socket.disconnect(); };
  }

  return { render };
})();
