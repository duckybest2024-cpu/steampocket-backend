const FriendsGame = (() => {
  // ─── Shared style snippets ──────────────────────────────────────────────────
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
    tabs: `display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;`,
    tab: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text-dim);
      padding:9px 18px;border-radius:999px;cursor:pointer;font-size:0.85rem;font-weight:700;
      display:inline-flex;align-items:center;gap:6px;
    `,
    tabActive: `
      background:rgba(111,92,242,0.18);border-color:var(--accent);color:var(--text);
    `,
    badge: `
      background:var(--accent);color:white;font-size:0.68rem;font-weight:800;
      padding:2px 7px;border-radius:999px;line-height:1.5;
    `,
    pendingBadge: `
      background:var(--gold);color:#2c1c00;font-size:0.68rem;font-weight:800;
      padding:2px 7px;border-radius:999px;line-height:1.5;
    `,
    section: ``,
    emptyHint: `
      color:var(--text-dim);font-size:0.9rem;text-align:center;
      padding:40px 20px;font-style:italic;
    `,
    friendRow: `
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      padding:12px 14px;background:var(--bg-elev);border:1px solid var(--border);
      border-radius:10px;margin-bottom:8px;flex-wrap:wrap;
    `,
    friendInfo: `display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;`,
    friendName: `font-weight:700;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`,
    friendLevel: `font-size:0.75rem;color:var(--text-dim);`,
    reqActions: `display:flex;gap:8px;flex-shrink:0;`,
    acceptBtn: `
      background:linear-gradient(135deg,var(--win),#10b981);color:#06281d;
      border:none;border-radius:8px;padding:7px 14px;font-weight:700;
      font-size:0.82rem;cursor:pointer;
    `,
    rejectBtn: `
      background:var(--bg-card);color:var(--text-dim);
      border:1px solid var(--border);border-radius:8px;padding:7px 14px;
      font-weight:700;font-size:0.82rem;cursor:pointer;
    `,
    removeBtn: `
      background:transparent;color:var(--loss);
      border:1px solid rgba(248,113,113,0.35);border-radius:8px;
      padding:7px 14px;font-weight:700;font-size:0.82rem;cursor:pointer;
    `,
    addForm: `display:flex;flex-direction:column;gap:12px;max-width:440px;`,
    addLabel: `font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;`,
    addInput: `
      background:var(--bg-elev);border:1px solid var(--border);color:var(--text);
      padding:11px 14px;border-radius:10px;font-size:0.95rem;width:100%;
    `,
    sendBtn: `
      background:linear-gradient(135deg,var(--accent),#8b5cf6);color:white;
      border:none;border-radius:10px;padding:11px 20px;font-weight:700;
      font-size:0.95rem;cursor:pointer;width:fit-content;
    `,
    since: `font-size:0.72rem;color:var(--text-dim);`,
  };

  function timeSince(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  function render(container, accountState) {
    let friends = [];
    let requests = [];
    let activeTab = "friends";

    function tabStyle(key) {
      return key === activeTab ? S.tab + S.tabActive : S.tab;
    }

    function friendCountBadge() {
      return friends.length > 0
        ? `<span style="${S.badge}">${friends.length}</span>`
        : "";
    }

    function pendingCountBadge() {
      return requests.length > 0
        ? `<span style="${S.pendingBadge}">${requests.length}</span>`
        : "";
    }

    function buildTabBar() {
      container.querySelector("#fl-tab-friends").setAttribute("style", tabStyle("friends"));
      container.querySelector("#fl-tab-requests").setAttribute("style", tabStyle("requests"));
      container.querySelector("#fl-tab-add").setAttribute("style", tabStyle("add"));
      container.querySelector("#fl-badge-friends").innerHTML = friendCountBadge();
      container.querySelector("#fl-badge-requests").innerHTML = pendingCountBadge();
    }

    function showTab(key) {
      activeTab = key;
      buildTabBar();
      ["friends", "requests", "add"].forEach((t) => {
        const el = container.querySelector(`#fl-pane-${t}`);
        if (el) el.style.display = t === key ? "block" : "none";
      });
    }

    function buildFriendsPane() {
      const pane = container.querySelector("#fl-pane-friends");
      if (!pane) return;
      if (friends.length === 0) {
        pane.innerHTML = `<div style="${S.emptyHint}">No friends yet. Use the "Add Friend" tab to find people.</div>`;
        return;
      }
      pane.innerHTML = friends.map((f) => `
        <div style="${S.friendRow}" data-id="${f.id}">
          <div style="${S.friendInfo}">
            <span style="${S.friendName}">👤 ${f.username}</span>
            <span style="${S.friendLevel}">Level ${f.level} · Friends since ${timeSince(f.since)}</span>
          </div>
          <div>
            <button class="fl-remove-btn" data-id="${f.id}" data-name="${f.username}"
              style="${S.removeBtn}">Remove</button>
          </div>
        </div>
      `).join("");

      pane.querySelectorAll(".fl-remove-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const name = btn.dataset.name;
          if (!confirm(`Remove ${name} from your friends list?`)) return;
          btn.disabled = true;
          try {
            await fetch(`/friends/${id}`, {
              method: "DELETE",
              headers: { authorization: `Bearer ${Api.getToken()}` },
            });
            friends = friends.filter((f) => f.id !== id);
            UI.toast(`Removed ${name} from friends.`, "info");
            buildFriendsPane();
            buildTabBar();
          } catch (err) {
            UI.toast(err.message || "Failed to remove friend.", "loss");
            btn.disabled = false;
          }
        });
      });
    }

    function buildRequestsPane() {
      const pane = container.querySelector("#fl-pane-requests");
      if (!pane) return;
      if (requests.length === 0) {
        pane.innerHTML = `<div style="${S.emptyHint}">No pending friend requests.</div>`;
        return;
      }
      pane.innerHTML = requests.map((r) => `
        <div style="${S.friendRow}" data-req-id="${r.id}">
          <div style="${S.friendInfo}">
            <span style="${S.friendName}">👤 ${r.from.username}</span>
            <span style="${S.friendLevel}">Level ${r.from.level} · Sent ${timeSince(r.createdAt)}</span>
          </div>
          <div style="${S.reqActions}">
            <button class="fl-accept-btn" data-id="${r.id}" style="${S.acceptBtn}">Accept</button>
            <button class="fl-reject-btn" data-id="${r.id}" style="${S.rejectBtn}">Reject</button>
          </div>
        </div>
      `).join("");

      pane.querySelectorAll(".fl-accept-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            await Api.post("/friends/accept", { requestId: btn.dataset.id });
            UI.toast("Friend request accepted!", "win");
            await loadData();
          } catch (err) {
            UI.toast(err.message || "Failed to accept request.", "loss");
            btn.disabled = false;
          }
        });
      });

      pane.querySelectorAll(".fl-reject-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            await Api.post("/friends/reject", { requestId: btn.dataset.id });
            requests = requests.filter((r) => r.id !== btn.dataset.id);
            UI.toast("Request rejected.", "info");
            buildRequestsPane();
            buildTabBar();
          } catch (err) {
            UI.toast(err.message || "Failed to reject request.", "loss");
            btn.disabled = false;
          }
        });
      });
    }

    function wireAddPane() {
      const form = container.querySelector("#fl-add-form");
      const input = container.querySelector("#fl-add-input");
      const sendBtn = container.querySelector("#fl-send-btn");
      if (!form || !input || !sendBtn) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = input.value.trim();
        if (!username) return;
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending…";
        try {
          await Api.post("/friends/request", { username });
          UI.toast(`Friend request sent to ${username}!`, "win");
          input.value = "";
        } catch (err) {
          UI.toast(err.message || "Failed to send request.", "loss");
        } finally {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send Request";
        }
      });
    }

    async function loadData() {
      try {
        const [fRes, rRes] = await Promise.all([
          Api.get("/friends"),
          Api.get("/friends/requests"),
        ]);
        friends = fRes.friends || [];
        requests = rRes.requests || [];
      } catch {
        friends = [];
        requests = [];
      }
      buildFriendsPane();
      buildRequestsPane();
      buildTabBar();
      showTab(activeTab);
    }

    // Initial render skeleton
    container.innerHTML = `
      <div class="game-panel" style="${S.panel}">
        <div style="${S.header}">
          <h2 style="${S.title}">👥 Friends</h2>
        </div>

        <div style="${S.tabs}" id="fl-tabs">
          <button id="fl-tab-friends" style="${tabStyle("friends")}">
            Friends <span id="fl-badge-friends"></span>
          </button>
          <button id="fl-tab-requests" style="${tabStyle("requests")}">
            Requests <span id="fl-badge-requests"></span>
          </button>
          <button id="fl-tab-add" style="${tabStyle("add")}">
            ➕ Add Friend
          </button>
        </div>

        <div id="fl-pane-friends"></div>

        <div id="fl-pane-requests" style="display:none;"></div>

        <div id="fl-pane-add" style="display:none;">
          <form id="fl-add-form" style="${S.addForm}">
            <label style="${S.addLabel}" for="fl-add-input">Search by username</label>
            <input id="fl-add-input" type="text" placeholder="Enter username…" style="${S.addInput}"
              autocomplete="off" spellcheck="false" />
            <button id="fl-send-btn" type="submit" style="${S.sendBtn}">Send Request</button>
          </form>
        </div>
      </div>
    `;

    // Wire tab buttons
    container.querySelector("#fl-tab-friends").addEventListener("click", () => showTab("friends"));
    container.querySelector("#fl-tab-requests").addEventListener("click", () => showTab("requests"));
    container.querySelector("#fl-tab-add").addEventListener("click", () => showTab("add"));

    wireAddPane();
    loadData();
  }

  return { render };
})();
