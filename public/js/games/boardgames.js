/**
 * Board Games Lobby
 * Casino web app — vanilla JS + Socket.IO
 */

const BOARD_GAMES = [
  { id: "chess",      name: "Chess",      icon: "♟️",  minP: 2, maxP: 2, desc: "Classic strategy game. 2 players." },
  { id: "checkers",   name: "Checkers",   icon: "🔴",  minP: 2, maxP: 2, desc: "Diagonal captures. 2 players." },
  { id: "battleship", name: "Battleship", icon: "🚢",  minP: 2, maxP: 2, desc: "Морський бій. Sink the fleet!" },
  { id: "durak",      name: "Дурак",      icon: "🃏",  minP: 2, maxP: 6, desc: "Ukrainian card game. Last card loses." },
  { id: "wildcards",  name: "Wild Cards", icon: "🌈",  minP: 2, maxP: 4, desc: "UNO-style. Empty your hand first." },
  { id: "poker",      name: "Poker",      icon: "🎴",  minP: 2, maxP: 6, desc: "Texas Hold'em. Best hand wins." },
  { id: "bridge",     name: "Bridge",     icon: "🌉",  minP: 4, maxP: 4, desc: "Trick-taking with bidding. 4 players." },
  { id: "monopoly",   name: "Monopoly",   icon: "🏠",  minP: 2, maxP: 6, desc: "Buy properties. Last one standing wins." },
];

const GAME_RENDERERS = {
  chess:      () => typeof ChessGame      !== "undefined" ? ChessGame.renderBoard      : null,
  checkers:   () => typeof CheckersGame   !== "undefined" ? CheckersGame.renderBoard   : null,
  battleship: () => typeof BattleshipGame !== "undefined" ? BattleshipGame.renderBoard : null,
  durak:      () => typeof DurakGame      !== "undefined" ? DurakGame.renderBoard      : null,
  wildcards:  () => typeof WildCardsGame  !== "undefined" ? WildCardsGame.renderBoard  : null,
  poker:      () => typeof BoardPokerGame !== "undefined" ? BoardPokerGame.renderBoard : null,
  bridge:     () => typeof BridgeGame     !== "undefined" ? BridgeGame.renderBoard     : null,
  monopoly:   () => typeof MonopolyGame   !== "undefined" ? MonopolyGame.renderBoard   : null,
};

const BoardGamesGame = (() => {
  // ─── State ────────────────────────────────────────────────────────────────
  let socket         = null;
  let _container     = null;
  let openRooms      = [];
  let currentRoom    = null;   // room state object while in a room
  let myUserId       = null;
  let modalOpen      = false;

  // ─── Socket bootstrap ─────────────────────────────────────────────────────
  function initSocket() {
    if (socket) return;
    socket = io("/boardgames", { auth: { token: Auth.getToken() } });

    socket.on("connect_error", (err) => {
      showToast("Board games connection failed: " + err.message, "error");
    });

    socket.on("bg:me", (data) => {
      myUserId = data.userId;
    });

    socket.on("bg:rooms", (rooms) => {
      openRooms = rooms || [];
      if (!currentRoom) renderLobby();
    });

    socket.on("bg:room-update", (roomState) => {
      currentRoom = roomState;
      if (roomState.status === "playing") {
        launchGameRenderer(roomState);
      } else {
        renderWaitingRoom(roomState);
      }
    });

    socket.on("bg:game-over", (data) => {
      showGameOver(data);
    });

    socket.on("bg:error", (msg) => {
      showToast(typeof msg === "string" ? msg : (msg.message || "Board game error"), "error");
    });

    socket.on("bg:joined", (roomState) => {
      currentRoom = roomState;
      renderWaitingRoom(roomState);
    });

    socket.on("bg:chips-update", (chips) => {
      if (typeof updateBalance === "function") updateBalance(chips);
    });
  }

  // ─── Main render entry ────────────────────────────────────────────────────
  function render(container) {
    _container = container;
    injectStyles();
    initSocket();

    // Request current user identity and room list
    socket.emit("bg:get-me");
    socket.emit("bg:get-rooms");

    renderLobby();
  }

  // ─── Lobby ─────────────────────────────────────────────────────────────────
  function renderLobby() {
    if (!_container) return;
    currentRoom = null;

    _container.innerHTML = `
      <div class="bg-lobby">
        <h2 class="bg-lobby__title">🎲 Board Games</h2>

        <section class="bg-lobby__section">
          <h3 class="bg-section-heading">Choose a Game</h3>
          <div class="bg-games-grid">
            ${BOARD_GAMES.map(renderGameCard).join("")}
          </div>
        </section>

        <section class="bg-lobby__section" id="bg-rooms-section">
          <h3 class="bg-section-heading">Open Rooms</h3>
          <div id="bg-rooms-list" class="bg-rooms-list">
            ${renderRoomsList()}
          </div>
        </section>
      </div>
    `;

    // Attach create-room button listeners
    _container.querySelectorAll(".bg-create-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gameId = btn.dataset.gameId;
        openCreateRoomModal(gameId);
      });
    });
  }

  function renderGameCard(game) {
    return `
      <div class="bg-game-card">
        <div class="bg-game-card__icon">${game.icon}</div>
        <div class="bg-game-card__name">${game.name}</div>
        <div class="bg-game-card__players">${game.minP === game.maxP ? game.minP : game.minP + "–" + game.maxP} players</div>
        <div class="bg-game-card__desc">${game.desc}</div>
        <button class="bg-create-btn" data-game-id="${game.id}">Create Room</button>
      </div>
    `;
  }

  function renderRoomsList() {
    if (!openRooms.length) {
      return `<p class="bg-empty">No open rooms yet. Create one above!</p>`;
    }
    return openRooms.map(renderRoomRow).join("");
  }

  function renderRoomRow(room) {
    const meta = BOARD_GAMES.find((g) => g.id === room.gameId) || {};
    return `
      <div class="bg-room-row">
        <span class="bg-room-row__icon">${meta.icon || "🎲"}</span>
        <span class="bg-room-row__name">${meta.name || room.gameId}</span>
        <span class="bg-room-row__bet">💰 ${room.bet} chips/player</span>
        <span class="bg-room-row__count">${room.players.length}/${room.maxPlayers} players</span>
        <button class="bg-join-btn" data-room-id="${room.id}">Join</button>
      </div>
    `;
  }

  // Refresh just the rooms list section without full re-render
  function refreshRoomsList() {
    const el = _container && _container.querySelector("#bg-rooms-list");
    if (el) {
      el.innerHTML = renderRoomsList();
      el.querySelectorAll(".bg-join-btn").forEach((btn) => {
        btn.addEventListener("click", () => joinRoom(btn.dataset.roomId));
      });
    }
  }

  // Re-attach join listeners after lobby render
  function attachLobbyListeners() {
    _container.querySelectorAll(".bg-join-btn").forEach((btn) => {
      btn.addEventListener("click", () => joinRoom(btn.dataset.roomId));
    });
  }

  // ─── Create Room Modal ────────────────────────────────────────────────────
  function openCreateRoomModal(gameId) {
    if (modalOpen) return;
    modalOpen = true;

    const game = BOARD_GAMES.find((g) => g.id === gameId);
    if (!game) return;

    const overlay = document.createElement("div");
    overlay.className = "bg-modal-overlay";
    overlay.innerHTML = `
      <div class="bg-modal" role="dialog" aria-modal="true" aria-label="Create Room">
        <button class="bg-modal__close" aria-label="Close">✕</button>
        <h3 class="bg-modal__title">${game.icon} Create ${game.name} Room</h3>

        <label class="bg-modal__label">
          Bet per player (chips)
          <input class="bg-modal__input" id="bg-bet-input" type="number" min="1" value="100" step="1" />
        </label>

        ${game.minP !== game.maxP ? `
        <label class="bg-modal__label">
          Max players (${game.minP}–${game.maxP})
          <input class="bg-modal__input" id="bg-maxp-input" type="number"
            min="${game.minP}" max="${game.maxP}" value="${game.maxP}" step="1" />
        </label>` : `<input type="hidden" id="bg-maxp-input" value="${game.maxP}" />`}

        <div class="bg-modal__actions">
          <button class="bg-modal__cancel">Cancel</button>
          <button class="bg-modal__confirm">Create Room</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      modalOpen = false;
    };

    overlay.querySelector(".bg-modal__close").addEventListener("click", close);
    overlay.querySelector(".bg-modal__cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    overlay.querySelector(".bg-modal__confirm").addEventListener("click", () => {
      const bet = parseInt(overlay.querySelector("#bg-bet-input").value, 10);
      const maxPlayers = parseInt(overlay.querySelector("#bg-maxp-input").value, 10);

      if (!bet || bet < 1) {
        showToast("Bet must be at least 1 chip", "error");
        return;
      }
      if (game.minP !== game.maxP && (maxPlayers < game.minP || maxPlayers > game.maxP)) {
        showToast(`Max players must be between ${game.minP} and ${game.maxP}`, "error");
        return;
      }

      close();
      createRoom(gameId, bet, maxPlayers);
    });
  }

  // ─── Socket actions ────────────────────────────────────────────────────────
  function createRoom(gameId, bet, maxPlayers) {
    socket.emit("bg:create-room", { gameId, bet, maxPlayers });
  }

  function joinRoom(roomId) {
    socket.emit("bg:join-room", { roomId });
  }

  function setReady() {
    if (currentRoom) socket.emit("bg:ready", { roomId: currentRoom.id });
  }

  function leaveRoom() {
    if (currentRoom) {
      socket.emit("bg:leave-room", { roomId: currentRoom.id });
      currentRoom = null;
    }
    socket.emit("bg:get-rooms");
    renderLobby();
    attachLobbyListeners();
  }

  // ─── Waiting Room ──────────────────────────────────────────────────────────
  function renderWaitingRoom(roomState) {
    if (!_container) return;
    currentRoom = roomState;

    const meta = BOARD_GAMES.find((g) => g.id === roomState.gameId) || {};
    const me = roomState.players.find((p) => p.userId === myUserId);
    const iAmReady = me && me.ready;

    _container.innerHTML = `
      <div class="bg-waiting">
        <div class="bg-waiting__header">
          <button class="bg-waiting__back">← Back to Lobby</button>
          <h2 class="bg-waiting__title">${meta.icon || "🎲"} ${meta.name || roomState.gameId} — Waiting Room</h2>
          <div class="bg-waiting__meta">Bet: <strong>${roomState.bet} chips/player</strong> &nbsp;|&nbsp; Room: <code>${roomState.id}</code></div>
        </div>

        <div class="bg-waiting__players">
          ${roomState.players.map((p) => `
            <div class="bg-waiting__player ${p.ready ? "is-ready" : ""}">
              <span class="bg-waiting__player-name">${escHtml(p.username || p.userId)}</span>
              <span class="bg-waiting__player-status">${p.ready ? "✅ Ready" : "⏳ Waiting"}</span>
            </div>
          `).join("")}
          ${Array.from({ length: roomState.maxPlayers - roomState.players.length }).map(() => `
            <div class="bg-waiting__player is-empty">
              <span class="bg-waiting__player-name">Empty slot</span>
              <span class="bg-waiting__player-status">—</span>
            </div>
          `).join("")}
        </div>

        <div class="bg-waiting__actions">
          ${!iAmReady
            ? `<button class="bg-waiting__ready-btn">✅ Ready</button>`
            : `<button class="bg-waiting__ready-btn is-ready" disabled>✅ Ready!</button>`
          }
        </div>

        <p class="bg-waiting__hint">Game starts automatically when all players are ready.</p>
      </div>
    `;

    _container.querySelector(".bg-waiting__back").addEventListener("click", leaveRoom);
    const readyBtn = _container.querySelector(".bg-waiting__ready-btn");
    if (readyBtn && !iAmReady) {
      readyBtn.addEventListener("click", () => {
        readyBtn.disabled = true;
        setReady();
      });
    }
  }

  // ─── Game renderer dispatch ────────────────────────────────────────────────
  function launchGameRenderer(roomState) {
    if (!_container) return;

    const resolverFn = GAME_RENDERERS[roomState.gameId];
    const renderer = resolverFn ? resolverFn() : null;

    if (typeof renderer === "function") {
      _container.innerHTML = "";
      renderer(_container, socket, roomState, myUserId);
    } else {
      // Fallback: show a placeholder if the specific game module isn't loaded yet
      _container.innerHTML = `
        <div class="bg-placeholder">
          <div class="bg-placeholder__icon">${(BOARD_GAMES.find(g => g.id === roomState.gameId) || {}).icon || "🎲"}</div>
          <h2>Game Starting…</h2>
          <p>Loading game module for <strong>${roomState.gameId}</strong>.</p>
          <p class="bg-placeholder__hint">If this persists, please refresh the page.</p>
        </div>
      `;
    }
  }

  // ─── Game Over banner ──────────────────────────────────────────────────────
  function showGameOver(data) {
    if (!_container) return;

    const isWinner = data.winnerId === myUserId || (Array.isArray(data.winnerIds) && data.winnerIds.includes(myUserId));
    const banner = document.createElement("div");
    banner.className = "bg-gameover-overlay";
    banner.innerHTML = `
      <div class="bg-gameover ${isWinner ? "is-win" : "is-loss"}">
        <div class="bg-gameover__emoji">${isWinner ? "🏆" : "💀"}</div>
        <h2 class="bg-gameover__heading">${isWinner ? "You Win!" : "Game Over"}</h2>
        <p class="bg-gameover__sub">${escHtml(data.message || (isWinner ? "Congratulations!" : "Better luck next time!"))}</p>
        ${data.payout != null ? `<p class="bg-gameover__payout">${isWinner ? "+" : ""}${data.payout} chips</p>` : ""}
        <button class="bg-gameover__lobby-btn">Back to Lobby</button>
      </div>
    `;

    _container.appendChild(banner);
    banner.querySelector(".bg-gameover__lobby-btn").addEventListener("click", () => {
      banner.remove();
      currentRoom = null;
      socket.emit("bg:get-rooms");
      renderLobby();
      attachLobbyListeners();
    });
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("bg-styles")) return;
    const style = document.createElement("style");
    style.id = "bg-styles";
    style.textContent = `
      /* ── Lobby ─────────────────────────────────────────────── */
      .bg-lobby {
        padding: 1.5rem;
        max-width: 1100px;
        margin: 0 auto;
        color: var(--text);
      }
      .bg-lobby__title {
        font-size: 1.75rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        color: var(--gold, #f59e0b);
      }
      .bg-lobby__section {
        margin-bottom: 2.5rem;
      }
      .bg-section-heading {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: .06em;
        margin-bottom: 1rem;
      }

      /* ── Game cards grid ────────────────────────────────────── */
      .bg-games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }
      .bg-game-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .4rem;
        text-align: center;
        transition: transform .15s, box-shadow .15s;
      }
      .bg-game-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,.25);
      }
      .bg-game-card__icon {
        font-size: 2.4rem;
        line-height: 1;
      }
      .bg-game-card__name {
        font-size: 1rem;
        font-weight: 700;
      }
      .bg-game-card__players {
        font-size: .78rem;
        color: var(--text-dim);
      }
      .bg-game-card__desc {
        font-size: .8rem;
        color: var(--text-dim);
        flex: 1;
        line-height: 1.4;
      }
      .bg-create-btn {
        margin-top: .5rem;
        padding: .45rem 1rem;
        border: none;
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        font-size: .85rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity .15s;
        width: 100%;
      }
      .bg-create-btn:hover { opacity: .85; }

      /* ── Rooms list ─────────────────────────────────────────── */
      .bg-rooms-list {
        display: flex;
        flex-direction: column;
        gap: .6rem;
      }
      .bg-empty {
        color: var(--text-dim);
        font-style: italic;
      }
      .bg-room-row {
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: .75rem 1rem;
        display: flex;
        align-items: center;
        gap: .75rem;
        flex-wrap: wrap;
      }
      .bg-room-row__icon { font-size: 1.4rem; }
      .bg-room-row__name { font-weight: 600; min-width: 90px; }
      .bg-room-row__bet  { font-size: .85rem; color: var(--gold, #f59e0b); }
      .bg-room-row__count{ font-size: .85rem; color: var(--text-dim); }
      .bg-join-btn {
        margin-left: auto;
        padding: .4rem .9rem;
        border: none;
        border-radius: 8px;
        background: var(--win, #22c55e);
        color: #fff;
        font-size: .85rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity .15s;
      }
      .bg-join-btn:hover { opacity: .85; }

      /* ── Modal ──────────────────────────────────────────────── */
      .bg-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
      }
      .bg-modal {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 2rem 1.75rem;
        width: 100%;
        max-width: 380px;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .bg-modal__close {
        position: absolute;
        top: .75rem;
        right: .75rem;
        background: none;
        border: none;
        color: var(--text-dim);
        font-size: 1rem;
        cursor: pointer;
        line-height: 1;
      }
      .bg-modal__title {
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0;
      }
      .bg-modal__label {
        display: flex;
        flex-direction: column;
        gap: .35rem;
        font-size: .9rem;
        color: var(--text-dim);
      }
      .bg-modal__input {
        padding: .5rem .75rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg);
        color: var(--text);
        font-size: 1rem;
        outline: none;
        transition: border-color .15s;
      }
      .bg-modal__input:focus { border-color: var(--accent); }
      .bg-modal__actions {
        display: flex;
        gap: .75rem;
        justify-content: flex-end;
        margin-top: .25rem;
      }
      .bg-modal__cancel {
        padding: .5rem 1.1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: transparent;
        color: var(--text-dim);
        font-size: .9rem;
        cursor: pointer;
      }
      .bg-modal__cancel:hover { background: var(--bg-elev); }
      .bg-modal__confirm {
        padding: .5rem 1.25rem;
        border: none;
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        font-size: .9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity .15s;
      }
      .bg-modal__confirm:hover { opacity: .85; }

      /* ── Waiting Room ────────────────────────────────────────── */
      .bg-waiting {
        padding: 1.5rem;
        max-width: 600px;
        margin: 0 auto;
        color: var(--text);
      }
      .bg-waiting__header {
        margin-bottom: 1.5rem;
      }
      .bg-waiting__back {
        background: none;
        border: none;
        color: var(--accent);
        font-size: .9rem;
        cursor: pointer;
        padding: 0;
        margin-bottom: .75rem;
        display: inline-block;
      }
      .bg-waiting__back:hover { text-decoration: underline; }
      .bg-waiting__title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 .35rem;
      }
      .bg-waiting__meta {
        font-size: .85rem;
        color: var(--text-dim);
      }
      .bg-waiting__meta code {
        background: var(--bg-elev);
        border-radius: 4px;
        padding: .1rem .35rem;
        font-size: .8rem;
      }
      .bg-waiting__players {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        margin-bottom: 1.5rem;
      }
      .bg-waiting__player {
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: .65rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: border-color .2s;
      }
      .bg-waiting__player.is-ready {
        border-color: var(--win, #22c55e);
      }
      .bg-waiting__player.is-empty {
        opacity: .4;
      }
      .bg-waiting__player-name { font-weight: 600; }
      .bg-waiting__player-status { font-size: .85rem; color: var(--text-dim); }
      .bg-waiting__player.is-ready .bg-waiting__player-status {
        color: var(--win, #22c55e);
      }
      .bg-waiting__actions {
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
      }
      .bg-waiting__ready-btn {
        padding: .65rem 2rem;
        border: none;
        border-radius: 10px;
        background: var(--accent);
        color: #fff;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: opacity .15s, background .2s;
      }
      .bg-waiting__ready-btn:hover:not(:disabled) { opacity: .85; }
      .bg-waiting__ready-btn.is-ready {
        background: var(--win, #22c55e);
        cursor: default;
      }
      .bg-waiting__ready-btn:disabled { opacity: .7; }
      .bg-waiting__hint {
        text-align: center;
        font-size: .8rem;
        color: var(--text-dim);
      }

      /* ── Game Over Overlay ───────────────────────────────────── */
      .bg-gameover-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .bg-gameover {
        background: var(--bg-card);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 2.5rem 2rem;
        text-align: center;
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .75rem;
      }
      .bg-gameover.is-win  { border-color: var(--win, #22c55e); }
      .bg-gameover.is-loss { border-color: var(--loss, #ef4444); }
      .bg-gameover__emoji { font-size: 3.5rem; line-height: 1; }
      .bg-gameover__heading {
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0;
      }
      .bg-gameover.is-win  .bg-gameover__heading { color: var(--win,  #22c55e); }
      .bg-gameover.is-loss .bg-gameover__heading { color: var(--loss, #ef4444); }
      .bg-gameover__sub { color: var(--text-dim); margin: 0; }
      .bg-gameover__payout {
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--gold, #f59e0b);
        margin: 0;
      }
      .bg-gameover__lobby-btn {
        margin-top: .5rem;
        padding: .6rem 1.5rem;
        border: none;
        border-radius: 10px;
        background: var(--accent);
        color: #fff;
        font-size: .95rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity .15s;
      }
      .bg-gameover__lobby-btn:hover { opacity: .85; }

      /* ── Placeholder ─────────────────────────────────────────── */
      .bg-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: .75rem;
        padding: 4rem 2rem;
        text-align: center;
        color: var(--text);
      }
      .bg-placeholder__icon { font-size: 4rem; }
      .bg-placeholder__hint { color: var(--text-dim); font-size: .85rem; }

      /* ── Responsive tweaks ──────────────────────────────────── */
      @media (max-width: 520px) {
        .bg-games-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .bg-room-row {
          gap: .5rem;
        }
        .bg-join-btn {
          margin-left: 0;
          width: 100%;
        }
        .bg-waiting {
          padding: 1rem;
        }
      }
      @media (max-width: 360px) {
        .bg-games-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Utils ─────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return { render };
})();

// Make globally available
window.BoardGamesGame = BoardGamesGame;
