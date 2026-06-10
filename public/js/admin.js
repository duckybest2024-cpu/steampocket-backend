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
  };

  const TABS = ["stats","users","adjust","bank","danger"];

  function money(cents) { return UI.money(cents); }
  function chips(cents) { return Math.floor(cents / 100).toLocaleString() + " 🪙"; }

  function rankBadge(rank) {
    const r = RANK_INFO[rank] || RANK_INFO.bronze;
    return `<span style="color:${r.c};font-weight:700;font-size:0.78rem;">${r.label}</span>`;
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
            <button id="adm-tab-stats"   style="${tabStyle("stats")}">📊 Stats</button>
            <button id="adm-tab-users"   style="${tabStyle("users")}">👥 Users</button>
            <button id="adm-tab-adjust"  style="${tabStyle("adjust")}">💰 Adjust Balance</button>
            <button id="adm-tab-bank"    style="${tabStyle("bank")}">🏦 House Bank</button>
            <button id="adm-tab-danger"  style="${tabStyle("danger")}">⚠️ Danger Zone</button>
          </div>
          ${TABS.map(t => `<div id="adm-pane-${t}" style="${t === "stats" ? "" : "display:none;"}"></div>`).join("")}
        </div>
      `;

      TABS.forEach(key => {
        container.querySelector(`#adm-tab-${key}`).addEventListener("click", () => switchTab(key));
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
      if (key === "stats" && initial) loadStats();
      if (key === "users") loadUsers();
      if (key === "bank") loadBank();
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    async function loadStats() {
      const pane = container.querySelector("#adm-pane-stats");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading stats…</div>`;
      try {
        const s = await Api.get("/admin/stats");
        const houseEdgePct = s.totalWagered > 0
          ? (((s.totalWagered - s.totalPaidOut) / s.totalWagered) * 100).toFixed(2)
          : "0.00";
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
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-dim);">⏳ Loading…</td></tr>`;

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
          tableBody.innerHTML = `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--text-dim);">No users found.</td></tr>`;
        } else {
          tableBody.innerHTML = users.map((u) => {
            const rankKey = u.username === "Ditol21" ? "owner" : (u.rank || "bronze");
            const isOwner = u.username === "Ditol21";
            const rankSelectHtml = isOwner
              ? `<span style="color:var(--accent-2);font-weight:700;font-size:0.8rem;">👑 Owner</span>`
              : `<select class="adm-rank-select" data-id="${u.id}"
                  style="${S.rankSelect}">
                  ${RANK_OPTS.map(r =>
                    `<option value="${r}" ${r === (u.rank || "bronze") ? "selected" : ""}>${RANK_INFO[r].label}</option>`
                  ).join("")}
                </select>`;
            return `
              <tr style="${u.isBanned ? S.bannedRow : ""}">
                <td style="${S.td}">
                  <span class="adm-username-link" data-username="${u.username}" style="${S.usernameLink}">${u.username}</span>
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

        // Username click → fill adjust form
        pane.querySelectorAll(".adm-username-link").forEach(el => {
          el.addEventListener("click", () => {
            const adjustInput = container.querySelector("#adm-adjust-username");
            if (adjustInput) {
              adjustInput.value = el.dataset.username;
              switchTab("adjust");
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
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="padding:24px;color:var(--loss);">${err.message}</td></tr>`;
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
                <th style="${S.th}">Actions</th>
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
