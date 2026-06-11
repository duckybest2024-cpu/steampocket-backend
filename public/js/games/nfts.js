const NFTsGame = (() => {
  const RARITY_COLOR = { common: "#9ca3af", uncommon: "#34d399", rare: "#60a5fa", epic: "#a78bfa", legendary: "#f59e0b" };
  const RARITY_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };

  function render(container, state) {
    container.innerHTML = `
      <div class="game-panel" style="max-width:800px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div>
            <h2 style="margin:0 0 2px">🖼️ NFT Collection</h2>
            <p style="margin:0;color:var(--text-dim);font-size:0.85rem">Earn NFTs through achievements — big wins, level ups, streaks.</p>
          </div>
          <button id="nft-trade-btn" class="secondary-btn">💱 Trade</button>
        </div>

        <div id="nft-tabs" style="display:flex;gap:6px;margin-bottom:16px">
          <button class="nft-tab secondary-btn active" data-tab="collection">My Collection</button>
          <button class="nft-tab secondary-btn" data-tab="inbox">Incoming Trades</button>
          <button class="nft-tab secondary-btn" data-tab="sent">Sent Trades</button>
          <button class="nft-tab secondary-btn" data-tab="create">New Trade</button>
        </div>

        <div id="nft-tab-collection">
          <div id="nft-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px"></div>
          <div id="nft-empty" style="display:none;text-align:center;padding:40px;color:var(--text-dim)">
            <div style="font-size:3rem">🎯</div>
            <div style="margin-top:8px">No NFTs yet — win big to earn them!</div>
            <div style="font-size:0.82rem;margin-top:4px">Try: 10x multiplier (Silver Coin), Win Jackpot (Jackpot Trophy), Level 5 (Bronze Star)…</div>
          </div>
        </div>

        <div id="nft-tab-inbox" style="display:none">
          <div id="nft-inbox-list" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>

        <div id="nft-tab-sent" style="display:none">
          <div id="nft-sent-list" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>

        <div id="nft-tab-create" style="display:none">
          <div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;padding:16px">
            <h3 style="margin:0 0 12px">Create Trade Offer</h3>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div>
                <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">To Player (username)</div>
                <input id="trade-to" type="text" placeholder="e.g. ditol21" style="width:100%;box-sizing:border-box" />
              </div>
              <div style="display:flex;gap:10px">
                <div style="flex:1">
                  <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">You Offer (chips)</div>
                  <input id="trade-offer-chips" type="number" value="0" min="0" style="width:100%;box-sizing:border-box" />
                </div>
                <div style="flex:1">
                  <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">You Want (chips)</div>
                  <input id="trade-req-chips" type="number" value="0" min="0" style="width:100%;box-sizing:border-box" />
                </div>
              </div>
              <div>
                <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">Message (optional)</div>
                <input id="trade-msg" type="text" maxlength="200" placeholder="Optional message to recipient" style="width:100%;box-sizing:border-box" />
              </div>
              <button id="trade-submit" class="primary-btn">Send Trade Offer</button>
              <div id="trade-result" style="font-size:0.85rem;margin-top:4px"></div>
            </div>
          </div>
        </div>
      </div>`;

    // Tab switching
    document.querySelectorAll(".nft-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".nft-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const name = tab.dataset.tab;
        ["collection","inbox","sent","create"].forEach((t) => {
          document.getElementById(`nft-tab-${t}`).style.display = t === name ? "" : "none";
        });
        if (name === "inbox") loadInbox();
        if (name === "sent") loadSent();
        if (name === "collection") loadCollection();
      });
    });

    async function loadCollection() {
      const gridEl = document.getElementById("nft-grid");
      const emptyEl = document.getElementById("nft-empty");
      try {
        const { nfts } = await Api.get("/nfts/collection");
        if (!nfts.length) { gridEl.innerHTML = ""; emptyEl.style.display = ""; return; }
        emptyEl.style.display = "none";
        gridEl.innerHTML = nfts.map((nft) => {
          const color = RARITY_COLOR[nft.rarity] || "#9ca3af";
          return `<div style="background:var(--bg-elev);border:2px solid ${color};border-radius:12px;padding:12px;text-align:center;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''">
            <div style="font-size:2.5rem;margin-bottom:6px">${nft.emoji}</div>
            <div style="font-weight:700;font-size:0.88rem;margin-bottom:2px">${nft.name}</div>
            <div style="font-size:0.72rem;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${RARITY_LABEL[nft.rarity]}</div>
            <div style="font-size:0.72rem;color:var(--text-dim)">${nft.description}</div>
            <div style="font-size:0.65rem;color:var(--text-dim);margin-top:4px">${new Date(nft.mintedAt).toLocaleDateString()}</div>
          </div>`;
        }).join("");
      } catch (e) {
        gridEl.innerHTML = `<div style="color:var(--text-dim)">Failed to load collection</div>`;
      }
    }

    async function loadInbox() {
      const listEl = document.getElementById("nft-inbox-list");
      try {
        const { offers } = await Api.get("/nfts/trade/inbox");
        if (!offers.length) { listEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">No pending trade offers</div>'; return; }
        listEl.innerHTML = offers.map((o) => renderOffer(o, true)).join("");
        listEl.querySelectorAll(".accept-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            try {
              await Api.post(`/nfts/trade/${btn.dataset.id}/accept`, {});
              UI.toast("Trade accepted!", "win");
              loadInbox();
              App.refreshAccount();
            } catch (e) { UI.toast(e.message, "loss"); btn.disabled = false; }
          });
        });
        listEl.querySelectorAll(".decline-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            try {
              await Api.post(`/nfts/trade/${btn.dataset.id}/decline`, {});
              UI.toast("Trade declined", "info");
              loadInbox();
            } catch (e) { UI.toast(e.message, "loss"); btn.disabled = false; }
          });
        });
      } catch (e) {
        listEl.innerHTML = `<div style="color:var(--text-dim)">Failed to load</div>`;
      }
    }

    async function loadSent() {
      const listEl = document.getElementById("nft-sent-list");
      try {
        const { offers } = await Api.get("/nfts/trade/sent");
        if (!offers.length) { listEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">No sent trade offers</div>'; return; }
        listEl.innerHTML = offers.map((o) => renderOffer(o, false)).join("");
        listEl.querySelectorAll(".cancel-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            try {
              await Api.post(`/nfts/trade/${btn.dataset.id}/decline`, {});
              UI.toast("Trade cancelled", "info");
              loadSent();
            } catch (e) { UI.toast(e.message, "loss"); btn.disabled = false; }
          });
        });
      } catch (e) {
        listEl.innerHTML = `<div style="color:var(--text-dim)">Failed to load</div>`;
      }
    }

    function renderOffer(o, isIncoming) {
      const other = isIncoming ? o.from : o.to;
      const statusColor = { pending: "var(--accent)", accepted: "var(--win)", declined: "var(--loss)", cancelled: "var(--text-dim)" }[o.status] || "var(--text-dim)";
      return `<div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-weight:700">${isIncoming ? "From" : "To"}: ${other.username} <span style="font-size:0.75rem;color:var(--text-dim)">(${other.rank})</span></div>
          <span style="font-size:0.75rem;font-weight:700;color:${statusColor};text-transform:uppercase">${o.status}</span>
        </div>
        <div style="font-size:0.83rem;color:var(--text-dim)">
          ${o.offeredChips ? `Offering: <span style="color:var(--gold)">${(o.offeredChips/100).toLocaleString()} 🪙</span> · ` : ""}
          ${o.requestedChips ? `Wants: <span style="color:var(--gold)">${(o.requestedChips/100).toLocaleString()} 🪙</span>` : ""}
          ${o.message ? `<div style="margin-top:4px;font-style:italic">"${o.message}"</div>` : ""}
        </div>
        ${o.status === "pending" ? `<div style="display:flex;gap:6px;margin-top:8px">
          ${isIncoming ? `<button class="primary-btn accept-btn" data-id="${o.id}" style="flex:1">Accept</button>` : ""}
          <button class="secondary-btn ${isIncoming ? "decline-btn" : "cancel-btn"}" data-id="${o.id}" style="flex:1">${isIncoming ? "Decline" : "Cancel"}</button>
        </div>` : ""}
      </div>`;
    }

    const tradeSubmit = document.getElementById("trade-submit");
    const tradeResult = document.getElementById("trade-result");

    tradeSubmit.addEventListener("click", async () => {
      const toUsername = document.getElementById("trade-to").value.trim();
      const offeredChips = Math.round(Number(document.getElementById("trade-offer-chips").value) * 100);
      const requestedChips = Math.round(Number(document.getElementById("trade-req-chips").value) * 100);
      const message = document.getElementById("trade-msg").value.trim();

      if (!toUsername) return UI.toast("Enter a username", "loss");
      tradeSubmit.disabled = true;
      try {
        await Api.post("/nfts/trade/offer", { toUsername, offeredChips, requestedChips, message: message || undefined });
        tradeResult.style.color = "var(--win)";
        tradeResult.textContent = "✅ Trade offer sent!";
        document.getElementById("trade-to").value = "";
        document.getElementById("trade-offer-chips").value = "0";
        document.getElementById("trade-req-chips").value = "0";
        document.getElementById("trade-msg").value = "";
      } catch (e) {
        tradeResult.style.color = "var(--loss)";
        tradeResult.textContent = e.message;
      }
      tradeSubmit.disabled = false;
    });

    loadCollection();
  }

  return { render };
})();
