const LeaderboardGame = (() => {
  const MEDALS = ["🥇", "🥈", "🥉"];

  const S = {
    panel: `
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:var(--radius);padding:24px;
    `,
    header: `
      display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:10px;margin-bottom:22px;
    `,
    title: `margin:0;font-size:1.3rem;`,
    rankBadge: `
      background:rgba(111,92,242,0.18);border:1px solid var(--accent);
      color:var(--accent-2);font-size:0.82rem;font-weight:800;
      padding:6px 14px;border-radius:999px;white-space:nowrap;
    `,
    loading: `
      text-align:center;padding:60px 20px;color:var(--text-dim);font-size:0.95rem;
    `,
    tableWrap: `overflow-x:auto;`,
    table: `
      width:100%;border-collapse:collapse;font-size:0.88rem;
    `,
    th: `
      text-align:left;padding:10px 14px;font-size:0.7rem;text-transform:uppercase;
      letter-spacing:0.06em;color:var(--text-dim);border-bottom:1px solid var(--border);
      white-space:nowrap;
    `,
    td: `padding:11px 14px;border-bottom:1px solid var(--border);white-space:nowrap;`,
    rankCell: `font-weight:800;font-size:1rem;`,
    userCell: `font-weight:700;`,
    chipsCell: `color:var(--gold);font-weight:800;`,
    levelCell: `color:var(--accent-2);font-weight:700;`,
    betsCell: `color:var(--text-dim);`,
    rowSelf: `background:rgba(111,92,242,0.12);`,
    rowTop1: `background:rgba(251,191,36,0.07);`,
    rowTop2: `background:rgba(200,200,220,0.05);`,
    rowTop3: `background:rgba(200,140,80,0.06);`,
  };

  function rowStyle(rank, isSelf) {
    if (isSelf) return S.rowSelf;
    if (rank === 1) return S.rowTop1;
    if (rank === 2) return S.rowTop2;
    if (rank === 3) return S.rowTop3;
    return "";
  }

  function rankLabel(rank) {
    if (rank <= 3) return MEDALS[rank - 1];
    return `#${rank}`;
  }

  function renderTable(container, rows, selfUsername, myRank) {
    const rankBadgeHtml = myRank
      ? `<span style="${S.rankBadge}">Your rank: #${myRank}</span>`
      : `<span style="${S.rankBadge};opacity:0.5">Rank: —</span>`;

    container.innerHTML = `
      <div class="game-panel" style="${S.panel}">
        <div style="${S.header}">
          <h2 style="${S.title}">🏆 Leaderboard</h2>
          ${rankBadgeHtml}
        </div>
        <div style="${S.tableWrap}">
          <table style="${S.table}">
            <thead>
              <tr>
                <th style="${S.th}">Rank</th>
                <th style="${S.th}">Player</th>
                <th style="${S.th}">Chips</th>
                <th style="${S.th}">Level</th>
                <th style="${S.th}">Bets Placed</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((entry) => {
                const isSelf = entry.username === selfUsername;
                const rs = rowStyle(entry.rank, isSelf);
                const selfIndicator = isSelf
                  ? ` <span style="font-size:0.7rem;color:var(--accent-2);font-weight:600;">(you)</span>`
                  : "";
                return `
                  <tr style="${rs}">
                    <td style="${S.td}${S.rankCell}">${rankLabel(entry.rank)}</td>
                    <td style="${S.td}${S.userCell}">${entry.username}${selfIndicator}</td>
                    <td style="${S.td}${S.chipsCell}">${Math.floor(entry.totalChips / 100).toLocaleString()} 🪙</td>
                    <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
                    <td style="${S.td}${S.betsCell}">${entry.betCount.toLocaleString()}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderLoading(container) {
    container.innerHTML = `
      <div class="game-panel" style="${S.panel}">
        <div style="${S.header}">
          <h2 style="${S.title}">🏆 Leaderboard</h2>
        </div>
        <div style="${S.loading}">⏳ Loading leaderboard…</div>
      </div>
    `;
  }

  function renderError(container, msg) {
    container.innerHTML = `
      <div class="game-panel" style="${S.panel}">
        <div style="${S.header}">
          <h2 style="${S.title}">🏆 Leaderboard</h2>
        </div>
        <div style="${S.loading};color:var(--loss)">${msg}</div>
      </div>
    `;
  }

  async function render(container, accountState) {
    renderLoading(container);

    try {
      const [lbRes, meRes] = await Promise.allSettled([
        Api.get("/leaderboard"),
        Api.get("/leaderboard/me"),
      ]);

      const rows = lbRes.status === "fulfilled" ? (lbRes.value.leaderboard || []) : [];
      const myRank = meRes.status === "fulfilled" ? meRes.value.rank : null;

      if (lbRes.status === "rejected") {
        renderError(container, "Failed to load leaderboard. Please try again.");
        return;
      }

      renderTable(container, rows, accountState.username, myRank);
    } catch (err) {
      renderError(container, err.message || "Failed to load leaderboard.");
    }
  }

  return { render };
})();
