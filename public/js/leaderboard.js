const LeaderboardGame = (() => {
  const MEDALS = ["🥇", "🥈", "🥉"];

  const TYPES = [
    { key: "money",   label: "💰 Most Money" },
    { key: "chips",   label: "🪙 Most Chips" },
    { key: "wins",    label: "🏆 Most Wins" },
    { key: "losses",  label: "💀 Most Losses" },
    { key: "overall", label: "⭐ Best Overall" },
  ];

  const RANK_INFO = {
    bronze:   { label: "Bronze",   c: "#cd7f32", bg: "rgba(205,127,50,0.15)" },
    silver:   { label: "Silver",   c: "#c0c0c0", bg: "rgba(192,192,192,0.15)" },
    gold:     { label: "Gold",     c: "#ffd700", bg: "rgba(255,215,0,0.15)" },
    platinum: { label: "Platinum", c: "#b9f2ff", bg: "rgba(185,242,255,0.15)" },
    diamond:  { label: "Diamond",  c: "#00e5ff", bg: "rgba(0,229,255,0.15)" },
    owner:    { label: "👑 Owner", c: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  };

  function rankBadge(rank) {
    const r = RANK_INFO[rank] || RANK_INFO.bronze;
    return `<span style="padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:700;
      color:${r.c};background:${r.bg};border:1px solid ${r.c}40;white-space:nowrap;">${r.label}</span>`;
  }

  const S = {
    panel: `background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;`,
    header: `display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;`,
    title: `margin:0;font-size:1.3rem;`,
    myRankPill: `background:rgba(111,92,242,0.18);border:1px solid var(--accent);color:var(--accent-2);font-size:0.82rem;font-weight:800;padding:6px 14px;border-radius:999px;white-space:nowrap;`,
    tabs: `display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;`,
    tab: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);padding:8px 16px;border-radius:999px;cursor:pointer;font-size:0.82rem;font-weight:700;transition:all 0.15s;`,
    tabActive: `background:rgba(111,92,242,0.18);border-color:var(--accent);color:var(--text);`,
    loading: `text-align:center;padding:60px 20px;color:var(--text-dim);font-size:0.95rem;`,
    tableWrap: `overflow-x:auto;`,
    table: `width:100%;border-collapse:collapse;font-size:0.88rem;`,
    th: `text-align:left;padding:10px 14px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dim);border-bottom:1px solid var(--border);white-space:nowrap;`,
    td: `padding:11px 14px;border-bottom:1px solid var(--border);white-space:nowrap;`,
    rankCell: `font-weight:800;font-size:1rem;`,
    userCell: `font-weight:700;`,
    chipsCell: `color:var(--gold);font-weight:800;`,
    levelCell: `color:var(--accent-2);font-weight:700;`,
    betsCell: `color:var(--text-dim);`,
    winCell: `color:var(--win);font-weight:800;`,
    lossCell: `color:var(--loss);font-weight:800;`,
    rowSelf: `background:rgba(111,92,242,0.12);`,
    rowTop1: `background:rgba(251,191,36,0.07);`,
    rowTop2: `background:rgba(200,200,220,0.05);`,
    rowTop3: `background:rgba(200,140,80,0.06);`,
  };

  function rowBg(rank, isSelf) {
    if (isSelf) return S.rowSelf;
    if (rank === 1) return S.rowTop1;
    if (rank === 2) return S.rowTop2;
    if (rank === 3) return S.rowTop3;
    return "";
  }

  function posLabel(rank) {
    return rank <= 3 ? MEDALS[rank - 1] : `#${rank}`;
  }

  function buildRow(entry, type, selfUsername) {
    const isSelf = entry.username === selfUsername;
    const rs = rowBg(entry.rank, isSelf);
    const selfTag = isSelf
      ? ` <span style="font-size:0.68rem;color:var(--accent-2);font-weight:600;">(you)</span>`
      : "";
    const name = entry.displayName || entry.username;
    const badge = rankBadge(entry.userRank || "bronze");

    if (type === "wins") {
      return `<tr style="${rs}">
        <td style="${S.td}${S.rankCell}">${posLabel(entry.rank)}</td>
        <td style="${S.td}${S.userCell}">${name}${selfTag}</td>
        <td style="${S.td}">${badge}</td>
        <td style="${S.td}${S.winCell}">${(entry.wins || 0).toLocaleString()} 🏆</td>
        <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
      </tr>`;
    }
    if (type === "losses") {
      return `<tr style="${rs}">
        <td style="${S.td}${S.rankCell}">${posLabel(entry.rank)}</td>
        <td style="${S.td}${S.userCell}">${name}${selfTag}</td>
        <td style="${S.td}">${badge}</td>
        <td style="${S.td}${S.lossCell}">${(entry.losses || 0).toLocaleString()} 💀</td>
        <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
      </tr>`;
    }
    if (type === "overall") {
      return `<tr style="${rs}">
        <td style="${S.td}${S.rankCell}">${posLabel(entry.rank)}</td>
        <td style="${S.td}${S.userCell}">${name}${selfTag}</td>
        <td style="${S.td}">${badge}</td>
        <td style="${S.td}${S.chipsCell}">${Math.floor((entry.totalChips || 0) / 100).toLocaleString()} 🪙</td>
        <td style="${S.td}${S.winCell}">${(entry.wins || 0).toLocaleString()} 🏆</td>
        <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
        <td style="${S.td}" style="color:var(--accent-2);font-weight:800;">${(entry.score || 0).toLocaleString()} ⭐</td>
      </tr>`;
    }
    if (type === "money") {
      return `<tr style="${rs}">
        <td style="${S.td}${S.rankCell}">${posLabel(entry.rank)}</td>
        <td style="${S.td}${S.userCell}">${name}${selfTag}</td>
        <td style="${S.td}">${badge}</td>
        <td style="${S.td}" style="color:var(--win);font-weight:800;">$${Math.floor((entry.totalChips || 0) / 100).toLocaleString()}</td>
        <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
        <td style="${S.td}${S.betsCell}">${(entry.betCount || 0).toLocaleString()}</td>
      </tr>`;
    }
    // chips
    return `<tr style="${rs}">
      <td style="${S.td}${S.rankCell}">${posLabel(entry.rank)}</td>
      <td style="${S.td}${S.userCell}">${name}${selfTag}</td>
      <td style="${S.td}">${badge}</td>
      <td style="${S.td}${S.chipsCell}">${Math.floor((entry.balance || 0) / 100).toLocaleString()} 🪙</td>
      <td style="${S.td}${S.levelCell}">Lv ${entry.level}</td>
      <td style="${S.td}${S.betsCell}">${(entry.betCount || 0).toLocaleString()}</td>
    </tr>`;
  }

  function buildThead(type) {
    if (type === "wins") {
      return `<tr>
        <th style="${S.th}">Rank</th><th style="${S.th}">Player</th>
        <th style="${S.th}">Badge</th><th style="${S.th}">Wins</th><th style="${S.th}">Level</th>
      </tr>`;
    }
    if (type === "losses") {
      return `<tr>
        <th style="${S.th}">Rank</th><th style="${S.th}">Player</th>
        <th style="${S.th}">Badge</th><th style="${S.th}">Losses</th><th style="${S.th}">Level</th>
      </tr>`;
    }
    if (type === "overall") {
      return `<tr>
        <th style="${S.th}">Rank</th><th style="${S.th}">Player</th>
        <th style="${S.th}">Badge</th><th style="${S.th}">Chips</th>
        <th style="${S.th}">Wins</th><th style="${S.th}">Level</th><th style="${S.th}">Score ⭐</th>
      </tr>`;
    }
    if (type === "money") {
      return `<tr>
        <th style="${S.th}">Rank</th><th style="${S.th}">Player</th>
        <th style="${S.th}">Badge</th><th style="${S.th}">Total Wealth</th>
        <th style="${S.th}">Level</th><th style="${S.th}">Bets</th>
      </tr>`;
    }
    return `<tr>
      <th style="${S.th}">Rank</th><th style="${S.th}">Player</th>
      <th style="${S.th}">Badge</th>
      <th style="${S.th}">Chips (In Play)</th>
      <th style="${S.th}">Level</th><th style="${S.th}">Bets</th>
    </tr>`;
  }

  function render(container, accountState) {
    let currentType = "money";
    let busy = false;

    container.innerHTML = `
      <div class="game-panel" style="${S.panel}">
        <div style="${S.header}">
          <h2 style="${S.title}">🏆 Leaderboard</h2>
          <span id="lb-my-rank" style="${S.myRankPill};opacity:0.5">Your rank: …</span>
        </div>
        <div style="${S.tabs}" id="lb-tabs">
          ${TYPES.map(t => `
            <button class="lb-tab-btn" data-type="${t.key}"
              style="${S.tab}${t.key === currentType ? S.tabActive : ""}">${t.label}</button>
          `).join("")}
        </div>
        <div id="lb-body" style="${S.loading}">⏳ Loading…</div>
      </div>
    `;

    container.querySelectorAll(".lb-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.type === currentType || busy) return;
        currentType = btn.dataset.type;
        container.querySelectorAll(".lb-tab-btn").forEach(b =>
          b.setAttribute("style", S.tab + (b.dataset.type === currentType ? S.tabActive : ""))
        );
        load();
      });
    });

    async function load() {
      busy = true;
      const body = container.querySelector("#lb-body");
      if (body) body.innerHTML = `<div style="${S.loading}">⏳ Loading…</div>`;

      try {
        const [lbRes, meRes] = await Promise.allSettled([
          Api.get(`/leaderboard?type=${currentType}`),
          Api.get(`/leaderboard/me?type=${currentType}`),
        ]);

        const rows = lbRes.status === "fulfilled" ? (lbRes.value.leaderboard || []) : [];
        const myRank = meRes.status === "fulfilled" ? meRes.value.rank : null;

        const pill = container.querySelector("#lb-my-rank");
        if (pill) {
          pill.textContent = myRank ? `Your rank: #${myRank}` : "Your rank: —";
          pill.style.opacity = myRank ? "1" : "0.5";
        }

        if (!body) return;
        if (!rows.length) {
          body.innerHTML = `<div style="${S.loading}">No data yet — play some games!</div>`;
          return;
        }

        body.innerHTML = `
          <div style="${S.tableWrap}">
            <table style="${S.table}">
              <thead>${buildThead(currentType)}</thead>
              <tbody>${rows.map(e => buildRow(e, currentType, accountState.username)).join("")}</tbody>
            </table>
          </div>
        `;
      } catch (err) {
        if (body) body.innerHTML = `<div style="${S.loading};color:var(--loss)">${err.message}</div>`;
      } finally {
        busy = false;
      }
    }

    load();
  }

  return { render };
})();
