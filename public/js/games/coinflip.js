const CoinflipGame = (() => {
  function fmtChips(cents) {
    return (Math.floor(cents / 100)).toLocaleString() + " 🪙";
  }

  function render(container, accountState) {
    let socket = null;
    let myChallengeId = null;
    let challenges = [];
    let recentResults = [];

    container.innerHTML = `
      <div class="game-layout">
        <aside class="bet-panel">
          <div class="bp-tabs">
            <button class="bp-tab active">Manual</button>
            <button class="bp-tab">Auto</button>
          </div>
          <div>
            <div class="bp-label">Bet Amount (chips)</div>
            <div class="bp-input-row">
              <input type="number" id="cf-amount" value="10" min="1" step="1" />
              <button id="cf-half" class="quick-btn">½</button>
              <button id="cf-dbl" class="quick-btn">2×</button>
            </div>
          </div>
          <div style="font-size:0.82rem;color:var(--text-dim);line-height:1.5">
            Create a challenge and wait for another player to join. Winner takes <strong style="color:var(--win)">1.98×</strong> the bet. You can cancel before someone joins.
          </div>
          <hr class="bp-divider" />
          <div id="cf-status" style="font-size:0.8rem;color:var(--text-dim)">Connecting…</div>
          <button id="cf-create-btn" class="play-btn" disabled>Connecting…</button>
          <button id="cf-cancel-btn" class="play-btn danger" style="display:none">Cancel My Challenge</button>
          <div id="cf-result" class="result-banner"></div>
        </aside>
        <div class="game-canvas">
          <div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:10px">Open Challenges (<span id="cf-challenge-count">0</span>)</div>
            <div id="cf-challenges-list"></div>
          </div>
          <div style="background:var(--bg-elev);border:1px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:10px">Recent Results</div>
            <div id="cf-results-list"></div>
          </div>
        </div>
      </div>`;

    const els = {
      status:         container.querySelector("#cf-status"),
      amount:         container.querySelector("#cf-amount"),
      half:           container.querySelector("#cf-half"),
      dbl:            container.querySelector("#cf-dbl"),
      createBtn:      container.querySelector("#cf-create-btn"),
      cancelBtn:      container.querySelector("#cf-cancel-btn"),
      result:         container.querySelector("#cf-result"),
      challengeCount: container.querySelector("#cf-challenge-count"),
      challengesList: container.querySelector("#cf-challenges-list"),
      resultsList:    container.querySelector("#cf-results-list"),
    };

    els.half.addEventListener("click", () => {
      els.amount.value = Math.max(1, Math.floor(Number(els.amount.value) * 0.5));
    });
    els.dbl.addEventListener("click", () => {
      els.amount.value = Math.floor(Number(els.amount.value) * 2);
    });
    container.querySelectorAll(".bp-tab").forEach(t =>
      t.addEventListener("click", function() {
        container.querySelectorAll(".bp-tab").forEach(x => x.classList.remove("active"));
        this.classList.add("active");
      })
    );

    function setStatus(text) {
      if (els.status) els.status.textContent = text;
    }

    function renderChallenges() {
      if (!els.challengesList) return;
      els.challengeCount.textContent = String(challenges.length);
      if (!challenges.length) {
        els.challengesList.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:16px 0">No open challenges — be the first!</div>`;
        return;
      }
      els.challengesList.innerHTML = challenges.map(c => {
        const isMine = c.id === myChallengeId;
        const isMe = c.creatorName === accountState.username;
        const nameTag = isMe
          ? `<strong style="color:var(--accent-2)">${c.creatorName} (you)</strong>`
          : `<strong>${c.creatorName}</strong>`;
        const actionBtn = isMine
          ? `<button class="cf-cancel-inline quick-btn" data-id="${c.id}" style="color:var(--loss);border-color:rgba(248,113,113,0.5)">Cancel</button>`
          : `<button class="cf-join-btn" data-id="${c.id}" style="background:linear-gradient(135deg,#34d399,#10b981);color:#071a10;border:none;border-radius:8px;padding:7px 16px;font-weight:700;font-size:0.82rem;cursor:pointer">Join</button>`;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;font-size:0.88rem">${nameTag} · ${fmtChips(c.amount)}</div>
          ${actionBtn}
        </div>`;
      }).join("");

      els.challengesList.querySelectorAll(".cf-join-btn").forEach(btn => {
        btn.addEventListener("click", () => joinChallenge(btn.dataset.id));
      });
      els.challengesList.querySelectorAll(".cf-cancel-inline").forEach(btn => {
        btn.addEventListener("click", () => cancelChallenge(btn.dataset.id));
      });
    }

    function renderResults() {
      if (!els.resultsList) return;
      if (!recentResults.length) {
        els.resultsList.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:12px 0">No flips yet.</div>`;
        return;
      }
      els.resultsList.innerHTML = recentResults.slice(0, 10).map(r => {
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem">
          <span style="flex:1">${r.creatorName} vs ${r.joinerName} · ${fmtChips(r.amount)}</span>
          <span style="color:var(--win);font-weight:800">🏆 ${r.winnerName}</span>
        </div>`;
      }).join("");
    }

    function setMyChallenge(id) {
      myChallengeId = id;
      if (id) {
        els.createBtn.style.display = "none";
        els.cancelBtn.style.display = "";
      } else {
        els.createBtn.style.display = "";
        els.cancelBtn.style.display = "none";
      }
    }

    function showResult(text, type) {
      if (!els.result) return;
      els.result.className = `result-banner ${type}`;
      els.result.textContent = text;
    }

    function createChallenge() {
      const chips = Number(els.amount.value);
      if (!chips || chips <= 0) { UI.toast("Enter a bet amount.", "loss"); return; }
      const amount = Math.round(chips * 100);
      els.createBtn.disabled = true;
      socket.emit("create_challenge", { amount }, (resp) => {
        els.createBtn.disabled = false;
        if (resp?.error) { UI.toast(resp.error, "loss"); return; }
        setMyChallenge(resp.challengeId);
        UI.toast("Challenge created! Waiting for opponent…", "info");
      });
    }

    function cancelChallenge(id) {
      const cid = id || myChallengeId;
      if (!cid) return;
      els.cancelBtn.disabled = true;
      socket.emit("cancel_challenge", { challengeId: cid }, (resp) => {
        els.cancelBtn.disabled = false;
        if (resp?.error) { UI.toast(resp.error, "loss"); return; }
        setMyChallenge(null);
        App.refreshAccount();
        UI.toast("Challenge cancelled. Chips refunded.", "info");
      });
    }

    function joinChallenge(id) {
      socket.emit("join_challenge", { challengeId: id }, (resp) => {
        if (resp?.error) { UI.toast(resp.error, "loss"); return; }
        const won = resp.winnerName === accountState.username;
        App.refreshAccount();
        if (won) {
          showResult(`🏆 You won! +${fmtChips(resp.payout)}`, "win");
          UI.toast(`Coinflip: You beat ${resp.creatorName}! +${fmtChips(resp.payout)}`, "win");
        } else {
          showResult(`💀 You lost. ${resp.winnerName} wins this flip.`, "loss");
          UI.toast(`Coinflip: ${resp.winnerName} wins this one.`, "loss");
        }
      });
    }

    els.createBtn.addEventListener("click", createChallenge);
    els.cancelBtn.addEventListener("click", () => cancelChallenge(null));

    const token = Api.getToken ? Api.getToken() : null;
    socket = io("/coinflip", { auth: { token } });

    socket.on("connect", () => setStatus("Connected · Real-time updates active"));
    socket.on("disconnect", () => setStatus("Disconnected — reconnecting…"));

    socket.on("state", (data) => {
      challenges = data.challenges || [];
      recentResults = data.recentResults || [];
      renderChallenges();
      renderResults();
      els.createBtn.disabled = false;
      els.createBtn.textContent = "Create Challenge";
    });

    socket.on("challenge_created", (c) => {
      challenges = challenges.filter(x => x.id !== c.id);
      challenges.unshift(c);
      renderChallenges();
    });

    socket.on("challenge_cancelled", ({ id }) => {
      challenges = challenges.filter(c => c.id !== id);
      if (myChallengeId === id) setMyChallenge(null);
      renderChallenges();
    });

    socket.on("challenge_result", (r) => {
      challenges = challenges.filter(c => c.id !== r.id);
      renderChallenges();

      recentResults.unshift({
        id: r.id,
        creatorName: r.creatorName,
        joinerName: r.joinerName,
        winnerName: r.winnerName,
        amount: r.amount,
        serverSeedHash: r.serverSeedHash,
        createdAt: Date.now(),
      });
      recentResults = recentResults.slice(0, 20);
      renderResults();

      if (myChallengeId === r.id) {
        setMyChallenge(null);
        App.refreshAccount();
        const won = r.winnerName === accountState.username;
        if (won) {
          showResult(`🏆 ${r.joinerName} joined your challenge — you won! +${fmtChips(r.payout)}`, "win");
          UI.toast(`Coinflip: You beat ${r.joinerName}! +${fmtChips(r.payout)}`, "win");
        } else {
          showResult(`💀 ${r.joinerName} joined your challenge and won.`, "loss");
          UI.toast(`Coinflip: ${r.joinerName} beat you.`, "loss");
        }
      }
    });

    return () => {
      if (socket) { socket.disconnect(); socket = null; }
    };
  }

  return { render };
})();
