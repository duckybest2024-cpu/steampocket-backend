const WildCardsGame = (() => {
  /* ── Helpers ─────────────────────────────────────────────────── */
  const COLOR_HEX = { red: "#ef4444", green: "#22c55e", blue: "#3b82f6", yellow: "#eab308", wild: "#8b5cf6" };
  const COLOR_BG  = { red: "#fef2f2", green: "#f0fdf4", blue: "#eff6ff", yellow: "#fefce8", wild: "#faf5ff" };

  function cardLabel(card) {
    if (!card) return "?";
    if (card.type === "number")  return String(card.value);
    if (card.type === "skip")    return "⊘";
    if (card.type === "reverse") return "⇄";
    if (card.type === "draw2")   return "+2";
    if (card.type === "wild")    return "W";
    if (card.type === "wild4")   return "W+4";
    return "?";
  }

  function cardTitle(card) {
    if (!card) return "";
    const colorName = card.color !== "wild" ? card.color.charAt(0).toUpperCase() + card.color.slice(1) + " " : "";
    if (card.type === "number")  return colorName + card.value;
    if (card.type === "skip")    return colorName + "Skip";
    if (card.type === "reverse") return colorName + "Reverse";
    if (card.type === "draw2")   return colorName + "Draw 2";
    if (card.type === "wild")    return "Wild";
    if (card.type === "wild4")   return "Wild Draw 4";
    return "";
  }

  function cardHTML(card, opts = {}) {
    const { small = false, faceDown = false, clickable = false, highlight = false, dimmed = false } = opts;
    const w = small ? 38 : 62;
    const h = small ? 54 : 90;
    const fs = small ? "0.7rem" : "1.15rem";
    const borderRadius = "8px";

    if (faceDown) {
      return `<div style="
        width:${w}px;height:${h}px;border-radius:${borderRadius};
        background:linear-gradient(135deg,#1e3a5f 25%,#1a2f4e 75%);
        border:2px solid #2d4a5a;
        display:flex;align-items:center;justify-content:center;
        font-size:${fs};color:#4d7fa8;user-select:none;">
        <span style="font-size:${small ? "0.9rem" : "1.4rem"}">🂠</span>
      </div>`;
    }

    const bg = COLOR_BG[card.color] || "#fff";
    const fg = COLOR_HEX[card.color] || "#333";
    const label = cardLabel(card);
    const borderColor = highlight ? "#f59e0b" : (card.color !== "wild" ? COLOR_HEX[card.color] : "#8b5cf6");
    const borderWidth = highlight ? "3px" : "2px";
    const opacity = dimmed ? "0.45" : "1";
    const cursor = clickable ? "pointer" : "default";
    const title = cardTitle(card);

    return `<div title="${title}" style="
      width:${w}px;height:${h}px;border-radius:${borderRadius};
      background:${bg};
      border:${borderWidth} solid ${borderColor};
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-size:${fs};font-weight:800;color:${fg};
      cursor:${cursor};user-select:none;
      opacity:${opacity};
      box-shadow:${highlight ? "0 0 0 2px #f59e0b, 0 2px 8px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.2)"};
      transition:transform 0.12s,box-shadow 0.12s;
      flex-shrink:0;
      ${clickable ? "transform:translateY(0);" : ""}
    " onmouseover="${clickable ? "this.style.transform='translateY(-6px)';this.style.boxShadow='0 6px 16px rgba(0,0,0,0.4)'" : ""}"
       onmouseout="${clickable ? "this.style.transform='translateY(0)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)'" : ""}">
      <span style="line-height:1">${label}</span>
      ${card.color !== "wild" && !small ? `<span style="font-size:0.55rem;letter-spacing:0.05em;text-transform:uppercase;opacity:0.7;margin-top:2px">${card.color}</span>` : ""}
    </div>`;
  }

  /* ── Main render ─────────────────────────────────────────────── */
  function renderBoard(container, socket, room, myUserId) {
    /* Inject styles once */
    if (!document.getElementById("wildcards-styles")) {
      const style = document.createElement("style");
      style.id = "wildcards-styles";
      style.textContent = `
        .wc-root { display:flex;flex-direction:column;height:100%;min-height:0;gap:12px;padding:12px;box-sizing:border-box; }
        .wc-table { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px;position:relative; }
        .wc-players { display:flex;gap:8px;flex-wrap:wrap;justify-content:center; }
        .wc-player-slot { background:var(--bg-elev);border:2px solid var(--border);border-radius:10px;padding:8px 12px;
          text-align:center;min-width:80px;font-size:0.78rem;transition:border-color 0.2s; }
        .wc-player-slot.active-turn { border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,231,1,0.25); }
        .wc-player-slot.is-me { border-color:var(--accent-2); }
        .wc-center { display:flex;align-items:center;justify-content:center;gap:20px;padding:16px 0;flex-wrap:wrap; }
        .wc-draw-btn { background:var(--bg-elev);border:2px solid var(--border);border-radius:10px;padding:10px 18px;
          color:var(--text);font-weight:700;font-size:0.9rem;cursor:pointer;transition:border-color 0.15s,background 0.15s;
          display:flex;flex-direction:column;align-items:center;gap:4px; }
        .wc-draw-btn:hover:not(:disabled) { border-color:var(--accent);background:var(--bg-hover); }
        .wc-draw-btn:disabled { opacity:0.4;cursor:not-allowed; }
        .wc-hand { display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:10px;
          background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;min-height:110px;align-items:flex-end; }
        .wc-hand-label { font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px; }
        .wc-color-modal { position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;
          justify-content:center;z-index:9999;backdrop-filter:blur(4px); }
        .wc-color-modal-box { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;
          padding:24px;text-align:center;max-width:320px;width:90%; }
        .wc-color-choices { display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap; }
        .wc-color-btn { width:60px;height:60px;border-radius:12px;border:3px solid transparent;cursor:pointer;
          font-size:0.8rem;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);
          transition:transform 0.12s,box-shadow 0.12s; }
        .wc-color-btn:hover { transform:scale(1.1);box-shadow:0 4px 12px rgba(0,0,0,0.4); }
        .wc-turn-bar { display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;
          padding:8px 12px;background:var(--bg-elev);border-radius:8px;border:1px solid var(--border); }
        .wc-dir-indicator { font-size:1.2rem;transition:transform 0.3s; }
        @media(max-width:480px) {
          .wc-center { gap:12px;padding:10px 0; }
          .wc-hand { gap:4px;padding:8px; }
        }
      `;
      document.head.appendChild(style);
    }

    /* State */
    let state = room.state || {};
    let pendingCard = null; /* card waiting for color selection */

    /* Root markup */
    container.innerHTML = `<div class="wc-root" id="wc-root">
      <div class="wc-turn-bar" id="wc-turn-bar">
        <span id="wc-turn-text">Waiting…</span>
        <span class="wc-dir-indicator" id="wc-dir">↻</span>
      </div>
      <div class="wc-table">
        <div class="wc-players" id="wc-players"></div>
        <div class="wc-center" id="wc-center"></div>
      </div>
      <div>
        <div class="wc-hand-label">Your Hand</div>
        <div class="wc-hand" id="wc-hand"></div>
      </div>
    </div>`;

    const turnBar    = document.getElementById("wc-turn-bar");
    const turnText   = document.getElementById("wc-turn-text");
    const dirEl      = document.getElementById("wc-dir");
    const playersEl  = document.getElementById("wc-players");
    const centerEl   = document.getElementById("wc-center");
    const handEl     = document.getElementById("wc-hand");

    /* ── Render helpers ──────────────────────────────────────────── */
    function isMyTurn() { return state.turn === myUserId; }

    function renderTurnBar() {
      const players = state.players || [];
      const active = players.find(p => p.userId === state.turn);
      const name = active ? (active.userId === myUserId ? "Your turn!" : `${active.username}'s turn`) : "Waiting…";
      turnText.textContent = name;
      turnBar.style.borderColor = isMyTurn() ? "var(--accent)" : "var(--border)";
      turnText.style.color = isMyTurn() ? "var(--accent)" : "var(--text)";
      dirEl.textContent = (state.direction === -1) ? "↺" : "↻";
    }

    function renderPlayers() {
      const players = state.players || [];
      playersEl.innerHTML = players
        .filter(p => p.userId !== myUserId)
        .map(p => {
          const isActive = p.userId === state.turn;
          return `<div class="wc-player-slot ${isActive ? "active-turn" : ""}">
            <div style="font-weight:700;color:${isActive ? "var(--accent)" : "var(--text)"};margin-bottom:4px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.username}</div>
            <div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap;margin-bottom:4px">
              ${Array.from({length: Math.min(p.cardCount, 7)}, () => cardHTML({color:"wild",type:"wild"}, {small:true,faceDown:true})).join("")}
              ${p.cardCount > 7 ? `<span style="font-size:0.7rem;color:var(--text-dim);align-self:center">+${p.cardCount-7}</span>` : ""}
            </div>
            <div style="font-size:0.7rem;color:var(--text-dim)">${p.cardCount} card${p.cardCount !== 1 ? "s" : ""}</div>
          </div>`;
        }).join("") || `<div style="color:var(--text-dim);font-size:0.82rem;padding:8px">No other players yet</div>`;
    }

    function renderCenter() {
      const isActive = isMyTurn();
      const discardTop = state.discardTop;
      const currentColor = state.currentColor;
      const deckCount = state.deckCount || 0;

      /* Color indicator */
      const colorHex = COLOR_HEX[currentColor] || "#888";
      const colorBg  = COLOR_BG[currentColor]  || "#fff";

      centerEl.innerHTML = `
        <div style="text-align:center">
          <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Discard</div>
          ${discardTop ? cardHTML(discardTop, {small:false}) : `<div style="width:62px;height:90px;border-radius:8px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-dim)">?</div>`}
        </div>
        <div style="text-align:center">
          <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Color</div>
          <div style="width:44px;height:44px;border-radius:8px;background:${colorHex};border:3px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.3);margin:0 auto 4px;"></div>
          <div style="font-size:0.72rem;font-weight:600;color:${colorHex};text-transform:capitalize">${currentColor || "—"}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Draw Pile</div>
          <button class="wc-draw-btn" id="wc-draw-btn" ${!isActive ? "disabled" : ""}>
            <span style="font-size:1.8rem">🂠</span>
            <span>${deckCount} cards</span>
          </button>
        </div>`;

      document.getElementById("wc-draw-btn")?.addEventListener("click", () => {
        if (!isMyTurn()) return;
        socket.emit("bg:move", { roomId: room.id, move: { type: "draw" } });
      });
    }

    function renderHand() {
      const hand = state.hand || [];
      if (!hand.length) {
        handEl.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;padding:16px">No cards in hand</div>`;
        return;
      }

      const isActive = isMyTurn();
      const discardTop = state.discardTop;
      const currentColor = state.currentColor;

      handEl.innerHTML = hand.map((card, idx) => {
        const canPlay = isActive && isPlayable(card, discardTop, currentColor);
        return `<div data-idx="${idx}" class="wc-hand-card" style="position:relative">
          ${cardHTML(card, { clickable: canPlay, dimmed: isActive && !canPlay, highlight: canPlay })}
        </div>`;
      }).join("");

      handEl.querySelectorAll(".wc-hand-card").forEach(el => {
        const idx = parseInt(el.dataset.idx, 10);
        const card = hand[idx];
        const canPlay = isActive && isPlayable(card, discardTop, currentColor);
        if (!canPlay) return;
        el.style.cursor = "pointer";
        el.addEventListener("click", () => handlePlayCard(card));
      });
    }

    function isPlayable(card, discardTop, currentColor) {
      if (!discardTop) return true;
      if (card.type === "wild" || card.type === "wild4") return true;
      if (card.color === currentColor) return true;
      if (card.color === discardTop.color) return true;
      if (card.type === discardTop.type) return true;
      if (card.type === "number" && discardTop.type === "number" && card.value === discardTop.value) return true;
      return false;
    }

    function handlePlayCard(card) {
      if (!isMyTurn()) return;
      if (card.type === "wild" || card.type === "wild4") {
        pendingCard = card;
        showColorChooser();
      } else {
        socket.emit("bg:move", { roomId: room.id, move: { type: "play", card, chosenColor: null } });
      }
    }

    function showColorChooser() {
      const existing = document.getElementById("wc-color-modal");
      if (existing) existing.remove();

      const modal = document.createElement("div");
      modal.id = "wc-color-modal";
      modal.className = "wc-color-modal";
      modal.innerHTML = `
        <div class="wc-color-modal-box">
          <div style="font-size:1rem;font-weight:700;margin-bottom:4px">Choose a Color</div>
          <div style="font-size:0.82rem;color:var(--text-dim)">Playing: <strong>${cardTitle(pendingCard)}</strong></div>
          <div class="wc-color-choices">
            ${["red","green","blue","yellow"].map(c => `
              <button class="wc-color-btn" data-color="${c}" style="background:${COLOR_HEX[c]}" title="${c.charAt(0).toUpperCase()+c.slice(1)}">
                ${c.charAt(0).toUpperCase()+c.slice(1)}
              </button>`).join("")}
          </div>
          <button style="margin-top:16px;background:transparent;border:1px solid var(--border);color:var(--text-dim);
            padding:6px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;" id="wc-cancel-color">Cancel</button>
        </div>`;

      document.body.appendChild(modal);

      modal.querySelectorAll(".wc-color-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const chosenColor = btn.dataset.color;
          modal.remove();
          socket.emit("bg:move", { roomId: room.id, move: { type: "play", card: pendingCard, chosenColor } });
          pendingCard = null;
        });
      });

      document.getElementById("wc-cancel-color")?.addEventListener("click", () => {
        modal.remove();
        pendingCard = null;
      });
    }

    function fullRender() {
      renderTurnBar();
      renderPlayers();
      renderCenter();
      renderHand();
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

    socket.on("bg:game_over", ({ winner, winnerName }) => {
      const isWinner = winner === myUserId;
      showToast(isWinner ? `You won! UNO champion!` : `${winnerName} wins the game!`, isWinner ? "win" : "info");
    });

    /* Initial render */
    fullRender();

    /* Cleanup */
    return () => {
      const modal = document.getElementById("wc-color-modal");
      if (modal) modal.remove();
    };
  }

  return { renderBoard };
})();
