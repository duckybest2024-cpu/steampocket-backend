const AdminGame = (() => {
  // ─── Style snippets ─────────────────────────────────────────────────────────
  const S = {
    panel: `
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:var(--radius);padding:24px;
    `,
    header: `
      display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:10px;margin-bottom:20px;
    `,
    title: `margin:0;font-size:1.3rem;`,
    subtitle: `margin:4px 0 0;font-size:0.82rem;color:var(--loss);font-weight:600;`,
    tabs: `display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap;`,
    tab: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);
      padding:9px 18px;border-radius:999px;cursor:pointer;font-size:0.85rem;font-weight:700;
    `,
    tabActive: `
      background:rgba(111,92,242,0.18);border-color:var(--accent);color:var(--text);
    `,
    statsGrid: `
      display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;
      margin-bottom:8px;
    `,
    statBox: `
      background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;
      padding:16px;display:flex;flex-direction:column;gap:4px;
    `,
    sbLabel: `font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;`,
    sbValue: `font-size:1.25rem;font-weight:900;color:var(--text);`,
    searchRow: `display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap;`,
    searchInput: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text);
      padding:10px 14px;border-radius:10px;font-size:0.9rem;flex:1;min-width:180px;
    `,
    tableWrap: `overflow-x:auto;`,
    table: `width:100%;border-collapse:collapse;font-size:0.85rem;`,
    th: `
      text-align:left;padding:10px 12px;font-size:0.68rem;text-transform:uppercase;
      letter-spacing:0.06em;color:var(--text-dim);border-bottom:1px solid var(--border);
      white-space:nowrap;
    `,
    td: `padding:10px 12px;border-bottom:1px solid var(--border);white-space:nowrap;`,
    banBtn: `
      background:transparent;border:1px solid rgba(248,113,113,0.45);color:var(--loss);
      border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;
    `,
    unbanBtn: `
      background:transparent;border:1px solid rgba(52,211,153,0.45);color:var(--win);
      border-radius:7px;padding:5px 11px;font-weight:700;font-size:0.78rem;cursor:pointer;
    `,
    usernameLink: `
      color:var(--accent-2);cursor:pointer;font-weight:700;text-decoration:underline;
      text-decoration-color:rgba(34,211,238,0.35);
    `,
    bannedRow: `opacity:0.6;`,
    form: `display:flex;flex-direction:column;gap:14px;max-width:480px;`,
    formGroup: `display:flex;flex-direction:column;gap:6px;`,
    formLabel: `font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;`,
    formInput: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text);
      padding:11px 14px;border-radius:10px;font-size:0.95rem;
    `,
    submitBtn: `
      background:linear-gradient(135deg,var(--accent),#8b5cf6);color:white;
      border:none;border-radius:10px;padding:11px 22px;font-weight:700;
      font-size:0.95rem;cursor:pointer;width:fit-content;
    `,
    dangerZone: `
      border:1px solid rgba(248,113,113,0.4);border-radius:12px;padding:20px;
      background:rgba(248,113,113,0.05);margin-top:4px;
    `,
    dangerTitle: `margin:0 0 14px;font-size:1rem;color:var(--loss);`,
    deleteBtn: `
      background:linear-gradient(135deg,var(--loss),#ef4444);color:#2c0a0a;
      border:none;border-radius:10px;padding:11px 22px;font-weight:700;
      font-size:0.95rem;cursor:pointer;margin-top:6px;
    `,
    resultBox: `
      margin-top:14px;padding:14px;border-radius:10px;font-size:0.88rem;font-weight:600;
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text);
    `,
    pagination: `display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap;`,
    pageBtn: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);
      padding:7px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;
    `,
    pageBtnActive: `border-color:var(--accent);color:var(--accent-2);background:rgba(111,92,242,0.12);`,
  };

  function money(cents) {
    return UI.money(cents);
  }

  function render(container, accountState) {
    let activeTab = "stats";
    // Shared user list cache used across tabs
    let cachedUsers = [];
    let usersPage = 1;
    let usersSearch = "";
    let usersTotal = 0;

    function tabStyle(key) {
      return key === activeTab ? S.tab + S.tabActive : S.tab;
    }

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
            <button id="adm-tab-danger"  style="${tabStyle("danger")}">⚠️ Danger Zone</button>
          </div>

          <div id="adm-pane-stats"></div>
          <div id="adm-pane-users"  style="display:none;"></div>
          <div id="adm-pane-adjust" style="display:none;"></div>
          <div id="adm-pane-danger" style="display:none;"></div>
        </div>
      `;

      container.querySelector("#adm-tab-stats").addEventListener("click",  () => switchTab("stats"));
      container.querySelector("#adm-tab-users").addEventListener("click",  () => switchTab("users"));
      container.querySelector("#adm-tab-adjust").addEventListener("click", () => switchTab("adjust"));
      container.querySelector("#adm-tab-danger").addEventListener("click", () => switchTab("danger"));

      buildAdjustPane();
      buildDangerPane();

      switchTab("stats", true);
    }

    function updateTabBar() {
      ["stats", "users", "adjust", "danger"].forEach((key) => {
        const btn = container.querySelector(`#adm-tab-${key}`);
        if (btn) btn.setAttribute("style", tabStyle(key));
      });
    }

    function switchTab(key, initial) {
      activeTab = key;
      updateTabBar();
      ["stats", "users", "adjust", "danger"].forEach((t) => {
        const pane = container.querySelector(`#adm-pane-${t}`);
        if (pane) pane.style.display = t === key ? "block" : "none";
      });
      if (key === "stats" && initial) loadStats();
      if (key === "users") loadUsers();
    }

    // ── Stats tab ──────────────────────────────────────────────────────────────
    async function loadStats() {
      const pane = container.querySelector("#adm-pane-stats");
      if (!pane) return;
      pane.innerHTML = `<div style="color:var(--text-dim);padding:40px 20px;text-align:center;">⏳ Loading stats…</div>`;
      try {
        const data = await Api.get("/admin/stats");
        const s = data.stats || data;
        const houseEdgePct = s.totalWagered > 0
          ? (((s.totalWagered - s.totalPaidOut) / s.totalWagered) * 100).toFixed(2)
          : "0.00";
        pane.innerHTML = `
          <div style="${S.statsGrid}">
            <div class="stat-box" style="${S.statBox}">
              <div class="sb-label" style="${S.sbLabel}">Total Users</div>
              <div class="sb-value" style="${S.sbValue}">${(s.totalUsers || 0).toLocaleString()}</div>
            </div>
            <div class="stat-box" style="${S.statBox}">
              <div class="sb-label" style="${S.sbLabel}">Total Bets</div>
              <div class="sb-value" style="${S.sbValue}">${(s.totalBets || 0).toLocaleString()}</div>
            </div>
            <div class="stat-box" style="${S.statBox}">
              <div class="sb-label" style="${S.sbLabel}">Total Wagered</div>
              <div class="sb-value" style="${S.sbValue};color:var(--gold)">${money(s.totalWagered || 0)}</div>
            </div>
            <div class="stat-box" style="${S.statBox}">
              <div class="sb-label" style="${S.sbLabel}">Total Paid Out</div>
              <div class="sb-value" style="${S.sbValue};color:var(--win)">${money(s.totalPaidOut || 0)}</div>
            </div>
            <div class="stat-box" style="${S.statBox}">
              <div class="sb-label" style="${S.sbLabel}">House Edge</div>
              <div class="sb-value" style="${S.sbValue};color:var(--accent-2)">${houseEdgePct}%</div>
            </div>
          </div>
        `;
      } catch (err) {
        pane.innerHTML = `<div style="color:var(--loss);padding:30px 20px;text-align:center;">${err.message}</div>`;
      }
    }

    // ── Users tab ──────────────────────────────────────────────────────────────
    async function loadUsers(page, search) {
      const pane = container.querySelector("#adm-pane-users");
      if (!pane) return;

      if (page !== undefined) usersPage = page;
      if (search !== undefined) usersSearch = search;

      const searchVal = usersSearch;
      const pageNum = usersPage;

      if (pane.innerHTML === "" || pane.innerHTML.trim() === "") {
        pane.innerHTML = buildUsersShell();
        wireUsersPane();
      }

      const tableBody = pane.querySelector("#adm-users-tbody");
      const paginationEl = pane.querySelector("#adm-users-pagination");
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-dim);">⏳ Loading…</td></tr>`;

      try {
        const params = new URLSearchParams({ page: pageNum, limit: 20 });
        if (searchVal) params.set("search", searchVal);
        const data = await Api.get(`/admin/users?${params.toString()}`);
        const users = data.users || [];
        cachedUsers = users;
        usersTotal = data.total || users.length;
        const totalPages = Math.max(1, Math.ceil(usersTotal / 20));

        if (!tableBody) return;
        if (users.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-dim);">No users found.</td></tr>`;
        } else {
          tableBody.innerHTML = users.map((u) => `
            <tr style="${u.isBanned ? S.bannedRow : ""}">
              <td style="${S.td}">
                <span class="adm-username-link" data-username="${u.username}" style="${S.usernameLink}">${u.username}</span>
              </td>
              <td style="${S.td};color:var(--gold);">${money(u.balance || 0)}</td>
              <td style="${S.td};color:var(--accent-2);">Lv ${u.level}</td>
              <td style="${S.td};color:var(--text-dim);">${(u.betCount || u._count?.bets || 0).toLocaleString()}</td>
              <td style="${S.td};">
                ${u.isBanned
                  ? `<span style="color:var(--loss);font-size:0.78rem;font-weight:700;">🚫 Banned</span>`
                  : `<span style="color:var(--win);font-size:0.78rem;font-weight:700;">✅ Active</span>`
                }
              </td>
              <td style="${S.td};">
                <button class="adm-ban-btn" data-id="${u.id}" data-banned="${u.isBanned}"
                  style="${u.isBanned ? S.unbanBtn : S.banBtn}">
                  ${u.isBanned ? "Unban" : "Ban"}
                </button>
              </td>
            </tr>
          `).join("");
        }

        // Wire username click → copies to adjust-balance form
        pane.querySelectorAll(".adm-username-link").forEach((el) => {
          el.addEventListener("click", () => {
            const un = el.dataset.username;
            const adjustInput = container.querySelector("#adm-adjust-username");
            if (adjustInput) {
              adjustInput.value = un;
              switchTab("adjust");
            } else {
              navigator.clipboard && navigator.clipboard.writeText(un).catch(() => {});
              UI.toast(`Username "${un}" copied to clipboard.`, "info");
            }
          });
        });

        // Wire ban/unban buttons
        pane.querySelectorAll(".adm-ban-btn").forEach((btn) => {
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

        // Pagination
        if (paginationEl) {
          if (totalPages <= 1) {
            paginationEl.innerHTML = "";
          } else {
            const pages = [];
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            paginationEl.innerHTML = pages.map((p) => `
              <button class="adm-page-btn" data-page="${p}"
                style="${S.pageBtn}${p === pageNum ? S.pageBtnActive : ""}">
                ${p}
              </button>
            `).join("");
            paginationEl.querySelectorAll(".adm-page-btn").forEach((btn) => {
              btn.addEventListener("click", () => loadUsers(Number(btn.dataset.page)));
            });
          }
        }
      } catch (err) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="padding:24px;color:var(--loss);">${err.message}</td></tr>`;
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
      const searchInput = pane.querySelector("#adm-users-search");
      if (!searchInput) return;

      let debounceTimer = null;
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          usersPage = 1;
          loadUsers(1, searchInput.value.trim());
        }, 350);
      });
    }

    // ── Adjust Balance tab ─────────────────────────────────────────────────────
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
            <label style="${S.formLabel}" for="adm-adjust-amount">Amount (chips — use negative to deduct)</label>
            <input id="adm-adjust-amount" type="number" placeholder="e.g. 100 or -50"
              style="${S.formInput}" step="1" required />
          </div>
          <div style="${S.formGroup}">
            <label style="${S.formLabel}" for="adm-adjust-note">Note / reason</label>
            <input id="adm-adjust-note" type="text" placeholder="e.g. compensation, manual adjustment…"
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
        const note = pane.querySelector("#adm-adjust-note").value.trim();
        const submitBtn = pane.querySelector("#adm-adjust-submit");

        if (!usernameVal) { UI.toast("Enter a username.", "loss"); return; }
        if (isNaN(amountChips) || amountChips === 0) { UI.toast("Enter a non-zero chip amount.", "loss"); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = "Working…";
        resultBox.style.display = "none";

        try {
          // Resolve username → userId via users search
          const lookupData = await Api.get(`/admin/users?search=${encodeURIComponent(usernameVal)}&limit=5`);
          const match = (lookupData.users || []).find(
            (u) => u.username.toLowerCase() === usernameVal.toLowerCase()
          );
          if (!match) throw new Error(`User "${usernameVal}" not found.`);

          const amountCents = amountChips * 100;
          const data = await Api.post(`/admin/adjust-balance/${match.id}`, {
            amount: amountCents,
            note: note || undefined,
          });

          const newBalance = data.balance !== undefined ? data.balance : null;
          resultBox.style.display = "block";
          resultBox.style.borderColor = "var(--win)";
          resultBox.style.color = "var(--win)";
          resultBox.innerHTML = `
            ✅ Adjusted <strong>${usernameVal}</strong> by
            <strong>${amountChips > 0 ? "+" : ""}${amountChips} chips</strong>
            ${newBalance !== null ? `· New balance: ${money(newBalance)}` : ""}
          `;
          UI.toast(`Balance adjusted for ${usernameVal}.`, "win");
        } catch (err) {
          resultBox.style.display = "block";
          resultBox.style.borderColor = "var(--loss)";
          resultBox.style.color = "var(--loss)";
          resultBox.textContent = `❌ ${err.message}`;
          UI.toast(err.message, "loss");
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Apply Adjustment";
        }
      });
    }

    // ── Danger Zone tab ────────────────────────────────────────────────────────
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
            <div id="adm-delete-preview" style="display:none;padding:12px 14px;background:rgba(248,113,113,0.1);
              border:1px solid rgba(248,113,113,0.4);border-radius:10px;font-size:0.88rem;margin-bottom:2px;">
            </div>
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

      let deleteTargetId = null;
      let deleteTargetName = null;
      const lookupBtn = pane.querySelector("#adm-delete-lookup-btn");
      const confirmBtn = pane.querySelector("#adm-delete-confirm-btn");
      const previewEl = pane.querySelector("#adm-delete-preview");
      const resultEl = pane.querySelector("#adm-delete-result");
      const usernameInput = pane.querySelector("#adm-delete-username");

      // Reset confirm button when username changes
      usernameInput.addEventListener("input", () => {
        deleteTargetId = null;
        deleteTargetName = null;
        confirmBtn.style.display = "none";
        previewEl.style.display = "none";
        resultEl.style.display = "none";
      });

      lookupBtn.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        if (!username) { UI.toast("Enter a username to look up.", "loss"); return; }

        lookupBtn.disabled = true;
        lookupBtn.textContent = "Looking up…";
        deleteTargetId = null;
        deleteTargetName = null;
        confirmBtn.style.display = "none";
        previewEl.style.display = "none";
        resultEl.style.display = "none";

        try {
          const data = await Api.get(`/admin/users?search=${encodeURIComponent(username)}&limit=5`);
          const match = (data.users || []).find(
            (u) => u.username.toLowerCase() === username.toLowerCase()
          );
          if (!match) {
            previewEl.style.display = "block";
            previewEl.style.borderColor = "rgba(248,113,113,0.4)";
            previewEl.innerHTML = `<span style="color:var(--loss);">User "${username}" not found.</span>`;
          } else {
            deleteTargetId = match.id;
            deleteTargetName = match.username;
            previewEl.style.display = "block";
            previewEl.innerHTML = `
              Found: <strong>${match.username}</strong> —
              Balance ${money(match.balance || 0)} · Level ${match.level} ·
              ${(match.betCount || match._count?.bets || 0).toLocaleString()} bets
              ${match.isBanned ? " · <span style='color:var(--loss);'>Banned</span>" : ""}
            `;
            confirmBtn.style.display = "inline-block";
          }
        } catch (err) {
          previewEl.style.display = "block";
          previewEl.innerHTML = `<span style="color:var(--loss);">${err.message}</span>`;
        } finally {
          lookupBtn.disabled = false;
          lookupBtn.textContent = "Look Up User";
        }
      });

      confirmBtn.addEventListener("click", async () => {
        if (!deleteTargetId || !deleteTargetName) return;
        const confirmed = confirm(
          `Are you absolutely sure you want to permanently delete the account "${deleteTargetName}"?\n\nThis will remove all their bets, transactions, and data. THIS CANNOT BE UNDONE.`
        );
        if (!confirmed) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting…";

        try {
          await fetch(`/admin/users/${deleteTargetId}`, {
            method: "DELETE",
            headers: { authorization: `Bearer ${Api.getToken()}` },
          });
          previewEl.style.display = "none";
          confirmBtn.style.display = "none";
          usernameInput.value = "";
          deleteTargetId = null;
          deleteTargetName = null;

          resultEl.style.display = "block";
          resultEl.style.borderColor = "var(--win)";
          resultEl.style.color = "var(--win)";
          resultEl.textContent = `✅ Account "${deleteTargetName}" has been deleted.`;
          UI.toast(`Account deleted.`, "info");
        } catch (err) {
          resultEl.style.display = "block";
          resultEl.style.borderColor = "var(--loss)";
          resultEl.style.color = "var(--loss)";
          resultEl.textContent = `❌ ${err.message}`;
          UI.toast(err.message, "loss");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "🗑️ Permanently Delete Account";
        }
      });
    }

    buildSkeleton();
  }

  return { render };
})();
