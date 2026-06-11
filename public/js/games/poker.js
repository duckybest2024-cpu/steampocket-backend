const PokerGame = (() => {
  const TABLES = ["table-1", "table-2", "table-3"];
  function suitColor(card) { return (card?.includes("♥") || card?.includes("♦")) ? "#ef4444" : "var(--text)"; }

  function render(container, state) {
    let socket = null;
    let currentTable = "";
    let myHand = [];
    let discardSet = new Set();
    let inHand = false;

    container.innerHTML = `
      <div class="game-panel" style="max-width:680px">
        <h2 style="margin:0 0 4px">♠️ Poker (5-Card Draw)</h2>
        <p style="margin:0 0 14px;color:var(--text-dim);font-size:0.88rem">Up to 6 players · Place buy-in to join · Click cards to discard · Best hand wins the pot.</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${TABLES.map((t) => `<button class="secondary-btn table-btn" data-table="${t}" style="flex:1">${t}</button>`).join("")}
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input id="pk-buyin" type="number" value="500" min="1" style="flex:1;max-width:160px" placeholder="Buy-in (chips)" />
          <button id="pk-join" class="primary-btn">Join Table</button>
        </div>

        <div id="pk-table-info" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:12px;font-size:0.85rem;color:var(--text-dim)">Select a table and set your buy-in to join.</div>

        <div id="pk-hand-wrap" style="display:none;margin-bottom:14px">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:6px">Your hand — click cards to discard, then click Draw:</div>
          <div id="pk-hand" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:10px"></div>
          <div style="display:flex;gap:8px">
            <button id="pk-draw" class="primary-btn" style="flex:1">Draw Cards</button>
            <button id="pk-fold" class="secondary-btn" style="flex:1">Fold</button>
          </div>
        </div>

        <div id="pk-result" class="result-banner"></div>

        <div id="pk-showdown" style="display:none;margin-top:14px">
          <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Showdown</div>
          <div id="pk-showdown-hands" style="display:flex;flex-direction:column;gap:6px"></div>
        </div>
      </div>`;

    const buyinEl = document.getElementById("pk-buyin");
    const joinBtn = document.getElementById("pk-join");
    const tableInfoEl = document.getElementById("pk-table-info");
    const handWrap = document.getElementById("pk-hand-wrap");
    const handEl = document.getElementById("pk-hand");
    const drawBtn = document.getElementById("pk-draw");
    const foldBtn = document.getElementById("pk-fold");
    const resultEl = document.getElementById("pk-result");
    const showdownEl = document.getElementById("pk-showdown");
    const showdownHandsEl = document.getElementById("pk-showdown-hands");

    document.querySelectorAll(".table-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".table-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentTable = btn.dataset.table;
      });
    });

    function renderHand(hand, discards) {
      handEl.innerHTML = (hand || []).map((card, i) => {
        const isDiscard = discards.has(i);
        return `<div data-idx="${i}" style="
          width:62px;height:90px;border-radius:10px;display:flex;align-items:center;justify-content:center;
          font-size:1.3rem;font-weight:800;cursor:pointer;user-select:none;transition:all 0.2s;
          background:${isDiscard ? "rgba(239,68,68,0.2)" : "white"};
          border:3px solid ${isDiscard ? "#ef4444" : "var(--border)"};
          color:${suitColor(card)};
          transform:${isDiscard ? "translateY(10px)" : "none"};
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);">${card}</div>`;
      }).join("");

      handEl.querySelectorAll("[data-idx]").forEach((el) => {
        el.addEventListener("click", () => {
          const idx = parseInt(el.dataset.idx, 10);
          if (discards.has(idx)) discards.delete(idx); else discards.add(idx);
          renderHand(myHand, discards);
        });
      });
    }

    socket = io("/poker", { auth: { token: Api.getToken() } });

    socket.on("table_update", ({ players, phase }) => {
      tableInfoEl.innerHTML = `<strong>${currentTable}</strong> · ${players.join(", ")} · Phase: ${phase}`;
    });

    socket.on("starting_soon", (ms) => {
      tableInfoEl.innerHTML = tableInfoEl.innerHTML + ` — hand starts in ${Math.ceil(ms/1000)}s`;
    });

    socket.on("table_phase", ({ phase, players }) => {
      if (phase === "drawing") {
        handWrap.style.display = "";
        showdownEl.style.display = "none";
        discardSet = new Set();
        inHand = true;
      }
    });

    socket.on("hand", ({ hand }) => {
      myHand = hand;
      discardSet = new Set();
      renderHand(myHand, discardSet);
    });

    socket.on("showdown", ({ hands, winners, prize }) => {
      inHand = false;
      handWrap.style.display = "none";
      showdownEl.style.display = "";
      showdownHandsEl.innerHTML = hands.map((h) => {
        const isWinner = winners.includes(h.username);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:${isWinner ? "rgba(52,211,153,0.1)" : "var(--bg-elev)"};border:1px solid ${isWinner ? "var(--win)" : "var(--border)"}">
          <strong style="width:100px;font-size:0.85rem">${h.username}${h.username === state.username ? " (you)" : ""}</strong>
          <div style="display:flex;gap:4px">${h.hand.map((c) => `<span style="color:${suitColor(c)};font-weight:700;font-size:0.9rem">${c}</span>`).join(" ")}</div>
          <span style="font-size:0.78rem;color:var(--text-dim)">${h.handName}</span>
          ${isWinner ? `<span style="color:var(--win);font-weight:700;margin-left:auto">+${(prize/100).toLocaleString()} 🪙</span>` : ""}
        </div>`;
      }).join("");

      const isWinner = winners.includes(state.username);
      resultEl.className = "result-banner " + (isWinner ? "win" : "loss");
      resultEl.textContent = isWinner ? `♠️ You win! +${(prize/100).toLocaleString()} chips` : `Winner: ${winners.join(", ")}`;
      if (isWinner) App.refreshAccount();
    });

    socket.on("error", (msg) => { UI.toast(msg, "loss"); joinBtn.disabled = false; });

    joinBtn.addEventListener("click", () => {
      if (!currentTable) return UI.toast("Select a table first", "loss");
      const buyIn = Math.round(Number(buyinEl.value) * 100);
      if (buyIn < 100) return UI.toast("Min buy-in: 1 chip", "loss");
      joinBtn.disabled = true;
      socket.emit("join_table", { tableId: currentTable, buyIn });
    });

    drawBtn.addEventListener("click", () => {
      if (!currentTable || !inHand) return;
      const indices = [...discardSet];
      socket.emit("draw_cards", { tableId: currentTable, discardIndices: indices });
      discardSet = new Set();
      drawBtn.disabled = true;
    });

    foldBtn.addEventListener("click", () => {
      if (!currentTable) return;
      socket.emit("fold", { tableId: currentTable });
      handWrap.style.display = "none";
      inHand = false;
    });

    return () => { if (socket) socket.disconnect(); };
  }

  return { render };
})();
