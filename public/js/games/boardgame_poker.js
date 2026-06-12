const BoardPokerGame = (() => {
  /* ── Card helpers ────────────────────────────────────────────── */
  const RED_SUITS  = new Set(["♥", "♦"]);

  function suitColor(suit) { return RED_SUITS.has(suit) ? "#ef4444" : "#1a1a2e"; }

  function cardHTML(card, opts = {}) {
    const { small = false, hidden = false } = opts;
    const w = small ? 36 : 56;
    const h = small ? 52 : 78;
    const fs = small ? "0.75rem" : "1.1rem";
    const rankFs = small ? "0.65rem" : "0.75rem";

    if (!card || hidden) {
      return `<div style="
        width:${w}px;height:${h}px;border-radius:7px;
        background:linear-gradient(135deg,#1e3a5f 25%,#152d48 75%);
        border:2px solid #2d4a5a;
        display:flex;align-items:center;justify-content:center;
        color:#4d7fa8;font-size:${fs};flex-shrink:0;">🂠</div>`;
    }

    const fg = suitColor(card.suit);
    return `<div style="
      width:${w}px;height:${h}px;border-radius:7px;
      background:#fff;
      border:2px solid #d1d5db;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      color:${fg};font-weight:800;flex-shrink:0;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      user-select:none;">
      <span style="font-size:${fs};line-height:1">${card.rank}</span>
      <span style="font-size:${rankFs};line-height:1">${card.suit}</span>
    </div>`;
  }

  /* ── Seat position layout (up to 6 seats around the table) ───── */
  /* Positions as [bottom%, left%] in the oval table coordinate space */
  const SEAT_POSITIONS = [
    { bottom: "4%",  left: "50%",  transform: "translateX(-50%)" },  /* 0: bottom-center (hero) */
    { bottom: "12%", left: "14%",  transform: "none" },               /* 1: bottom-left */
    { bottom: "12%", left: "72%",  transform: "none" },               /* 2: bottom-right */
    { bottom: "58%", left: "4%",   transform: "none" },               /* 3: top-left */
    { bottom: "58%", left: "76%",  transform: "none" },               /* 4: top-right */
    { bottom: "68%", left: "50%",  transform: "translateX(-50%)" },   /* 5: top-center */
  ];

  /* ── Main render ─────────────────────────────────────────────── */
  function renderBoard(container, socket, room, myUserId) {
    /* Inject styles once */
    if (!document.getElementById("bp-styles")) {
      const style = document.createElement("style");
      style.id = "bp-styles";
      style.textContent = `
        .bp-root { display:flex;flex-direction:column;height:100%;min-height:0;gap:10px;padding:10px;box-sizing:border-box; }
        .bp-table-wrap { position:relative;width:100%;padding-bottom:56%;border-radius:50% / 42%;
          background:radial-gradient(ellipse at center,#16a34a 0%,#15803d 55%,#14532d 100%);
          border:6px solid #92400e;box-shadow:inset 0 0 40px rgba(0,0,0,0.4),0 0 0 3px #b45309;
          overflow:visible;flex-shrink:0; }
        @media(max-width:600px){ .bp-table-wrap { padding-bottom:74%; } }
        .bp-table-inner { position:absolute;inset:0; }
        .bp-community { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:nowrap; }
        .bp-pot { position:absolute;top:30%;left:50%;transform:translateX(-50%);
          background:rgba(0,0,0,0.6);border:1px solid rgba(255,215,0,0.4);border-radius:20px;
          padding:4px 14px;font-size:0.82rem;font-weight:700;color:#f59e0b;white-space:nowrap; }
        .bp-phase { position:absolute;top:20%;left:50%;transform:translateX(-50%);
          font-size:0.7rem;text-transform:uppercase;letter-spacing:.1em;
          color:rgba(255,255,255,0.6);white-space:nowrap; }
        .bp-seat { position:absolute;display:flex;flex-direction:column;align-items:center;gap:3px; }
        .bp-seat-box { background:rgba(15,33,46,0.92);border:2px solid #2d4a5a;border-radius:10px;
          padding:5px 8px;text-align:center;min-width:72px;max-width:90px;font-size:0.72rem;
          backdrop-filter:blur(4px);transition:border-color 0.2s; }
        .bp-seat-box.active-seat { border-color:#00e701;box-shadow:0 0 0 2px rgba(0,231,1,0.3); }
        .bp-seat-box.folded-seat { opacity:0.45; }
        .bp-seat-box.allin-seat { border-color:#f59e0b; }
        .bp-seat-name { font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px; }
        .bp-seat-chips { color:#f59e0b;font-size:0.7rem; }
        .bp-seat-bet { color:#22c55e;font-size:0.68rem; }
        .bp-seat-badge { display:inline-block;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:10px;margin:1px; }
        .bp-dealer-btn { background:#f59e0b;color:#000; }
        .bp-sb-btn { background:#3b82f6;color:#fff; }
        .bp-bb-btn { background:#8b5cf6;color:#fff; }
        .bp-hero-cards { position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          display:flex;gap:8px;padding:6px 0; }
        .bp-actions { background:var(--bg-card);border:1px solid var(--border);border-radius:12px;
          padding:12px;display:flex;flex-direction:column;gap:10px; }
        .bp-action-row { display:flex;gap:8px;flex-wrap:wrap; }
        .bp-action-btn { flex:1;min-width:80px;padding:10px 8px;border-radius:9px;font-weight:700;
          font-size:0.85rem;border:none;cursor:pointer;transition:filter 0.15s,transform 0.1s;font-family:inherit; }
        .bp-action-btn:hover:not(:disabled) { filter:brightness(1.12);transform:translateY(-1px); }
        .bp-action-btn:disabled { opacity:0.35;cursor:not-allowed;transform:none; }
        .bp-fold-btn   { background:#ef4444;color:#fff; }
        .bp-call-btn   { background:var(--accent);color:#071c10; }
        .bp-check-btn  { background:#3b82f6;color:#fff; }
        .bp-raise-btn  { background:#f59e0b;color:#000; }
        .bp-allin-btn  { background:linear-gradient(135deg,#ef4444,#f59e0b);color:#fff; }
        .bp-raise-row  { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }
        .bp-raise-input { background:var(--bg);border:1px solid var(--border);color:var(--text);
          padding:8px 12px;border-radius:8px;font-size:0.88rem;width:110px;outline:none;font-family:inherit; }
        .bp-raise-input:focus { border-color:var(--accent); }
        .bp-raise-slider { flex:1;min-width:100px;accent-color:var(--accent); }
        .bp-info-row { display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:0.8rem; }
        .bp-info-chip { background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;
          padding:4px 10px;display:flex;gap:4px;align-items:center; }
        .bp-status-bar { background:var(--bg-elev);border-radius:8px;padding:8px 12px;
          font-size:0.8rem;color:var(--text-dim);display:flex;justify-content:space-between;align-items:center; }
        .bp-showdown { background:var(--bg-card);border:1px solid var(--border);border-radius:12px;
          padding:12px;display:flex;flex-direction:column;gap:8px; }
        .bp-showdown-row { display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;
          background:var(--bg-elev); }
        @keyframes bp-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .bp-turn-pulse { animation:bp-pulse 1.4s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    /* State */
    let state = room.state || {};
    let raiseAmount = 0;

    /* Root markup */
    container.innerHTML = `<div class="bp-root" id="bp-root">
      <div class="bp-status-bar" id="bp-status-bar">
        <span id="bp-status-text">Waiting for game…</span>
        <span id="bp-phase-badge" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)"></span>
      </div>
      <div class="bp-table-wrap" id="bp-table-wrap">
        <div class="bp-table-inner" id="bp-table-inner">
          <div class="bp-phase" id="bp-phase-label"></div>
          <div class="bp-pot" id="bp-pot">Pot: 0</div>
          <div class="bp-community" id="bp-community"></div>
          <div class="bp-hero-cards" id="bp-hero-cards"></div>
          <div id="bp-seats"></div>
        </div>
      </div>
      <div class="bp-info-row" id="bp-info-row"></div>
      <div class="bp-actions" id="bp-actions" style="display:none"></div>
      <div class="bp-showdown" id="bp-showdown" style="display:none"></div>
    </div>`;

    const statusText  = document.getElementById("bp-status-text");
    const phaseBadge  = document.getElementById("bp-phase-badge");
    const phaseLabel  = document.getElementById("bp-phase-label");
    const potEl       = document.getElementById("bp-pot");
    const communityEl = document.getElementById("bp-community");
    const heroCardsEl = document.getElementById("bp-hero-cards");
    const seatsEl     = document.getElementById("bp-seats");
    const infoRow     = document.getElementById("bp-info-row");
    const actionsEl   = document.getElementById("bp-actions");
    const showdownEl  = document.getElementById("bp-showdown");

    function chips(n) { return (n / 100).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}); }

    function isMyTurn() { return state.turn === myUserId; }

    /* ── Community cards ─────────────────────────────────────────── */
    function renderCommunity() {
      const cc = state.communityCards || [];
      /* Always render 5 slots: filled cards + face-down placeholders */
      const phase = state.phase || "preflop";
      const revealed = phase === "preflop" ? 0 : phase === "flop" ? 3 : phase === "turn" ? 4 : 5;
      communityEl.innerHTML = Array.from({length: 5}, (_, i) => {
        if (i < cc.length) return cardHTML(cc[i], {small: false});
        if (i < revealed)  return cardHTML(null, {hidden: true});
        /* Placeholder slot */
        return `<div style="width:56px;height:78px;border-radius:7px;border:2px dashed rgba(255,255,255,0.15);flex-shrink:0;"></div>`;
      }).join("");
    }

    /* ── Pot ──────────────────────────────────────────────────────── */
    function renderPot() {
      potEl.textContent = `Pot: ${chips(state.pot || 0)} 🪙`;
    }

    /* ── Phase label ─────────────────────────────────────────────── */
    function renderPhase() {
      const p = (state.phase || "").toUpperCase();
      phaseLabel.textContent = p;
      phaseBadge.textContent = p;
    }

    /* ── Hero hole cards ─────────────────────────────────────────── */
    function renderHeroCards() {
      const hand = state.myHand || [];
      heroCardsEl.innerHTML = hand.length
        ? hand.map(c => cardHTML(c)).join("")
        : [0,1].map(() => cardHTML(null, {hidden:true})).join("");
    }

    /* ── Seats around table ─────────────────────────────────────── */
    function renderSeats() {
      const players = state.players || [];
      /* Map myUserId to seat 0, rest fill 1..N in order */
      const myIdx = players.findIndex(p => p.userId === myUserId);
      const ordered = myIdx >= 0
        ? [...players.slice(myIdx), ...players.slice(0, myIdx)]
        : players;

      seatsEl.innerHTML = ordered.slice(0, 6).map((p, seatIdx) => {
        const pos = SEAT_POSITIONS[seatIdx] || SEAT_POSITIONS[0];
        const isHero = p.userId === myUserId;
        const isActive = p.userId === state.turn;
        const isFolded = p.folded;
        const isAllIn = p.allIn;

        const badges = [
          p.isDealer ? `<span class="bp-seat-badge bp-dealer-btn">D</span>` : "",
          p.isSB     ? `<span class="bp-seat-badge bp-sb-btn">SB</span>` : "",
          p.isBB     ? `<span class="bp-seat-badge bp-bb-btn">BB</span>` : "",
          isAllIn    ? `<span class="bp-seat-badge" style="background:#f59e0b;color:#000">ALL-IN</span>` : "",
          isFolded   ? `<span class="bp-seat-badge" style="background:#ef4444;color:#fff">FOLD</span>` : "",
        ].join("");

        const boxClasses = [
          "bp-seat-box",
          isActive && !isFolded ? "active-seat" : "",
          isFolded ? "folded-seat" : "",
          isAllIn ? "allin-seat" : "",
        ].filter(Boolean).join(" ");

        const turnAnim = isActive && !isFolded ? "class='bp-turn-pulse'" : "";

        return `<div class="bp-seat" style="position:absolute;bottom:${pos.bottom};left:${pos.left};transform:${pos.transform};z-index:2;">
          ${isHero ? "" /* hero cards rendered separately */ : ""}
          <div class="${boxClasses}">
            ${badges ? `<div style="margin-bottom:3px">${badges}</div>` : ""}
            <div class="bp-seat-name" ${turnAnim}>${isHero ? "You" : p.username}</div>
            <div class="bp-seat-chips">🪙 ${chips(p.chips || 0)}</div>
            ${p.bet ? `<div class="bp-seat-bet">Bet: ${chips(p.bet)}</div>` : ""}
          </div>
          ${isHero ? `<div style="display:flex;gap:4px;margin-top:4px">${(state.myHand||[]).map(c=>cardHTML(c,{small:true})).join("")}</div>` : ""}
        </div>`;
      }).join("");
    }

    /* ── Info row ────────────────────────────────────────────────── */
    function renderInfoRow() {
      const myPlayer = (state.players || []).find(p => p.userId === myUserId);
      const myChips = myPlayer ? myPlayer.chips : 0;
      const toCall = Math.max(0, (state.currentBet || 0) - (myPlayer?.bet || 0));

      infoRow.innerHTML = `
        <div class="bp-info-chip">🪙 Your Stack: <strong>${chips(myChips)}</strong></div>
        ${toCall > 0 ? `<div class="bp-info-chip" style="border-color:var(--accent);color:var(--accent)">To Call: <strong>${chips(toCall)}</strong></div>` : ""}
        ${state.currentBet ? `<div class="bp-info-chip">Current Bet: <strong>${chips(state.currentBet)}</strong></div>` : ""}
        ${state.minRaise ? `<div class="bp-info-chip">Min Raise: <strong>${chips(state.minRaise)}</strong></div>` : ""}`;
    }

    /* ── Action buttons ──────────────────────────────────────────── */
    function renderActions() {
      const myPlayer = (state.players || []).find(p => p.userId === myUserId);
      const phase = state.phase || "";
      const isActive = isMyTurn();
      const isFolded = myPlayer?.folded;
      const isAllIn  = myPlayer?.allIn;
      const myBet    = myPlayer?.bet || 0;
      const toCall   = Math.max(0, (state.currentBet || 0) - myBet);
      const canCheck  = toCall === 0;
      const minRaise  = state.minRaise || (state.currentBet || 0) * 2 || 100;
      const myChips   = myPlayer?.chips || 0;

      if (phase === "showdown" || isFolded || isAllIn || !myPlayer) {
        actionsEl.style.display = "none";
        return;
      }

      actionsEl.style.display = "";
      if (!isActive) {
        raiseAmount = minRaise;
        actionsEl.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:4px">Waiting for your turn…</div>`;
        return;
      }

      raiseAmount = Math.max(minRaise, raiseAmount);
      const maxRaise = myChips + myBet; /* can't raise more than stack */

      actionsEl.innerHTML = `
        <div class="bp-action-row">
          <button class="bp-action-btn bp-fold-btn" id="bp-fold">Fold</button>
          ${canCheck
            ? `<button class="bp-action-btn bp-check-btn" id="bp-check">Check</button>`
            : `<button class="bp-action-btn bp-call-btn" id="bp-call">Call ${chips(toCall)} 🪙</button>`
          }
          <button class="bp-action-btn bp-raise-btn" id="bp-raise">Raise</button>
          <button class="bp-action-btn bp-allin-btn" id="bp-allin">All-In</button>
        </div>
        <div class="bp-raise-row">
          <input type="range" class="bp-raise-slider" id="bp-raise-slider"
            min="${minRaise}" max="${maxRaise}" step="100" value="${raiseAmount}" />
          <input type="number" class="bp-raise-input" id="bp-raise-input"
            min="${minRaise}" max="${maxRaise}" step="100" value="${raiseAmount}" />
        </div>`;

      const foldBtn   = document.getElementById("bp-fold");
      const callBtn   = document.getElementById("bp-call");
      const checkBtn  = document.getElementById("bp-check");
      const raiseBtn  = document.getElementById("bp-raise");
      const allinBtn  = document.getElementById("bp-allin");
      const slider    = document.getElementById("bp-raise-slider");
      const input     = document.getElementById("bp-raise-input");

      /* Sync slider <-> input */
      function syncRaise(val) {
        raiseAmount = Math.max(minRaise, Math.min(maxRaise, Math.round(val / 100) * 100));
        if (slider) slider.value = raiseAmount;
        if (input)  input.value  = raiseAmount;
      }
      slider?.addEventListener("input", () => syncRaise(Number(slider.value)));
      input?.addEventListener("input", () => syncRaise(Number(input.value)));

      foldBtn?.addEventListener("click", () => {
        sendMove({ type: "fold" });
      });
      checkBtn?.addEventListener("click", () => {
        sendMove({ type: "check" });
      });
      callBtn?.addEventListener("click", () => {
        sendMove({ type: "call" });
      });
      raiseBtn?.addEventListener("click", () => {
        syncRaise(raiseAmount);
        sendMove({ type: "raise", amount: raiseAmount });
      });
      allinBtn?.addEventListener("click", () => {
        sendMove({ type: "allin" });
      });
    }

    /* ── Showdown ────────────────────────────────────────────────── */
    function renderShowdown() {
      const phase = state.phase || "";
      if (phase !== "showdown") {
        showdownEl.style.display = "none";
        return;
      }

      const players = state.players || [];
      showdownEl.style.display = "";
      showdownEl.innerHTML = `
        <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Showdown</div>
        ${players.filter(p => !p.folded).map(p => {
          const isMe = p.userId === myUserId;
          const hand = isMe ? (state.myHand || []) : (p.hand || []);
          return `<div class="bp-showdown-row">
            <div style="min-width:70px;font-weight:700;color:${isMe ? "var(--accent)" : "var(--text)"}">
              ${isMe ? "You" : p.username}
            </div>
            <div style="display:flex;gap:4px">${hand.map(c => cardHTML(c, {small:true})).join("")}</div>
            ${p.handName ? `<div style="font-size:0.78rem;color:var(--text-dim);margin-left:auto">${p.handName}</div>` : ""}
            ${p.isWinner ? `<div style="font-size:0.78rem;color:var(--win);font-weight:700;margin-left:auto">🏆 Winner</div>` : ""}
          </div>`;
        }).join("")}`;
    }

    /* ── Status bar ──────────────────────────────────────────────── */
    function renderStatusBar() {
      const players = state.players || [];
      const active = players.find(p => p.userId === state.turn);
      if (!active) {
        statusText.textContent = "Waiting…";
        return;
      }
      if (active.userId === myUserId) {
        statusText.innerHTML = `<span style="color:var(--accent);font-weight:700">Your turn!</span>`;
      } else {
        statusText.textContent = `${active.username}'s turn`;
      }
    }

    /* ── Full render ─────────────────────────────────────────────── */
    function fullRender() {
      renderPhase();
      renderPot();
      renderCommunity();
      renderHeroCards();
      renderSeats();
      renderInfoRow();
      renderActions();
      renderShowdown();
      renderStatusBar();
    }

    /* ── Send move ───────────────────────────────────────────────── */
    function sendMove(move) {
      socket.emit("bg:move", { roomId: room.id, move });
    }

    /* ── Socket events ───────────────────────────────────────────── */
    socket.on("bg:state", (newState) => {
      state = newState;
      fullRender();
    });

    socket.on("bg:update", (partial) => {
      Object.assign(state, partial);
      fullRender();
    });

    socket.on("bg:move_result", ({ success, error, state: newState }) => {
      if (!success && error) {
        showToast(error, "loss");
      }
      if (newState) {
        state = newState;
        fullRender();
      }
    });

    socket.on("bg:error", (msg) => {
      showToast(typeof msg === "string" ? msg : (msg?.message || "Move error"), "loss");
    });

    socket.on("bg:game_over", ({ winners, pot, winnerNames }) => {
      const isWinner = Array.isArray(winners)
        ? winners.includes(myUserId)
        : winners === myUserId;
      const names = winnerNames
        ? (Array.isArray(winnerNames) ? winnerNames.join(", ") : winnerNames)
        : "Someone";
      if (isWinner) {
        showToast(`You won the pot of ${chips(pot || 0)} chips!`, "win");
        if (typeof updateBalance === "function") updateBalance(pot);
      } else {
        showToast(`${names} won the pot of ${chips(pot || 0)} chips`, "info");
      }
    });

    /* Initial render */
    fullRender();

    /* No explicit cleanup needed beyond socket managed externally */
    return () => {};
  }

  return { renderBoard };
})();
