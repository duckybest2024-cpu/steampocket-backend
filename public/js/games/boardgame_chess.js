const ChessGame = (() => {
  // Unicode pieces: index 0 = empty, then by piece type
  // White: K=♔ Q=♕ R=♖ B=♗ N=♘ P=♙
  // Black: k=♚ q=♛ r=♜ b=♝ n=♞ p=♟

  const PIECES = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
    k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  };

  const INITIAL_BOARD = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
  ];

  function isWhite(piece) { return piece && piece === piece.toUpperCase(); }
  function isBlack(piece) { return piece && piece === piece.toLowerCase(); }
  function sameColor(a, b) {
    if (!a || !b) return false;
    return (isWhite(a) && isWhite(b)) || (isBlack(a) && isBlack(b));
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function getLegalMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const type = piece.toLowerCase();
    const white = isWhite(piece);

    const push = (tr, tc) => {
      if (!inBounds(tr, tc)) return false;
      const target = board[tr][tc];
      if (sameColor(piece, target)) return false;
      moves.push([tr, tc]);
      return !target; // returns true if square was empty (can continue sliding)
    };

    const slide = (dr, dc) => {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (sameColor(piece, target)) break;
        moves.push([nr, nc]);
        if (target) break; // blocked after capture
        nr += dr; nc += dc;
      }
    };

    switch (type) {
      case 'p': {
        const dir = white ? -1 : 1;
        const startRow = white ? 6 : 1;
        // Forward
        if (inBounds(r + dir, c) && !board[r + dir][c]) {
          moves.push([r + dir, c]);
          // Double push from start
          if (r === startRow && !board[r + 2 * dir][c]) {
            moves.push([r + 2 * dir, c]);
          }
        }
        // Diagonal captures
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (inBounds(tr, tc) && board[tr][tc] && !sameColor(piece, board[tr][tc])) {
            moves.push([tr, tc]);
          }
        }
        break;
      }
      case 'r':
        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) slide(dr, dc);
        break;
      case 'b':
        for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) slide(dr, dc);
        break;
      case 'q':
        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) slide(dr, dc);
        break;
      case 'n':
        for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) push(r+dr, c+dc);
        break;
      case 'k':
        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) push(r+dr, c+dc);
        break;
    }
    return moves;
  }

  function findKing(board, color) {
    const king = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c] === king) return [r, c];
    return null;
  }

  function isInCheck(board, color) {
    const kPos = findKing(board, color);
    if (!kPos) return false;
    const [kr, kc] = kPos;
    const opponent = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        if (color === 'white' && !isBlack(piece)) continue;
        if (color === 'black' && !isWhite(piece)) continue;
        const moves = getLegalMoves(board, r, c);
        if (moves.some(([mr, mc]) => mr === kr && mc === kc)) return true;
      }
    }
    return false;
  }

  function getCaptured(board) {
    const all = { white: {}, black: {} };
    const startPieces = ['r','n','b','q','p','p','p','p','p','p','p','p','r','n','b','R','N','B','Q','P','P','P','P','P','P','P','P','R','N','B'];
    // Count initial pieces
    const initial = {};
    INITIAL_BOARD.flat().filter(Boolean).forEach(p => { initial[p] = (initial[p] || 0) + 1; });
    const current = {};
    board.flat().filter(Boolean).forEach(p => { current[p] = (current[p] || 0) + 1; });
    // Captured pieces = initial count - current count
    const captured = { white: [], black: [] };
    for (const [piece, count] of Object.entries(initial)) {
      const diff = count - (current[piece] || 0);
      for (let i = 0; i < diff; i++) {
        // White pieces captured by black, black pieces captured by white
        if (isWhite(piece)) captured.black.push(piece);
        else captured.white.push(piece);
      }
    }
    return captured;
  }

  function renderBoard(container, socket, room, myUserId) {
    // Inject styles once
    const STYLE_ID = 'chess-game-styles';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .chess-wrap {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 8px;
          font-family: inherit;
          color: var(--text);
        }
        .chess-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chess-title {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .chess-turn-badge {
          font-size: 0.82rem;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 600;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          color: var(--text);
        }
        .chess-turn-badge.my-turn {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
          animation: chess-pulse 1.4s ease-in-out infinite;
        }
        @keyframes chess-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        .chess-check-alert {
          text-align: center;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--loss);
          background: rgba(239,68,68,0.1);
          border: 1px solid var(--loss);
          border-radius: 8px;
          padding: 6px 12px;
          margin-bottom: 8px;
          display: none;
        }
        .chess-check-alert.visible { display: block; }
        .chess-players {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 6px;
        }
        .chess-player-card {
          flex: 1;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .chess-player-card.active-player {
          border-color: var(--accent);
          background: rgba(99,102,241,0.08);
        }
        .chess-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 1.5px solid var(--border);
        }
        .chess-color-dot.white-dot { background: #f5f0e8; }
        .chess-color-dot.black-dot { background: #2d2926; }
        .chess-captured-bar {
          font-size: 1rem;
          min-height: 22px;
          color: var(--text-dim);
          letter-spacing: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chess-board-outer {
          position: relative;
          width: 100%;
          padding-bottom: 100%;
          margin: 0 auto 8px;
        }
        .chess-board-inner {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          border: 2px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .chess-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: filter 0.1s;
          user-select: none;
          -webkit-user-select: none;
        }
        .chess-cell:hover { filter: brightness(1.15); }
        .chess-cell.light { background: #f0d9b5; }
        .chess-cell.dark  { background: #b58863; }
        .chess-cell.selected {
          outline: 3px solid var(--accent);
          outline-offset: -3px;
          z-index: 2;
          filter: brightness(1.1);
        }
        .chess-cell.legal-move::after {
          content: '';
          position: absolute;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: rgba(0,0,0,0.22);
          pointer-events: none;
          z-index: 1;
        }
        .chess-cell.legal-capture::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 2px;
          border: 3px solid rgba(0,0,0,0.28);
          pointer-events: none;
          z-index: 1;
        }
        .chess-cell.last-from { background: rgba(205,210,75,0.5) !important; }
        .chess-cell.last-to   { background: rgba(205,210,75,0.7) !important; }
        .chess-piece {
          font-size: clamp(18px, 4vw, 38px);
          line-height: 1;
          position: relative;
          z-index: 2;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4);
          pointer-events: none;
          transition: transform 0.12s;
        }
        .chess-cell.selected .chess-piece { transform: scale(1.12); }
        .chess-coord {
          position: absolute;
          font-size: clamp(7px, 1.2vw, 11px);
          font-weight: 600;
          line-height: 1;
          opacity: 0.65;
          pointer-events: none;
          z-index: 3;
        }
        .chess-coord.rank { bottom: 2px; right: 3px; }
        .chess-coord.file { top: 2px; left: 3px; }
        .chess-cell.light .chess-coord { color: #b58863; }
        .chess-cell.dark  .chess-coord { color: #f0d9b5; }
        .chess-status {
          text-align: center;
          font-size: 0.88rem;
          color: var(--text-dim);
          padding: 6px 0 2px;
        }
        .chess-status.finished {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--gold);
          padding: 10px;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-top: 6px;
        }
      `;
      document.head.appendChild(style);
    }

    // Determine my color
    const myColor = room.players[0] && room.players[0].userId === myUserId ? 'white' : 'black';
    let state = room.state || {};
    let board = state.board ? state.board.map(r => r.slice()) : INITIAL_BOARD.map(r => r.slice());
    let turn = state.turn || 'white';
    let gameStatus = state.status || 'playing';
    let selected = null;   // [r, c]
    let legalMoves = [];
    let lastMove = null;   // { from: [r,c], to: [r,c] }

    // Build DOM
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'chess-wrap';

    wrap.innerHTML = `
      <div class="chess-header">
        <h2 class="chess-title">Chess</h2>
        <div class="chess-turn-badge" id="chess-turn-badge">Loading…</div>
      </div>
      <div class="chess-check-alert" id="chess-check-alert">♚ Check!</div>
      <div class="chess-players" id="chess-players"></div>
      <div class="chess-captured-bar" id="chess-captured-top" title="Captured pieces"></div>
      <div class="chess-board-outer">
        <div class="chess-board-inner" id="chess-board"></div>
      </div>
      <div class="chess-captured-bar" id="chess-captured-bot" title="Captured pieces"></div>
      <div class="chess-status" id="chess-status"></div>
    `;
    container.appendChild(wrap);

    const boardEl    = document.getElementById('chess-board');
    const turnBadge  = document.getElementById('chess-turn-badge');
    const checkAlert = document.getElementById('chess-check-alert');
    const playersEl  = document.getElementById('chess-players');
    const captTop    = document.getElementById('chess-captured-top');
    const captBot    = document.getElementById('chess-captured-bot');
    const statusEl   = document.getElementById('chess-status');

    const FILES = ['a','b','c','d','e','f','g','h'];
    const cells = [];

    // Build 64 cells
    for (let r = 0; r < 8; r++) {
      cells[r] = [];
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        cell.className = 'chess-cell ' + (isLight ? 'light' : 'dark');
        cell.dataset.r = r;
        cell.dataset.c = c;

        // Coordinate labels: rank on last column, file on last row
        if (c === 7) {
          const rank = document.createElement('span');
          rank.className = 'chess-coord rank';
          rank.textContent = 8 - r;
          cell.appendChild(rank);
        }
        if (r === 7) {
          const file = document.createElement('span');
          file.className = 'chess-coord file';
          file.textContent = FILES[c];
          cell.appendChild(file);
        }

        cell.addEventListener('click', () => handleCellClick(r, c));
        boardEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    function renderPieces() {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = cells[r][c];
          // Remove existing piece span
          const existing = cell.querySelector('.chess-piece');
          if (existing) existing.remove();
          const piece = board[r][c];
          if (piece) {
            const span = document.createElement('span');
            span.className = 'chess-piece';
            span.textContent = PIECES[piece] || piece;
            cell.appendChild(span);
          }
        }
      }
    }

    function renderHighlights() {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = cells[r][c];
          cell.classList.remove('selected', 'legal-move', 'legal-capture', 'last-from', 'last-to');
        }
      }
      // Last move highlight
      if (lastMove) {
        const [fr, fc] = lastMove.from;
        const [tr, tc] = lastMove.to;
        if (cells[fr] && cells[fr][fc]) cells[fr][fc].classList.add('last-from');
        if (cells[tr] && cells[tr][tc]) cells[tr][tc].classList.add('last-to');
      }
      if (selected) {
        const [sr, sc] = selected;
        if (cells[sr] && cells[sr][sc]) cells[sr][sc].classList.add('selected');
        legalMoves.forEach(([mr, mc]) => {
          if (cells[mr] && cells[mr][mc]) {
            if (board[mr][mc]) {
              cells[mr][mc].classList.add('legal-capture');
            } else {
              cells[mr][mc].classList.add('legal-move');
            }
          }
        });
      }
    }

    function renderCaptured() {
      const cap = getCaptured(board);
      // Top bar: pieces captured from opponent (shown above board)
      // If I'm white, opponent is black — top bar shows captured black pieces
      if (myColor === 'white') {
        captTop.textContent = cap.white.map(p => PIECES[p] || p).join('');
        captBot.textContent = cap.black.map(p => PIECES[p] || p).join('');
      } else {
        captTop.textContent = cap.black.map(p => PIECES[p] || p).join('');
        captBot.textContent = cap.white.map(p => PIECES[p] || p).join('');
      }
    }

    function renderTurnInfo() {
      const isMyTurn = (turn === myColor) && gameStatus === 'playing';
      turnBadge.textContent = gameStatus === 'playing'
        ? (isMyTurn ? 'Your turn' : `${turn.charAt(0).toUpperCase() + turn.slice(1)}'s turn`)
        : (gameStatus === 'checkmate' ? 'Checkmate!' : gameStatus === 'draw' ? 'Draw' : gameStatus);
      turnBadge.className = 'chess-turn-badge' + (isMyTurn ? ' my-turn' : '');

      // Check detection
      if (gameStatus === 'playing') {
        const inCheck = isInCheck(board, turn);
        checkAlert.className = 'chess-check-alert' + (inCheck ? ' visible' : '');
        checkAlert.textContent = turn === 'white' ? '♔ White is in Check!' : '♚ Black is in Check!';
      } else {
        checkAlert.className = 'chess-check-alert';
      }
    }

    function renderPlayers() {
      const white = room.players[0];
      const black = room.players[1];
      const wActive = turn === 'white' && gameStatus === 'playing';
      const bActive = turn === 'black' && gameStatus === 'playing';
      playersEl.innerHTML = `
        <div class="chess-player-card${wActive ? ' active-player' : ''}">
          <div class="chess-color-dot white-dot"></div>
          <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${white ? white.username : 'Waiting…'}</span>
          ${white && white.userId === myUserId ? '<span style="font-size:0.75rem;color:var(--text-dim)">(you)</span>' : ''}
        </div>
        <div style="align-self:center;font-size:0.85rem;color:var(--text-dim);flex-shrink:0">vs</div>
        <div class="chess-player-card${bActive ? ' active-player' : ''}">
          <div class="chess-color-dot black-dot"></div>
          <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${black ? black.username : 'Waiting…'}</span>
          ${black && black.userId === myUserId ? '<span style="font-size:0.75rem;color:var(--text-dim)">(you)</span>' : ''}
        </div>
      `;
    }

    function renderStatus() {
      if (gameStatus === 'playing') {
        statusEl.className = 'chess-status';
        statusEl.textContent = selected
          ? `Selected: ${FILES[selected[1]]}${8 - selected[0]} — click a highlighted square to move`
          : 'Click a piece to select it';
      } else if (gameStatus === 'checkmate') {
        const winner = turn === 'white' ? 'Black' : 'White';
        statusEl.className = 'chess-status finished';
        statusEl.textContent = `Checkmate! ${winner} wins!`;
      } else if (gameStatus === 'draw') {
        statusEl.className = 'chess-status finished';
        statusEl.textContent = 'Game drawn.';
      } else if (gameStatus === 'resigned') {
        statusEl.className = 'chess-status finished';
        statusEl.textContent = 'Game over (resignation).';
      } else if (gameStatus === 'waiting') {
        statusEl.className = 'chess-status';
        statusEl.textContent = 'Waiting for opponent to join…';
      }
    }

    function fullRender() {
      renderPieces();
      renderHighlights();
      renderCaptured();
      renderTurnInfo();
      renderPlayers();
      renderStatus();
    }

    function handleCellClick(r, c) {
      if (gameStatus !== 'playing') return;
      if (turn !== myColor) {
        showToast("It's not your turn", 'error');
        return;
      }

      const piece = board[r][c];

      // If something is already selected
      if (selected) {
        const [sr, sc] = selected;

        // Clicked same cell — deselect
        if (sr === r && sc === c) {
          selected = null;
          legalMoves = [];
          renderHighlights();
          renderStatus();
          return;
        }

        // Clicked a legal destination
        const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
        if (isLegal) {
          sendMove(sr, sc, r, c);
          return;
        }

        // Clicked own piece — re-select
        if (piece && ((myColor === 'white' && isWhite(piece)) || (myColor === 'black' && isBlack(piece)))) {
          selected = [r, c];
          legalMoves = getLegalMoves(board, r, c);
          renderHighlights();
          renderStatus();
          return;
        }

        // Clicked elsewhere — deselect
        selected = null;
        legalMoves = [];
        renderHighlights();
        renderStatus();
        return;
      }

      // Nothing selected — try to select
      if (!piece) return;
      if (myColor === 'white' && !isWhite(piece)) return;
      if (myColor === 'black' && !isBlack(piece)) return;

      selected = [r, c];
      legalMoves = getLegalMoves(board, r, c);
      renderHighlights();
      renderStatus();
    }

    function sendMove(fr, fc, tr, tc) {
      // Optimistic local update
      const newBoard = board.map(row => row.slice());
      newBoard[tr][tc] = newBoard[fr][fc];
      newBoard[fr][fc] = null;

      // Pawn promotion (auto-queen for simplicity)
      if (newBoard[tr][tc] === 'P' && tr === 0) newBoard[tr][tc] = 'Q';
      if (newBoard[tr][tc] === 'p' && tr === 7) newBoard[tr][tc] = 'q';

      lastMove = { from: [fr, fc], to: [tr, tc] };
      board = newBoard;
      turn = turn === 'white' ? 'black' : 'white';
      selected = null;
      legalMoves = [];

      fullRender();

      socket.emit('bg:move', {
        roomId: room.id,
        move: { from: [fr, fc], to: [tr, tc] },
      });
    }

    // Socket events
    socket.on('bg:room-update', (updatedRoom) => {
      if (updatedRoom.id !== room.id) return;
      const s = updatedRoom.state || {};
      if (s.board) board = s.board.map(r => r.slice());
      if (s.turn) turn = s.turn;
      if (s.status) gameStatus = s.status;
      if (s.lastMove) lastMove = s.lastMove;
      if (updatedRoom.players) room.players = updatedRoom.players;
      selected = null;
      legalMoves = [];
      fullRender();
    });

    socket.on('bg:error', (msg) => {
      showToast(msg || 'Move error', 'error');
      // Revert to server state if available
      selected = null;
      legalMoves = [];
      renderHighlights();
      renderStatus();
    });

    // Initial render
    fullRender();
  }

  return { renderBoard };
})();
