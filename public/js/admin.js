const AdminGame = (() => {
  const RANK_INFO = {
    bronze:   { label: "Bronze",   c: "#cd7f32" },
    silver:   { label: "Silver",   c: "#c0c0c0" },
    gold:     { label: "Gold",     c: "#ffd700" },
    platinum: { label: "Platinum", c: "#b9f2ff" },
    diamond:  { label: "Diamond",  c: "#00e5ff" },
    owner:    { label: "👑 Owner", c: "#a855f7" },
  };

  const RANK_OPTS = ["bronze","silver","gold","platinum","diamond"];

  const GAMES = ["dice","limbo","mines","plinko","crash","keno","hilo","blackjack","roulette","slots","baccarat","videopoker","wheel","coinflip"];

  const S = {
    panel: `background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;`,
    header: `display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;`,
    title: `margin:0;font-size:1.3rem;`,
    subtitle: `margin:4px 0 0;font-size:0.82rem;color:var(--loss);font-weight:600;`,
    tabs: `display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap;`,
    tab: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);padding:9px 18px;border-radius:999px;cursor:pointer;font-size:0.85rem;font-weight:700;`,
    tabActive: `background:rgba(111,92,242,0.18);border-color:var(--accent);color:var(--text);`,
    statsGrid: `display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:8px;`,
    statBox: `background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:4px;`,
    sbLabel: `font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;`,
    sbValue: `font-size:1.25rem;font-weight:900;color:var(--text);`,
    searchRow: `display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap;`,
    searchInput: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:10px;font-size:0.9rem;flex:1;min-width:180px;`,
    tableWrap: `overflow-x:auto;`,
    table: `width:100%;border-collapse:collapse;font-size:0.85rem;`,
    th: `text-align:left;padding:10px 12px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dim);border-bottom:1px solid var(--border);white-space:nowrap;`,
    td: `padding:10px 12px;border-bottom:1px solid var(--border);white-space:nowrap;`,
    banBtn: `background:transparent;border:1px solid rgba(248,113,113,0.45);color:var(--loss);border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    unbanBtn: `background:transparent;border:1px solid rgba(52,211,153,0.45);color:var(--win);border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    usernameLink: `color:var(--accent-2);cursor:pointer;font-weight:700;text-decoration:underline;text-decoration-color:rgba(34,211,238,0.35);`,
    bannedRow: `opacity:0.6;`,
    form: `display:flex;flex-direction:column;gap:14px;max-width:480px;`,
    formGroup: `display:flex;flex-direction:column;gap:6px;`,
    formLabel: `font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;`,
    formInput: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:0.95rem;`,
    formSelect: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:0.95rem;`,
    submitBtn: `background:linear-gradient(135deg,var(--accent),#8b5cf6);color:white;border:none;border-radius:10px;padding:11px 22px;font-weight:700;font-size:0.95rem;cursor:pointer;width:fit-content;`,
    dangerZone: `border:1px solid rgba(248,113,113,0.4);border-radius:12px;padding:20px;background:rgba(248,113,113,0.05);margin-top:4px;`,
    dangerTitle: `margin:0 0 14px;font-size:1rem;color:var(--loss);`,
    deleteBtn: `background:linear-gradient(135deg,var(--loss),#ef4444);color:#2c0a0a;border:none;border-radius:10px;padding:11px 22px;font-weight:700;font-size:0.95rem;cursor:pointer;margin-top:6px;`,
    resultBox: `margin-top:14px;padding:14px;border-radius:10px;font-size:0.88rem;font-weight:600;background:var(--bg-elev);border:1px solid var(--border);color:var(--text);`,
    pagination: `display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap;`,
    pageBtn: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;`,
    pageBtnActive: `border-color:var(--accent);color:var(--accent-2);background:rgba(111,92,242,0.12);`,
    bankCard: `background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;padding:18px;`,
    bankGrid: `display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:18px;`,
    incomePos: `color:var(--win);font-weight:800;`,
    incomeNeg: `color:var(--loss);font-weight:800;`,
    rankSelect: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:8px;font-size:0.8rem;cursor:pointer;`,
    sectionCard: `background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:16px;`,
    sectionTitle: `margin:0 0 14px;font-size:1rem;font-weight:800;`,
    smallBtn: `background:var(--bg-elev);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    redBtn: `background:transparent;border:1px solid rgba(248,113,113,0.45);color:var(--loss);border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    greenBtn: `background:transparent;border:1px solid rgba(52,211,153,0.45);color:var(--win);border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    toggleOn: `background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.5);color:var(--win);border-radius:7px;padding:5px 14px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    toggleOff: `background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.4);color:var(--loss);border-radius:7px;padding:5px 14px;font-weight:700;font-size:0.78rem;cursor:pointer;`,
    badge: `display:inline-block;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:700;`,
  };

  const TABS = ["stats","users","adjust","bets","players","broadcasts","promos","controls","nfts","bank","danger"];

  function money(cents) { return UI.money(cents); }
  function chips(cents) { return Math.floor(cents / 100).toLocaleString() + " 🪙"; }
  function fmtDate(d) { return new Date(d).toLocaleString(); }

  function rankBadge(rank) {
    const r = RANK_INFO[rank] || RANK_INFO.bronze;
    return `<span style="color:${r.c};font-weight:700;font-size:0.78rem;">${r.label}</span>`;
  }

  function typeBadge(type) {
    const map = { info: "#6366f1", win: "#10b981", loss: "#ef4444", warning: "#f59e0b" };
    const col = map[type] || "#6366f1";
    return `<span style="${S.badge};background:${col}22;color:${col};border:1px solid ${col}44;">${type}</span>`;
  }

  // ── User Detail Modal ───────────────────────────────────────────────────────
  function openUserDetailModal(userId) {
    const existing = document.getElementById("adm-user-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "adm-user-modal-overlay";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;`;
    overlay.innerHTML = `
      <div id="adm-user-modal" style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;width:100%;max-width:820px;padding:28px;position:relative;min-height:200px;">
        <button id="adm-modal-close" style="position:absolute;top:14px;right:14px;background:var(--bg-elev);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700;">✕ Close</button>
        <div id="adm-modal-body" style="color:var(--text-dim);padding:40px 0;text-align:center;">⏳ Loading user detail…</div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector("#adm-modal-close").addEventListener("click", () => overlay.remove());

    Api.get(`/admin/users/${userId}/detail`).then(data => {
      const { user, bets, txs, nfts } = data;
      const body = overlay.querySelector("#adm-modal-body");
      body.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div style="flex:1;min-width:180px;">
            <h2 style="margin:0 0 4px;font-size:1.2rem;">${user.username}</h2>
            <div style="color:var(--text-dim);font-size:0.82rem;margin-bottom:8px;">${user.email}</div>
            ${rankBadge(user.rank || "bronze")}
            ${user.isBanned ? ` <span style="color:var(--loss);font-weight:700;font-size:0.78rem;">🚫 Banned</span>` : ""}
          </div>
          <div style="${S.statsGrid};flex:2;min-width:260px;">
            ${[
              ["Balance", money(user.balance||0), "var(--gold)"],
              ["Bank", money(user.bank||0), "var(--accent-2)"],
              ["Level", `Lv ${user.level}`, "var(--text)"],
              ["Total Bets", (user._count?.bets||0).toLocaleString(), "var(--text)"],
              ["NFTs", (user._count?.nfts||0).toLocaleString(), "var(--text)"],
            ].map(([l,v,c]) => `
              <div style="${S.statBox}">
                <div style="${S.sbLabel}">${l}</div>
                <div style="${S.sbValue};color:${c};font-size:1rem;">${v}</div>
              </div>`).join("")}
          </div>
        </div>

        <button id="adm-modal-zero-btn" data-id="${user.id}" style="${S.redBtn};margin-bottom:18px;">
          Zero Balance
        </button>

        <h3 style="margin:0 0 10px;font-size:0.9rem;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;">Last 20 Bets</h3>
        <div style="${S.tableWrap};margin-bottom:18px;">
          <table style="${S.table}">
            <thead><tr>
              <th style="${S.th}">Game</th><th style="${S.th}">Wager</th><th style="${S.th}">Payout</th>
              <th style="${S.th}">Mult</th><th style="${S.th}">Result</th><th style="${S.th}">Time</th>
            </tr></thead>
            <tbody>
              ${bets.length ? bets.map(b => `
                <tr>
                  <td style="${S.td}">${b.game}</td>
                  <td style="${S.td};color:var(--gold);">${chips(b.amount)}</td>
                  <td style="${S.td};color:${b.payout>0?"var(--win)":"var(--loss)"};">${chips(b.payout)}</td>
                  <td style="${S.td};">${b.multiplier.toFixed(2)}x</td>
                  <td style="${S.td};color:${b.result==="win"?"var(--win)":"var(--loss)"};">${b.result}</td>
                  <td style="${S.td};color:var(--text-dim);">${fmtDate(b.createdAt)}</td>
                </tr>`).join("") : `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-dim);">No bets yet.</td></tr>`}
            </tbody>
          </table>
        </div>

        <h3 style="margin:0 0 10px;font-size:0.9rem;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;">Last 20 Transactions</h3>
        <div style="${S.tableWrap};margin-bottom:18px;">
          <table style="${S.table}">
            <thead><tr>
              <th style="${S.th}">Type</th><th style="${S.th}">Amount</th><th style="${S.th}">Balance After</th>
              <th style="${S.th}">Ref</th><th style="${S.th}">Time</th>
            </tr></thead>
            <tbody>
              ${txs.length ? txs.map(tx => `
                <tr>
                  <td style="${S.td}">${tx.type}</td>
                  <td style="${S.td};color:${tx.amount>=0?"var(--win)":"var(--loss)"};">
                    ${tx.amount>=0?"+":""}${chips(tx.amount)}
                  </td>
                  <td style="${S.td};color:var(--gold);">${chips(tx.balance)}</td>
                  <td style="${S.td};color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;">${tx.reference||"—"}</td>
                  <td style="${S.td};color:var(--text-dim);">${fmtDate(tx.createdAt)}</td>
                </tr>`).join("") : `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-dim);">No transactions.</td></tr>`}
            </tbody>
          </table>
        </div>

        ${nfts.length ? `
          <h3 style="margin:0 0 10px;font-size:0.9rem;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;">NFTs (${nfts.length})</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${nfts.map(n => `
              <div style="${S.statBox};min-width:100px;align-items:center;">
                <div style="font-size:1.5rem;">${n.emoji}</div>
                <div style="font-size:0.78rem;font-weight:700;">${n.name}</div>
                <div style="font-size:0.68rem;color:var(--text-dim);">${n.rarity}</div>
              </div>`).join("")}
          </div>
        ` : ""}
      `;

      const zeroBtn = overlay.querySelector("#adm-modal-zero-btn");
      if (zeroBtn) {
        zeroBtn.addEventListener("click", async () => {
          if (!confirm("Zero this user's balance?")) return;
          zeroBtn.disabled = true; zeroBtn.textContent = "Zeroing…";
          try {
            const r = await Api.post(`/admin/users/${userId}/zero-balance`, {});
            UI.toast(`Balance zeroed. New balance: ${money(r.balance)}`, "info");
            overlay.remove();
          } catch (err) {
            UI.toast(err.message || "Failed.", "loss");
            zeroBtn.disabled = false; zeroBtn.textContent = "Zero Balance";
          }
        });
      }
    }).catch(err => {
      const body = overlay.querySelector("#adm-modal-body");
      if (body) body.innerHTML = `<div style="color:var(--loss);">${err.message}</div>`;
    });
  }

  function render(container, accountState) {
    let activeTab = "stats";
    let cachedUsers = [];
    let usersPage = 1;
    let usersSearch = "";
    let usersTotal = 0;

    function tabStyle(key) { return key === activeTab ? S.tab + S.tabActive : S.tab; }

    function buildSkeleton() {
      container.innerHTML = `
        <div class="game-panel" style="${S.panel}">
          <div style="${S.header}">
            <div>
              <h2 style="${S.title}">🛠️ Admin Panel</h2>
              <p style="${S.subtitle}">⚠️ Restricted to authorised users only</p>
            </div>
          </div>
          <div style="${S.tabs}" id="adm-tabs">
            <button id="adm-tab-stats"      style="${tabStyle("stats")}">📊 Stats</button>
            <button id="adm-tab-users"      style="${tabStyle("users")}">👥 Users</button>
            <button id="adm-tab-adjust"     style="${tabStyle("adjust")}">💰 Adjust</button>
            <button id="adm-tab-bets"       style="${tabStyle("bets")}">🎲 Bets</button>
            <button id="adm-tab-players"    style="${tabStyle("players")}">🏆 Players</button>
            <button id="adm-tab-broadcasts" style="${tabStyle("broadcasts")}">📢 Broadcasts</button>
            <button id="adm-tab-promos"     style="${tabStyle("promos")}">🎫 Promos</button>
            <button id="adm-tab-controls"   style="${tabStyle("controls")}">🔧 Controls</button>
            <button id="adm-tab-nfts"       style="${tabStyle("nfts")}">🖼️ NFTs</button>
            <button id="adm-tab-bank"       style="${tabStyle("bank")}">🏦 Bank</button>
            <button id="adm-tab-danger"     style="${tabStyle("danger")}">⚠️ Danger</button>
          </div>
          ${TABS.map(t => `<div id="adm-pane-${t}" style="${t === "stats" ? "" : "display:none;"}"></div>`).join("")}
        </div>
      `;

      TABS.forEach(key => {
        const btn = container.querySelector(`#adm-tab-${key}`);
        if (btn) btn.addEventListener("click", () => switchTab(key));
      });

      buildAdjustPane();
      buildDangerPane();
      switchTab("stats", true);
    }

    function updateTabBar() {
      TABS.forEach(key => {
        const btn = container.querySelector(`#adm-tab-${key}`);
        if (btn) btn.setAttribute("style", tabStyle(key));
      });
    }

    function switchTab(key, initial) {
      activeTab = key;
      updateTabBar();
      TABS.forEach(t => {
        const pane = container.querySelector(`#adm-pane-${t}`);
        if (pane) pane.style.display = t === key ? "block" : "none";
      });
      if (key === "stats") loadStats();
      if (key === "users") loadUsers();
      if (key === "bets") loadBets();
      if (key === "players") loadPlayers();
      if (key === "broadcasts") loadBroadcasts();
      if (key === "promos") loadPromos();
      if (key === "controls") loadControls();
      if (key === "nfts") loadNfts();
      if (key === "bank") loadBank();
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    async function loadStats() {
      const pane = container.querySelector("#adm-pane-stats");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading stats…</div>`;
      try {
        const [s, gameStats, revenue, active] = await Promise.all([
          Api.get("/admin/stats"),
          Api.get("/admin/stats/games").catch(() => ({ games: [] })),
          Api.get("/admin/stats/revenue").catch(() => ({ days: [] })),
          Api.get("/admin/stats/active").catch(() => ({ last24h:0, last7d:0, last30d:0 })),
        ]);

        const houseEdgePct = s.totalWagered > 0
          ? (((s.totalWagered - s.totalPaidOut) / s.totalWagered) * 100).toFixed(2)
          : "0.00";

        // Revenue chart
        const days = revenue.days || [];
        const maxProfit = Math.max(1, ...days.map(d => Math.abs(d.profit)));
        const chartHtml = days.length ? `
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">📈 14-Day Revenue</h3>
            <div style="display:flex;align-items:flex-end;gap:4px;height:100px;padding:0 4px 0;overflow:hidden;">
              ${days.map(d => {
                const pct = Math.max(4, Math.round((Math.abs(d.profit) / maxProfit) * 90));
                const col = d.profit >= 0 ? "var(--win)" : "var(--loss)";
                const label = d.date.slice(5);
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;" title="${d.date}: profit=${chips(d.profit)}">
                    <div style="width:100%;height:${pct}px;background:${col};border-radius:3px 3px 0 0;min-width:8px;"></div>
                    <div style="font-size:0.55rem;color:var(--text-dim);transform:rotate(-45deg);margin-top:2px;white-space:nowrap;">${label}</div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        ` : "";

        // Per-game table
        const gamesHtml = gameStats.games && gameStats.games.length ? `
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🎮 Per-Game Stats</h3>
            <div style="${S.tableWrap}">
              <table style="${S.table}">
                <thead><tr>
                  <th style="${S.th}">Game</th>
                  <th style="${S.th}">Bets</th>
                  <th style="${S.th}">Wagered</th>
                  <th style="${S.th}">Paid Out</th>
                  <th style="${S.th}">House Edge</th>
                </tr></thead>
                <tbody>
                  ${gameStats.games.map(g => `
                    <tr>
                      <td style="${S.td};font-weight:700;">${g.game}</td>
                      <td style="${S.td};">${g.bets.toLocaleString()}</td>
                      <td style="${S.td};color:var(--gold);">${chips(g.wagered)}</td>
                      <td style="${S.td};color:var(--win);">${chips(g.paidOut)}</td>
                      <td style="${S.td};color:var(--accent-2);">${g.edge}%</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ` : "";

        pane.innerHTML = `
          <div style="${S.statsGrid}">
            ${[
              ["Total Users",   (s.totalUsers||0).toLocaleString(), "var(--text)"],
              ["Total Bets",    (s.totalBets||0).toLocaleString(),  "var(--text)"],
              ["Total Wagered", money(s.totalWagered||0),           "var(--gold)"],
              ["Total Paid Out",money(s.totalPaidOut||0),           "var(--win)"],
              ["House Edge",    `${houseEdgePct}%`,                 "var(--accent-2)"],
            ].map(([label,val,col]) => `
              <div style="${S.statBox}">
                <div style="${S.sbLabel}">${label}</div>
                <div style="${S.sbValue};color:${col}">${val}</div>
              </div>`).join("")}
          </div>

          <div style="${S.statsGrid};margin-top:12px;">
            ${[
              ["Active 24h",  (active.last24h||0).toLocaleString(), "var(--win)"],
              ["Active 7d",   (active.last7d||0).toLocaleString(),  "var(--accent-2)"],
              ["Active 30d",  (active.last30d||0).toLocaleString(), "var(--text)"],
            ].map(([label,val,col]) => `
              <div style="${S.statBox}">
                <div style="${S.sbLabel}">👤 ${label}</div>
                <div style="${S.sbValue};color:${col}">${val}</div>
              </div>`).join("")}
          </div>

          ${chartHtml}
          ${gamesHtml}
        `;
      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── Users ──────────────────────────────────────────────────────────────────
    async function loadUsers(page, search) {
      const pane = container.querySelector("#adm-pane-users");
      if (!pane) return;
      if (page !== undefined) usersPage = page;
      if (search !== undefined) usersSearch = search;

      if (!pane.querySelector("#adm-users-tbody")) {
        pane.innerHTML = buildUsersShell();
        wireUsersPane();
      }

      const tableBody = pane.querySelector("#adm-users-tbody");
      const paginationEl = pane.querySelector("#adm-users-pagination");
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="padding:30px;text-align:center;color:var(--text-dim);">⏳ Loading…</td></tr>`;

      try {
        const params = new URLSearchParams({ page: usersPage, limit: 20 });
        if (usersSearch) params.set("search", usersSearch);
        const data = await Api.get(`/admin/users?${params}`);
        const users = data.users || [];
        cachedUsers = users;
        usersTotal = data.total || users.length;
        const totalPages = Math.max(1, Math.ceil(usersTotal / 20));

        if (!tableBody) return;
        if (!users.length) {
          tableBody.innerHTML = `<tr><td colspan="9" style="padding:30px;text-align:center;color:var(--text-dim);">No users found.</td></tr>`;
        } else {
          tableBody.innerHTML = users.map((u) => {
            const isOwnerUser = (u.username || "").toLowerCase() === "ditol21";
            const rankSelectHtml = isOwnerUser
              ? `<span style="color:var(--accent-2);font-weight:700;font-size:0.8rem;">👑 Owner</span>`
              : `<select class="adm-rank-select" data-id="${u.id}" style="${S.rankSelect}">
                  ${RANK_OPTS.map(r =>
                    `<option value="${r}" ${r === (u.rank || "bronze") ? "selected" : ""}>${RANK_INFO[r].label}</option>`
                  ).join("")}
                </select>`;
            return `
              <tr style="${u.isBanned ? S.bannedRow : ""}">
                <td style="${S.td}">
                  <span class="adm-username-link" data-id="${u.id}" data-username="${u.username}" style="${S.usernameLink}">${u.username}</span>
                </td>
                <td style="${S.td};color:var(--gold);">${money(u.balance || 0)}</td>
                <td style="${S.td};color:var(--accent-2);">Lv ${u.level}</td>
                <td style="${S.td};color:var(--text-dim);">${(u.betCount || 0).toLocaleString()}</td>
                <td style="${S.td};">${rankSelectHtml}</td>
                <td style="${S.td};">
                  ${u.isBanned
                    ? `<span style="color:var(--loss);font-size:0.78rem;font-weight:700;">🚫 Banned</span>`
                    : `<span style="color:var(--win);font-size:0.78rem;font-weight:700;">✅ Active</span>`}
                </td>
                <td style="${S.td};">
                  <button class="adm-ban-btn" data-id="${u.id}" data-banned="${u.isBanned}"
                    style="${u.isBanned ? S.unbanBtn : S.banBtn}">
                    ${u.isBanned ? "Unban" : "Ban"}
                  </button>
                </td>
                <td style="${S.td};">
                  <button class="adm-zero-btn" data-id="${u.id}" style="${S.redBtn}">Zero</button>
                </td>
                <td style="${S.td};">
                  <button class="adm-detail-btn" data-id="${u.id}" style="${S.smallBtn}">Detail</button>
                </td>
              </tr>
            `;
          }).join("");
        }

        // Rank select change
        pane.querySelectorAll(".adm-rank-select").forEach(sel => {
          sel.addEventListener("change", async () => {
            const id = sel.dataset.id;
            const rank = sel.value;
            sel.disabled = true;
            try {
              await Api.patch(`/admin/users/${id}/rank`, { rank });
              UI.toast(`Rank updated to ${RANK_INFO[rank].label}.`, "win");
            } catch (err) {
              UI.toast(err.message || "Failed to update rank.", "loss");
              await loadUsers();
            } finally {
              sel.disabled = false;
            }
          });
        });

        // Username click → open detail modal
        pane.querySelectorAll(".adm-username-link").forEach(el => {
          el.addEventListener("click", () => {
            openUserDetailModal(el.dataset.id);
          });
        });

        // Detail button
        pane.querySelectorAll(".adm-detail-btn").forEach(btn => {
          btn.addEventListener("click", () => openUserDetailModal(btn.dataset.id));
        });

        // Zero balance button
        pane.querySelectorAll(".adm-zero-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (!confirm("Zero this user's balance?")) return;
            btn.disabled = true; btn.textContent = "…";
            try {
              const r = await Api.post(`/admin/users/${btn.dataset.id}/zero-balance`, {});
              UI.toast(`Balance zeroed: ${money(r.balance)}`, "info");
              await loadUsers();
            } catch (err) {
              UI.toast(err.message || "Failed.", "loss");
              btn.disabled = false; btn.textContent = "Zero";
            }
          });
        });

        // Ban/unban
        pane.querySelectorAll(".adm-ban-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const isBanned = btn.dataset.banned === "true";
            btn.disabled = true;
            try {
              await Api.post(`/admin/ban/${id}`, {});
              UI.toast(isBanned ? "User unbanned." : "User banned.", "info");
              await loadUsers();
            } catch (err) {
              UI.toast(err.message || "Action failed.", "loss");
              btn.disabled = false;
            }
          });
        });

        if (paginationEl) {
          if (totalPages <= 1) {
            paginationEl.innerHTML = "";
          } else {
            paginationEl.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
              <button class="adm-page-btn" data-page="${p}"
                style="${S.pageBtn}${p === usersPage ? S.pageBtnActive : ""}">${p}</button>
            `).join("");
            paginationEl.querySelectorAll(".adm-page-btn").forEach(btn =>
              btn.addEventListener("click", () => loadUsers(Number(btn.dataset.page)))
            );
          }
        }
      } catch (err) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="padding:24px;color:var(--loss);">${err.message}</td></tr>`;
      }
    }

    function buildUsersShell() {
      return `
        <div style="${S.searchRow}">
          <input id="adm-users-search" type="text" placeholder="Search username…"
            style="${S.searchInput}" value="${usersSearch}" autocomplete="off" />
        </div>
        <div style="${S.tableWrap}">
          <table style="${S.table}">
            <thead>
              <tr>
                <th style="${S.th}">Username</th>
                <th style="${S.th}">Balance</th>
                <th style="${S.th}">Level</th>
                <th style="${S.th}">Bets</th>
                <th style="${S.th}">Rank</th>
                <th style="${S.th}">Status</th>
                <th style="${S.th}">Ban</th>
                <th style="${S.th}">Zero</th>
                <th style="${S.th}">Detail</th>
              </tr>
            </thead>
            <tbody id="adm-users-tbody"></tbody>
          </table>
        </div>
        <div id="adm-users-pagination" style="${S.pagination}"></div>
      `;
    }

    function wireUsersPane() {
      const pane = container.querySelector("#adm-pane-users");
      if (!pane) return;
      const inp = pane.querySelector("#adm-users-search");
      if (!inp) return;
      let timer = null;
      inp.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => { usersPage = 1; loadUsers(1, inp.value.trim()); }, 350);
      });
    }

    // ── Adjust Balance ─────────────────────────────────────────────────────────
    function buildAdjustPane() {
      const pane = container.querySelector("#adm-pane-adjust");
      if (!pane) return;
      pane.innerHTML = `
        <form id="adm-adjust-form" style="${S.form}">
          <div style="${S.formGroup}">
            <label style="${S.formLabel}" for="adm-adjust-username">Username</label>
            <input id="adm-adjust-username" type="text" placeholder="Enter username…"
              style="${S.formInput}" autocomplete="off" required />
          </div>
          <div style="${S.formGroup}">
            <label style="${S.formLabel}" for="adm-adjust-amount">Amount (chips — negative to deduct)</label>
            <input id="adm-adjust-amount" type="number" placeholder="e.g. 100 or -50"
              style="${S.formInput}" step="1" required />
          </div>
          <div style="${S.formGroup}">
            <label style="${S.formLabel}" for="adm-adjust-note">Note / reason</label>
            <input id="adm-adjust-note" type="text" placeholder="e.g. compensation…"
              style="${S.formInput}" />
          </div>
          <div>
            <button type="submit" style="${S.submitBtn}" id="adm-adjust-submit">Apply Adjustment</button>
          </div>
        </form>
        <div id="adm-adjust-result" style="display:none;${S.resultBox}"></div>
      `;

      const form = pane.querySelector("#adm-adjust-form");
      const resultBox = pane.querySelector("#adm-adjust-result");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const usernameVal = pane.querySelector("#adm-adjust-username").value.trim();
        const amountChips = Number(pane.querySelector("#adm-adjust-amount").value);
        const note = pane.querySelector("#adm-adjust-note").value.trim() || "admin adjustment";
        const submitBtn = pane.querySelector("#adm-adjust-submit");

        if (!usernameVal) { UI.toast("Enter a username.", "loss"); return; }
        if (isNaN(amountChips) || amountChips === 0) { UI.toast("Enter a non-zero amount.", "loss"); return; }

        submitBtn.disabled = true; submitBtn.textContent = "Working…"; resultBox.style.display = "none";

        try {
          const lookupData = await Api.get(`/admin/users?search=${encodeURIComponent(usernameVal)}&limit=5`);
          const match = (lookupData.users || []).find(u => u.username.toLowerCase() === usernameVal.toLowerCase());
          if (!match) throw new Error(`User "${usernameVal}" not found.`);

          const data = await Api.post(`/admin/adjust-balance/${match.id}`, {
            amount: amountChips * 100,
            note,
          });
          resultBox.style.display = "block";
          resultBox.style.borderColor = "var(--win)";
          resultBox.style.color = "var(--win)";
          resultBox.innerHTML = `✅ Adjusted <strong>${usernameVal}</strong> by <strong>${amountChips > 0 ? "+" : ""}${amountChips}</strong> chips${data.balance !== undefined ? ` · New balance: ${money(data.balance)}` : ""}`;
          UI.toast(`Balance adjusted for ${usernameVal}.`, "win");
        } catch (err) {
          resultBox.style.display = "block";
          resultBox.style.borderColor = "var(--loss)";
          resultBox.style.color = "var(--loss)";
          resultBox.textContent = `❌ ${err.message}`;
          UI.toast(err.message, "loss");
        } finally {
          submitBtn.disabled = false; submitBtn.textContent = "Apply Adjustment";
        }
      });
    }

    // ── Bets ───────────────────────────────────────────────────────────────────
    async function loadBets() {
      const pane = container.querySelector("#adm-pane-bets");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading…</div>`;

      try {
        const [betsData, paymentsData] = await Promise.all([
          Api.get("/admin/bets?limit=50"),
          Api.get("/admin/payments"),
        ]);

        const bets = betsData.bets || [];
        const payments = paymentsData.items || [];

        pane.innerHTML = `
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🎲 Recent Bets (last 50)</h3>
            <div style="${S.tableWrap}">
              <table style="${S.table}">
                <thead><tr>
                  <th style="${S.th}">Username</th>
                  <th style="${S.th}">Game</th>
                  <th style="${S.th}">Wager</th>
                  <th style="${S.th}">Payout</th>
                  <th style="${S.th}">Mult</th>
                  <th style="${S.th}">Result</th>
                  <th style="${S.th}">Time</th>
                </tr></thead>
                <tbody>
                  ${bets.length ? bets.map(b => `
                    <tr>
                      <td style="${S.td};color:var(--accent-2);">${b.user?.username || "—"}</td>
                      <td style="${S.td}">${b.game}</td>
                      <td style="${S.td};color:var(--gold);">${chips(b.amount)}</td>
                      <td style="${S.td};color:${b.payout>0?"var(--win)":"var(--loss)"};">${chips(b.payout)}</td>
                      <td style="${S.td}">${b.multiplier.toFixed(2)}x</td>
                      <td style="${S.td};color:${b.result==="win"?"var(--win)":"var(--loss)"};">${b.result}</td>
                      <td style="${S.td};color:var(--text-dim);">${fmtDate(b.createdAt)}</td>
                    </tr>`).join("") : `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-dim);">No bets.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">💳 Payment History</h3>
            <div style="${S.tableWrap}">
              <table style="${S.table}">
                <thead><tr>
                  <th style="${S.th}">Username</th>
                  <th style="${S.th}">Type</th>
                  <th style="${S.th}">Amount</th>
                  <th style="${S.th}">Date</th>
                </tr></thead>
                <tbody>
                  ${payments.length ? payments.map(tx => `
                    <tr>
                      <td style="${S.td};color:var(--accent-2);">${tx.user?.username || "—"}</td>
                      <td style="${S.td}">${typeBadge(tx.type)}</td>
                      <td style="${S.td};color:${tx.amount>=0?"var(--win)":"var(--loss)"};">${chips(tx.amount)}</td>
                      <td style="${S.td};color:var(--text-dim);">${fmtDate(tx.createdAt)}</td>
                    </tr>`).join("") : `<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-dim);">No payments.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── Players ────────────────────────────────────────────────────────────────
    async function loadPlayers() {
      const pane = container.querySelector("#adm-pane-players");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading…</div>`;

      try {
        const data = await Api.get("/admin/top-players");
        const players = data.players || [];

        pane.innerHTML = `
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🏆 Top 20 Players by Wagered</h3>
            <div style="${S.tableWrap}">
              <table style="${S.table}">
                <thead><tr>
                  <th style="${S.th}">#</th>
                  <th style="${S.th}">Username</th>
                  <th style="${S.th}">Level</th>
                  <th style="${S.th}">Wagered</th>
                  <th style="${S.th}">Paid Out</th>
                  <th style="${S.th}">Profit (player)</th>
                  <th style="${S.th}">Bets</th>
                </tr></thead>
                <tbody>
                  ${players.length ? players.map((p, i) => `
                    <tr>
                      <td style="${S.td};color:var(--text-dim);">${i + 1}</td>
                      <td style="${S.td};font-weight:700;color:var(--accent-2);">${p.username}</td>
                      <td style="${S.td};">Lv ${p.level}</td>
                      <td style="${S.td};color:var(--gold);">${chips(p.wagered)}</td>
                      <td style="${S.td};color:var(--win);">${chips(p.paidOut)}</td>
                      <td style="${S.td};color:${p.profit>=0?"var(--win)":"var(--loss)"};">
                        ${p.profit>=0?"+":""}${chips(p.profit)}
                      </td>
                      <td style="${S.td};">${p.bets.toLocaleString()}</td>
                    </tr>`).join("") : `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-dim);">No data.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── Broadcasts ─────────────────────────────────────────────────────────────
    async function loadBroadcasts() {
      const pane = container.querySelector("#adm-pane-broadcasts");
      if (!pane) return;

      async function render() {
        try {
          const data = await Api.get("/admin/broadcasts");
          const broadcasts = data.broadcasts || [];

          pane.innerHTML = `
            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">📢 Send Broadcast</h3>
              <div style="${S.form}">
                <div style="${S.formGroup}">
                  <label style="${S.formLabel}">Message</label>
                  <textarea id="adm-bc-msg" rows="3" style="${S.formInput};resize:vertical;" placeholder="Enter broadcast message…"></textarea>
                </div>
                <div style="${S.formGroup}">
                  <label style="${S.formLabel}">Type</label>
                  <select id="adm-bc-type" style="${S.formSelect}">
                    <option value="info">Info</option>
                    <option value="win">Win / Jackpot</option>
                    <option value="loss">Warning</option>
                  </select>
                </div>
                <div>
                  <button id="adm-bc-send" style="${S.submitBtn}">Send Broadcast</button>
                </div>
              </div>
            </div>

            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">📋 Active Broadcasts</h3>
              ${broadcasts.length ? `
                <div style="${S.tableWrap}">
                  <table style="${S.table}">
                    <thead><tr>
                      <th style="${S.th}">Type</th>
                      <th style="${S.th}">Message</th>
                      <th style="${S.th}">Date</th>
                      <th style="${S.th}">Del</th>
                    </tr></thead>
                    <tbody>
                      ${broadcasts.map(b => `
                        <tr>
                          <td style="${S.td}">${typeBadge(b.type)}</td>
                          <td style="${S.td};max-width:300px;white-space:normal;">${b.message}</td>
                          <td style="${S.td};color:var(--text-dim);">${fmtDate(b.createdAt)}</td>
                          <td style="${S.td};">
                            <button class="adm-bc-del" data-id="${b.id}" style="${S.redBtn}">Delete</button>
                          </td>
                        </tr>`).join("")}
                    </tbody>
                  </table>
                </div>
              ` : `<p style="color:var(--text-dim);font-size:0.88rem;">No broadcasts yet.</p>`}
            </div>
          `;

          pane.querySelector("#adm-bc-send").addEventListener("click", async () => {
            const msg = pane.querySelector("#adm-bc-msg").value.trim();
            const type = pane.querySelector("#adm-bc-type").value;
            if (!msg) { UI.toast("Enter a message.", "loss"); return; }
            const btn = pane.querySelector("#adm-bc-send");
            btn.disabled = true; btn.textContent = "Sending…";
            try {
              await Api.post("/admin/broadcast", { message: msg, type });
              UI.toast("Broadcast sent!", "win");
              render();
            } catch (err) {
              UI.toast(err.message || "Failed.", "loss");
              btn.disabled = false; btn.textContent = "Send Broadcast";
            }
          });

          pane.querySelectorAll(".adm-bc-del").forEach(btn => {
            btn.addEventListener("click", async () => {
              if (!confirm("Delete this broadcast?")) return;
              btn.disabled = true;
              try {
                await fetch(`/admin/broadcasts/${btn.dataset.id}`, {
                  method: "DELETE",
                  headers: { authorization: `Bearer ${Api.getToken()}` },
                });
                UI.toast("Deleted.", "info");
                render();
              } catch (err) {
                UI.toast(err.message || "Failed.", "loss");
                btn.disabled = false;
              }
            });
          });
        } catch (err) {
          pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
        }
      }

      render();
    }

    // ── Promos ─────────────────────────────────────────────────────────────────
    async function loadPromos() {
      const pane = container.querySelector("#adm-pane-promos");
      if (!pane) return;

      async function render() {
        try {
          const data = await Api.get("/admin/promos");
          const promos = data.promos || [];

          pane.innerHTML = `
            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">🎫 Create Promo Code</h3>
              <p style="color:var(--text-dim);font-size:0.82rem;margin:0 0 14px;">Players can redeem codes in the Chip Shop.</p>
              <div style="${S.form}">
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <div style="${S.formGroup};flex:1;min-width:140px;">
                    <label style="${S.formLabel}">Code</label>
                    <input id="adm-promo-code" type="text" placeholder="EXAMPLE2024"
                      style="${S.formInput};text-transform:uppercase;" autocomplete="off" />
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:100px;">
                    <label style="${S.formLabel}">Chips</label>
                    <input id="adm-promo-chips" type="number" min="1" placeholder="100"
                      style="${S.formInput}" />
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:100px;">
                    <label style="${S.formLabel}">Max Uses</label>
                    <input id="adm-promo-maxuses" type="number" min="1" value="1"
                      style="${S.formInput}" />
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:140px;">
                    <label style="${S.formLabel}">Expires (optional)</label>
                    <input id="adm-promo-expires" type="date"
                      style="${S.formInput}" />
                  </div>
                </div>
                <div>
                  <button id="adm-promo-create" style="${S.submitBtn}">Create Code</button>
                </div>
              </div>
            </div>

            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">📋 Promo Codes</h3>
              ${promos.length ? `
                <div style="${S.tableWrap}">
                  <table style="${S.table}">
                    <thead><tr>
                      <th style="${S.th}">Code</th>
                      <th style="${S.th}">Chips</th>
                      <th style="${S.th}">Uses / Max</th>
                      <th style="${S.th}">Expires</th>
                      <th style="${S.th}">Active</th>
                      <th style="${S.th}">Del</th>
                    </tr></thead>
                    <tbody>
                      ${promos.map(p => `
                        <tr style="${!p.active ? "opacity:0.5;" : ""}">
                          <td style="${S.td};font-family:monospace;font-weight:700;">${p.code}</td>
                          <td style="${S.td};color:var(--gold);">${Math.floor(p.chips/100).toLocaleString()}</td>
                          <td style="${S.td};">${p.uses} / ${p.maxUses}</td>
                          <td style="${S.td};color:var(--text-dim);">${p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "Never"}</td>
                          <td style="${S.td};">
                            ${p.active
                              ? `<span style="color:var(--win);font-weight:700;font-size:0.78rem;">✅ Active</span>`
                              : `<span style="color:var(--loss);font-weight:700;font-size:0.78rem;">🚫 Inactive</span>`}
                          </td>
                          <td style="${S.td};">
                            <button class="adm-promo-del" data-id="${p.id}" style="${S.redBtn}">Deactivate</button>
                          </td>
                        </tr>`).join("")}
                    </tbody>
                  </table>
                </div>
              ` : `<p style="color:var(--text-dim);font-size:0.88rem;">No promo codes yet.</p>`}
            </div>
          `;

          const codeInput = pane.querySelector("#adm-promo-code");
          codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

          pane.querySelector("#adm-promo-create").addEventListener("click", async () => {
            const code = codeInput.value.trim().toUpperCase();
            const chipsVal = Number(pane.querySelector("#adm-promo-chips").value);
            const maxUses = Number(pane.querySelector("#adm-promo-maxuses").value) || 1;
            const expiresAt = pane.querySelector("#adm-promo-expires").value || undefined;

            if (!code) { UI.toast("Enter a code.", "loss"); return; }
            if (!chipsVal || chipsVal <= 0) { UI.toast("Enter a valid chips amount.", "loss"); return; }

            const btn = pane.querySelector("#adm-promo-create");
            btn.disabled = true; btn.textContent = "Creating…";
            try {
              await Api.post("/admin/promos", { code, chips: chipsVal, maxUses, expiresAt });
              UI.toast(`Promo code ${code} created!`, "win");
              render();
            } catch (err) {
              UI.toast(err.message || "Failed to create.", "loss");
              btn.disabled = false; btn.textContent = "Create Code";
            }
          });

          pane.querySelectorAll(".adm-promo-del").forEach(btn => {
            btn.addEventListener("click", async () => {
              if (!confirm("Deactivate this promo code?")) return;
              btn.disabled = true;
              try {
                await fetch(`/admin/promos/${btn.dataset.id}`, {
                  method: "DELETE",
                  headers: { authorization: `Bearer ${Api.getToken()}` },
                });
                UI.toast("Promo deactivated.", "info");
                render();
              } catch (err) {
                UI.toast(err.message || "Failed.", "loss");
                btn.disabled = false;
              }
            });
          });
        } catch (err) {
          pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
        }
      }

      render();
    }

    // ── Controls ───────────────────────────────────────────────────────────────
    async function loadControls() {
      const pane = container.querySelector("#adm-pane-controls");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading config…</div>`;

      try {
        const cfg = await Api.get("/admin/config");

        const maintenanceOn = cfg["maintenance_mode"] === "true";
        const startingBalance = cfg["starting_balance"] || "1000";

        const gamesHtml = GAMES.map(g => {
          const disabled = cfg[`game_disabled_${g}`] === "true";
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
              <span style="font-weight:600;text-transform:capitalize;">${g}</span>
              <button class="adm-game-toggle" data-game="${g}" data-disabled="${disabled}"
                style="${disabled ? S.toggleOff : S.toggleOn}">
                ${disabled ? "🚫 Disabled" : "✅ Enabled"}
              </button>
            </div>
          `;
        }).join("");

        pane.innerHTML = `
          <!-- Maintenance Mode -->
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🔧 Maintenance Mode</h3>
            <p style="color:var(--text-dim);font-size:0.85rem;margin:0 0 14px;">
              When enabled, the site shows a maintenance message to all users.
              Currently: <strong style="color:${maintenanceOn?"var(--loss)":"var(--win)"};">${maintenanceOn?"🚫 ON":"✅ OFF"}</strong>
            </p>
            <button id="adm-maintenance-toggle" style="${maintenanceOn ? S.greenBtn : S.redBtn}">
              ${maintenanceOn ? "✅ Disable Maintenance Mode" : "🔧 Enable Maintenance Mode"}
            </button>
          </div>

          <!-- Game Controls -->
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🎮 Game Controls</h3>
            <p style="color:var(--text-dim);font-size:0.82rem;margin:0 0 14px;">Toggle individual games on or off for all players.</p>
            ${gamesHtml}
          </div>

          <!-- Bulk Chip Giveaway -->
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">🎁 Bulk Chip Giveaway</h3>
            <p style="color:var(--text-dim);font-size:0.82rem;margin:0 0 14px;">Give chips to every user on the platform.</p>
            <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
              <div style="${S.formGroup};flex:1;min-width:140px;">
                <label style="${S.formLabel}">Chips per user</label>
                <input id="adm-bulk-chips" type="number" min="1" placeholder="100"
                  style="${S.formInput}" />
              </div>
              <div style="${S.formGroup};flex:2;min-width:200px;">
                <label style="${S.formLabel}">Note (optional)</label>
                <input id="adm-bulk-note" type="text" placeholder="bulk giveaway"
                  style="${S.formInput}" />
              </div>
              <button id="adm-bulk-give" style="${S.submitBtn}">Give to All Users</button>
            </div>
            <div id="adm-bulk-result" style="display:none;margin-top:10px;"></div>
          </div>

          <!-- Site Settings -->
          <div style="${S.sectionCard}">
            <h3 style="${S.sectionTitle}">⚙️ Site Settings</h3>
            <div style="${S.form};max-width:320px;">
              <div style="${S.formGroup}">
                <label style="${S.formLabel}">Starting Balance (chips for new users)</label>
                <input id="adm-starting-balance" type="number" min="0" value="${startingBalance}"
                  style="${S.formInput}" />
              </div>
              <div>
                <button id="adm-settings-save" style="${S.submitBtn}">Save Settings</button>
              </div>
            </div>
          </div>
        `;

        // Maintenance toggle
        pane.querySelector("#adm-maintenance-toggle").addEventListener("click", async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          const newVal = maintenanceOn ? "false" : "true";
          try {
            await Api.post("/admin/config", { maintenance_mode: newVal });
            UI.toast(`Maintenance mode ${newVal === "true" ? "enabled" : "disabled"}.`, "info");
            loadControls();
          } catch (err) {
            UI.toast(err.message || "Failed.", "loss");
            btn.disabled = false;
          }
        });

        // Game toggles
        pane.querySelectorAll(".adm-game-toggle").forEach(btn => {
          btn.addEventListener("click", async () => {
            const game = btn.dataset.game;
            const isDisabled = btn.dataset.disabled === "true";
            btn.disabled = true;
            try {
              await Api.post("/admin/config", { [`game_disabled_${game}`]: isDisabled ? "false" : "true" });
              UI.toast(`${game} ${isDisabled ? "enabled" : "disabled"}.`, "info");
              loadControls();
            } catch (err) {
              UI.toast(err.message || "Failed.", "loss");
              btn.disabled = false;
            }
          });
        });

        // Bulk chips
        pane.querySelector("#adm-bulk-give").addEventListener("click", async () => {
          const chipsVal = Number(pane.querySelector("#adm-bulk-chips").value);
          const note = pane.querySelector("#adm-bulk-note").value.trim() || "bulk giveaway";
          if (!chipsVal || chipsVal <= 0) { UI.toast("Enter a valid chips amount.", "loss"); return; }
          if (!confirm(`Give ${chipsVal} chips to ALL users?`)) return;
          const btn = pane.querySelector("#adm-bulk-give");
          const resultEl = pane.querySelector("#adm-bulk-result");
          btn.disabled = true; btn.textContent = "Working…";
          try {
            const r = await Api.post("/admin/bulk-chips", { chips: chipsVal, note });
            resultEl.style.display = "block";
            resultEl.innerHTML = `<span style="color:var(--win);font-weight:700;">✅ Gave ${r.chipsEach} chips to ${r.count} users!</span>`;
            UI.toast(`Bulk chips sent to ${r.count} users!`, "win");
          } catch (err) {
            resultEl.style.display = "block";
            resultEl.innerHTML = `<span style="color:var(--loss);">❌ ${err.message}</span>`;
            UI.toast(err.message || "Failed.", "loss");
          } finally {
            btn.disabled = false; btn.textContent = "Give to All Users";
          }
        });

        // Save settings
        pane.querySelector("#adm-settings-save").addEventListener("click", async () => {
          const val = pane.querySelector("#adm-starting-balance").value.trim();
          const btn = pane.querySelector("#adm-settings-save");
          btn.disabled = true; btn.textContent = "Saving…";
          try {
            await Api.post("/admin/config", { starting_balance: val });
            UI.toast("Settings saved.", "win");
          } catch (err) {
            UI.toast(err.message || "Failed.", "loss");
          } finally {
            btn.disabled = false; btn.textContent = "Save Settings";
          }
        });

      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── NFTs ───────────────────────────────────────────────────────────────────
    async function loadNfts() {
      const pane = container.querySelector("#adm-pane-nfts");
      if (!pane) return;

      async function render() {
        try {
          const data = await Api.get("/admin/nfts");
          const nfts = data.nfts || [];

          pane.innerHTML = `
            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">🖼️ Mint NFT for User</h3>
              <div style="${S.form}">
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <div style="${S.formGroup};flex:1;min-width:140px;">
                    <label style="${S.formLabel}">Username</label>
                    <input id="adm-nft-username" type="text" placeholder="Username"
                      style="${S.formInput}" autocomplete="off" />
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:140px;">
                    <label style="${S.formLabel}">Name</label>
                    <input id="adm-nft-name" type="text" placeholder="NFT Name"
                      style="${S.formInput}" />
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:180px;">
                    <label style="${S.formLabel}">Description</label>
                    <input id="adm-nft-desc" type="text" placeholder="Optional description"
                      style="${S.formInput}" />
                  </div>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <div style="${S.formGroup};flex:1;min-width:140px;">
                    <label style="${S.formLabel}">Rarity</label>
                    <select id="adm-nft-rarity" style="${S.formSelect}">
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                  <div style="${S.formGroup};flex:1;min-width:100px;">
                    <label style="${S.formLabel}">Emoji</label>
                    <input id="adm-nft-emoji" type="text" placeholder="⭐" value="⭐"
                      style="${S.formInput}" maxlength="4" />
                  </div>
                </div>
                <div>
                  <button id="adm-nft-mint" style="${S.submitBtn}">Mint NFT</button>
                </div>
              </div>
            </div>

            <div style="${S.sectionCard}">
              <h3 style="${S.sectionTitle}">🖼️ All NFTs (latest 100)</h3>
              <div style="${S.tableWrap}">
                <table style="${S.table}">
                  <thead><tr>
                    <th style="${S.th}">Owner</th>
                    <th style="${S.th}">Emoji</th>
                    <th style="${S.th}">Name</th>
                    <th style="${S.th}">Rarity</th>
                    <th style="${S.th}">Category</th>
                    <th style="${S.th}">Minted</th>
                    <th style="${S.th}">Del</th>
                  </tr></thead>
                  <tbody>
                    ${nfts.length ? nfts.map(n => `
                      <tr>
                        <td style="${S.td};color:var(--accent-2);">${n.owner?.username || "—"}</td>
                        <td style="${S.td};font-size:1.4rem;">${n.emoji}</td>
                        <td style="${S.td};font-weight:700;">${n.name}</td>
                        <td style="${S.td};color:var(--gold);text-transform:capitalize;">${n.rarity}</td>
                        <td style="${S.td};color:var(--text-dim);">${n.category}</td>
                        <td style="${S.td};color:var(--text-dim);">${fmtDate(n.mintedAt)}</td>
                        <td style="${S.td};">
                          <button class="adm-nft-del" data-id="${n.id}" style="${S.redBtn}">Delete</button>
                        </td>
                      </tr>`).join("") : `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-dim);">No NFTs.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          `;

          pane.querySelector("#adm-nft-mint").addEventListener("click", async () => {
            const username = pane.querySelector("#adm-nft-username").value.trim();
            const name = pane.querySelector("#adm-nft-name").value.trim();
            const description = pane.querySelector("#adm-nft-desc").value.trim();
            const rarity = pane.querySelector("#adm-nft-rarity").value;
            const emoji = pane.querySelector("#adm-nft-emoji").value.trim() || "⭐";

            if (!username || !name) { UI.toast("Username and name required.", "loss"); return; }

            const btn = pane.querySelector("#adm-nft-mint");
            btn.disabled = true; btn.textContent = "Minting…";
            try {
              await Api.post("/admin/nft/mint", { username, name, description, rarity, category: "special", emoji });
              UI.toast(`NFT "${name}" minted for ${username}!`, "win");
              render();
            } catch (err) {
              UI.toast(err.message || "Failed to mint.", "loss");
              btn.disabled = false; btn.textContent = "Mint NFT";
            }
          });

          pane.querySelectorAll(".adm-nft-del").forEach(btn => {
            btn.addEventListener("click", async () => {
              if (!confirm("Permanently delete this NFT?")) return;
              btn.disabled = true;
              try {
                await fetch(`/admin/nft/${btn.dataset.id}`, {
                  method: "DELETE",
                  headers: { authorization: `Bearer ${Api.getToken()}` },
                });
                UI.toast("NFT deleted.", "info");
                render();
              } catch (err) {
                UI.toast(err.message || "Failed.", "loss");
                btn.disabled = false;
              }
            });
          });

        } catch (err) {
          pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
        }
      }

      render();
    }

    // ── House Bank ─────────────────────────────────────────────────────────────
    async function loadBank() {
      const pane = container.querySelector("#adm-pane-bank");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading bank…</div>`;

      try {
        const d = await Api.get("/admin/bank");
        const netColor = d.houseIncome >= 0 ? "var(--win)" : "var(--loss)";

        pane.innerHTML = `
          <div style="${S.bankGrid}">
            ${[
              ["🪙 House Chips",  chips(d.chips || 0),         "var(--gold)"],
              ["💵 House Dollars", "$" + Math.floor((d.dollars||0)/100).toLocaleString(), "var(--win)"],
              ["📈 House Income",  money(d.houseIncome || 0),   netColor],
              ["💸 Total Wagered", money(d.totalWagered || 0),  "var(--text)"],
              ["💰 Total Paid Out",money(d.totalPaidOut || 0),  "var(--text)"],
            ].map(([label,val,col]) => `
              <div style="${S.statBox}">
                <div style="${S.sbLabel}">${label}</div>
                <div style="${S.sbValue};color:${col}">${val}</div>
              </div>`).join("")}
          </div>

          <div style="${S.bankCard};margin-bottom:18px;">
            <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:800;">Manual Adjustment</h3>
            <form id="adm-bank-form" style="display:flex;flex-direction:column;gap:12px;max-width:440px;">
              <div style="${S.formGroup}">
                <label style="${S.formLabel}">Type</label>
                <select id="adm-bank-type" style="${S.formSelect}">
                  <option value="chips">Chips</option>
                  <option value="dollars">Dollars</option>
                </select>
              </div>
              <div style="${S.formGroup}">
                <label style="${S.formLabel}">Amount (negative to remove)</label>
                <input id="adm-bank-amount" type="number" placeholder="e.g. 1000 or -500"
                  style="${S.formInput}" step="1" required />
              </div>
              <div style="${S.formGroup}">
                <label style="${S.formLabel}">Note</label>
                <input id="adm-bank-note" type="text" placeholder="Reason…"
                  style="${S.formInput}" />
              </div>
              <div>
                <button type="submit" style="${S.submitBtn}" id="adm-bank-submit">Apply</button>
              </div>
            </form>
          </div>

          ${d.transactions && d.transactions.length ? `
            <div style="${S.bankCard}">
              <h3 style="margin:0 0 14px;font-size:0.95rem;font-weight:800;">Recent Transactions</h3>
              <div style="${S.tableWrap}">
                <table style="${S.table}">
                  <thead><tr>
                    <th style="${S.th}">Type</th>
                    <th style="${S.th}">Chips Δ</th>
                    <th style="${S.th}">Dollars Δ</th>
                    <th style="${S.th}">Note</th>
                    <th style="${S.th}">Date</th>
                  </tr></thead>
                  <tbody>
                    ${d.transactions.map(tx => `
                      <tr>
                        <td style="${S.td}">${tx.type}</td>
                        <td style="${S.td};color:${tx.chipsChange >= 0 ? "var(--win)" : "var(--loss)"}">
                          ${tx.chipsChange >= 0 ? "+" : ""}${Math.floor(tx.chipsChange/100).toLocaleString()}
                        </td>
                        <td style="${S.td};color:${tx.dollarsChange >= 0 ? "var(--win)" : "var(--loss)"}">
                          ${tx.dollarsChange >= 0 ? "+" : ""}$${Math.floor(tx.dollarsChange/100).toLocaleString()}
                        </td>
                        <td style="${S.td};color:var(--text-dim);">${tx.note || "—"}</td>
                        <td style="${S.td};color:var(--text-dim);">${new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ""}
        `;

        const bankForm = pane.querySelector("#adm-bank-form");
        bankForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const type = pane.querySelector("#adm-bank-type").value;
          const amt = Number(pane.querySelector("#adm-bank-amount").value);
          const note = pane.querySelector("#adm-bank-note").value.trim() || "manual";
          const submitBtn = pane.querySelector("#adm-bank-submit");
          if (isNaN(amt) || amt === 0) { UI.toast("Enter a non-zero amount.", "loss"); return; }
          submitBtn.disabled = true; submitBtn.textContent = "Saving…";
          try {
            await Api.post("/admin/bank/adjust", { type, amount: amt * 100, note });
            UI.toast("Bank updated.", "win");
            await loadBank();
          } catch (err) {
            UI.toast(err.message || "Failed to update bank.", "loss");
            submitBtn.disabled = false; submitBtn.textContent = "Apply";
          }
        });

      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── Danger Zone ────────────────────────────────────────────────────────────
    function buildDangerPane() {
      const pane = container.querySelector("#adm-pane-danger");
      if (!pane) return;
      pane.innerHTML = `
        <div style="${S.dangerZone}">
          <h3 style="${S.dangerTitle}">⚠️ Delete Account</h3>
          <p style="color:var(--text-dim);font-size:0.85rem;margin:0 0 16px;">
            Permanently deletes a user account and all associated data. This cannot be undone.
          </p>
          <div style="${S.form}">
            <div style="${S.formGroup}">
              <label style="${S.formLabel}" for="adm-delete-username">Username to delete</label>
              <input id="adm-delete-username" type="text" placeholder="Enter exact username…"
                style="${S.formInput}" autocomplete="off" />
            </div>
            <div id="adm-delete-preview" style="display:none;padding:12px 14px;
              background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.4);
              border-radius:10px;font-size:0.88rem;margin-bottom:2px;"></div>
            <div>
              <button id="adm-delete-lookup-btn" type="button"
                style="${S.submitBtn};background:var(--bg-elev);color:var(--text);border:1px solid var(--border);">
                Look Up User
              </button>
            </div>
            <div>
              <button id="adm-delete-confirm-btn" type="button" style="${S.deleteBtn};display:none;">
                🗑️ Permanently Delete Account
              </button>
            </div>
          </div>
          <div id="adm-delete-result" style="display:none;${S.resultBox};margin-top:14px;"></div>
        </div>
      `;

      let deleteTargetId = null, deleteTargetName = null;
      const lookupBtn = pane.querySelector("#adm-delete-lookup-btn");
      const confirmBtn = pane.querySelector("#adm-delete-confirm-btn");
      const previewEl = pane.querySelector("#adm-delete-preview");
      const resultEl = pane.querySelector("#adm-delete-result");
      const usernameInput = pane.querySelector("#adm-delete-username");

      usernameInput.addEventListener("input", () => {
        deleteTargetId = null; deleteTargetName = null;
        confirmBtn.style.display = "none"; previewEl.style.display = "none"; resultEl.style.display = "none";
      });

      lookupBtn.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        if (!username) { UI.toast("Enter a username.", "loss"); return; }
        lookupBtn.disabled = true; lookupBtn.textContent = "Looking up…";
        deleteTargetId = null; deleteTargetName = null;
        confirmBtn.style.display = "none"; previewEl.style.display = "none"; resultEl.style.display = "none";
        try {
          const data = await Api.get(`/admin/users?search=${encodeURIComponent(username)}&limit=5`);
          const match = (data.users || []).find(u => u.username.toLowerCase() === username.toLowerCase());
          previewEl.style.display = "block";
          if (!match) {
            previewEl.innerHTML = `<span style="color:var(--loss);">User "${username}" not found.</span>`;
          } else {
            deleteTargetId = match.id; deleteTargetName = match.username;
            previewEl.innerHTML = `Found: <strong>${match.username}</strong> — Balance ${money(match.balance||0)} · Level ${match.level} · ${(match.betCount||0).toLocaleString()} bets${match.isBanned ? " · <span style='color:var(--loss);'>Banned</span>" : ""}`;
            confirmBtn.style.display = "inline-block";
          }
        } catch (err) {
          previewEl.style.display = "block";
          previewEl.innerHTML = `<span style="color:var(--loss);">${err.message}</span>`;
        } finally {
          lookupBtn.disabled = false; lookupBtn.textContent = "Look Up User";
        }
      });

      confirmBtn.addEventListener("click", async () => {
        if (!deleteTargetId || !deleteTargetName) return;
        if (!confirm(`Permanently delete "${deleteTargetName}"? This cannot be undone.`)) return;
        confirmBtn.disabled = true; confirmBtn.textContent = "Deleting…";
        try {
          await fetch(`/admin/users/${deleteTargetId}`, {
            method: "DELETE",
            headers: { authorization: `Bearer ${Api.getToken()}` },
          });
          previewEl.style.display = "none"; confirmBtn.style.display = "none";
          usernameInput.value = ""; deleteTargetId = null; deleteTargetName = null;
          resultEl.style.display = "block";
          resultEl.style.borderColor = "var(--win)"; resultEl.style.color = "var(--win)";
          resultEl.textContent = `✅ Account deleted.`;
          UI.toast("Account deleted.", "info");
        } catch (err) {
          resultEl.style.display = "block";
          resultEl.style.borderColor = "var(--loss)"; resultEl.style.color = "var(--loss)";
          resultEl.textContent = `❌ ${err.message}`;
          UI.toast(err.message, "loss");
          confirmBtn.disabled = false; confirmBtn.textContent = "🗑️ Permanently Delete Account";
        }
      });
    }

    buildSkeleton();
  }

  return { render };
})();
