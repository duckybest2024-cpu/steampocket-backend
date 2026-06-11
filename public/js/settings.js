const SettingsGame = (() => {
  const RANK_INFO = {
    bronze:   { label: "Bronze",      color: "#cd7f32", bg: "rgba(205,127,50,0.15)" },
    silver:   { label: "Silver",      color: "#c0c0c0", bg: "rgba(192,192,192,0.15)" },
    gold:     { label: "Gold",        color: "#ffd700", bg: "rgba(255,215,0,0.15)" },
    platinum: { label: "Platinum",    color: "#b9f2ff", bg: "rgba(185,242,255,0.15)" },
    diamond:  { label: "Diamond",     color: "#00e5ff", bg: "rgba(0,229,255,0.15)" },
    owner:    { label: "👑 Owner",    color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  };

  const S = {
    page: `max-width:560px;`,
    section: `
      background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);
      padding:22px;margin-bottom:14px;
    `,
    sectionTitle: `margin:0 0 16px;font-size:1rem;font-weight:800;color:var(--text);`,
    form: `display:flex;flex-direction:column;gap:12px;`,
    label: `
      font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;
      letter-spacing:0.05em;margin-bottom:4px;display:block;
    `,
    input: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text);
      padding:10px 14px;border-radius:10px;font-size:0.92rem;width:100%;box-sizing:border-box;
    `,
    btn: `
      background:linear-gradient(135deg,var(--accent),#8b5cf6);color:white;
      border:none;border-radius:10px;padding:11px 22px;font-weight:700;
      font-size:0.92rem;cursor:pointer;width:fit-content;transition:filter 0.15s;
    `,
    note: `font-size:0.75rem;color:var(--text-dim);margin:4px 0 0;`,
  };

  function rankBadgeHTML(rank) {
    const r = RANK_INFO[rank] || RANK_INFO.bronze;
    return `<span style="padding:4px 12px;border-radius:999px;font-size:0.8rem;font-weight:700;
      color:${r.color};background:${r.bg};border:1px solid ${r.color}40;">${r.label}</span>`;
  }

  function render(container, accountState) {
    function rebuild() {
      const rank = (accountState.username || "").toLowerCase() === "ditol21" ? "owner" : (accountState.rank || "bronze");
      const displayName = accountState.nickname || accountState.username;

      container.innerHTML = `
        <div style="${S.page}">
          <div style="${S.section}">
            <h3 style="${S.sectionTitle}">Your Account</h3>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:1.15rem;font-weight:800;">${displayName}</div>
                ${accountState.nickname
                  ? `<div style="font-size:0.82rem;color:var(--text-dim);">@${accountState.username}</div>`
                  : ""}
                <div style="margin-top:8px;">${rankBadgeHTML(rank)}</div>
              </div>
            </div>
          </div>

          <div style="${S.section}">
            <h3 style="${S.sectionTitle}">Nickname</h3>
            <div style="${S.form}">
              <div>
                <label style="${S.label}">Display name shown to others</label>
                <input id="s-nickname" type="text" style="${S.input}"
                  placeholder="Leave blank to use your username"
                  value="${accountState.nickname || ""}" maxlength="30" autocomplete="off" />
                <p style="${S.note}">1–30 characters. Clears if left blank.</p>
              </div>
              <button type="button" id="s-nickname-btn" style="${S.btn}">Save Nickname</button>
            </div>
          </div>

          <div style="${S.section}">
            <h3 style="${S.sectionTitle}">Change Username</h3>
            <div style="${S.form}">
              <div>
                <label style="${S.label}">New Username</label>
                <input id="s-newuser" type="text" style="${S.input}"
                  placeholder="${accountState.username}" maxlength="20"
                  autocomplete="off" />
                <p style="${S.note}">3–20 chars · letters, numbers, underscore only.</p>
              </div>
              <button type="button" id="s-username-btn" style="${S.btn}">Change Username</button>
            </div>
          </div>

          <div style="${S.section}">
            <h3 style="${S.sectionTitle}">Change Password</h3>
            <div style="${S.form}">
              <div>
                <label style="${S.label}">Current Password</label>
                <input id="s-cur-pw" type="password" style="${S.input}"
                  autocomplete="current-password" />
              </div>
              <div>
                <label style="${S.label}">New Password</label>
                <input id="s-new-pw" type="password" style="${S.input}"
                  placeholder="8+ characters" autocomplete="new-password" />
              </div>
              <button type="button" id="s-pw-btn" style="${S.btn}">Change Password</button>
            </div>
          </div>
        </div>
      `;

      async function save(body, successMsg) {
        try {
          const data = await Api.patch("/settings", body);
          if (data.user) {
            accountState.username = data.user.username;
            accountState.nickname = data.user.nickname;
            accountState.rank = data.user.rank;
            await App.refreshAccount();
          }
          UI.toast(successMsg, "win");
          return true;
        } catch (err) {
          UI.toast(err.message || "Failed to save.", "loss");
          return false;
        }
      }

      container.querySelector("#s-nickname-btn").addEventListener("click", async () => {
        const val = container.querySelector("#s-nickname").value.trim();
        const ok = await save({ nickname: val || null }, val ? "Nickname saved!" : "Nickname removed.");
        if (ok) rebuild();
      });

      container.querySelector("#s-username-btn").addEventListener("click", async () => {
        const val = container.querySelector("#s-newuser").value.trim();
        if (!val) { UI.toast("Enter a new username.", "loss"); return; }
        if (val === accountState.username) { UI.toast("That's already your username.", "info"); return; }
        const ok = await save({ newUsername: val }, "Username changed!");
        if (ok) rebuild();
      });

      container.querySelector("#s-pw-btn").addEventListener("click", async () => {
        const cur = container.querySelector("#s-cur-pw").value;
        const nw = container.querySelector("#s-new-pw").value;
        if (!cur || !nw) { UI.toast("Fill in both password fields.", "loss"); return; }
        const ok = await save({ currentPassword: cur, newPassword: nw }, "Password changed!");
        if (ok) {
          container.querySelector("#s-cur-pw").value = "";
          container.querySelector("#s-new-pw").value = "";
        }
      });
    }

    rebuild();
  }

  return { render };
})();
