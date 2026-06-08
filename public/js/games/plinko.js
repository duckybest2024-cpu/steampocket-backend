const PlinkoGame = (() => {
  function render(container, accountState) {
    let risk = "medium";
    let rows = 12;
    let busy = false;

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>🔵 Plinko</h2>
          <p>Drop a ball through a peg board — every bounce is an independent 50/50, so where it lands follows a real binomial distribution. Edges pay big, the middle pays small.</p>
        </div>

        <div class="plinko-board" id="plinko-board"></div>
        <div class="plinko-slots" id="plinko-slots"></div>

        <div class="controls-row" style="margin-top:18px">
          <div class="field">
            <label>Bet amount ($)</label>
            <input type="number" id="plinko-amount" value="10" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Risk</label>
            <select id="plinko-risk">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="field">
            <label>Rows</label>
            <select id="plinko-rows">
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12" selected>12</option>
              <option value="14">14</option>
              <option value="16">16</option>
            </select>
          </div>
          <div class="btn-row">
            <button id="plinko-drop" class="primary-btn">Drop ball</button>
          </div>
        </div>

        <div id="plinko-result" class="result-banner"></div>
        <div id="plinko-fairness"></div>
      </div>
    `;

    const els = {
      board: container.querySelector("#plinko-board"),
      slots: container.querySelector("#plinko-slots"),
      amount: container.querySelector("#plinko-amount"),
      riskSel: container.querySelector("#plinko-risk"),
      rowsSel: container.querySelector("#plinko-rows"),
      drop: container.querySelector("#plinko-drop"),
      result: container.querySelector("#plinko-result"),
      fairness: container.querySelector("#plinko-fairness"),
    };

    function buildBoard() {
      els.board.innerHTML = "";
      const w = els.board.clientWidth || 600;
      const h = els.board.clientHeight || 360;
      const topPad = 30;
      const bottomPad = 50;

      for (let r = 0; r < rows; r++) {
        const pegCount = r + 3;
        const y = topPad + (r / (rows - 1)) * (h - topPad - bottomPad);
        for (let c = 0; c < pegCount; c++) {
          const x = (w / 2) + (c - (pegCount - 1) / 2) * (w / (rows + 3));
          const peg = UI.el("div", { class: "peg" });
          peg.style.left = `${x - 3}px`;
          peg.style.top = `${y - 3}px`;
          els.board.appendChild(peg);
        }
      }

      const ball = UI.el("div", { class: "plinko-ball", id: "plinko-ball" });
      ball.style.left = `${w / 2 - 7}px`;
      ball.style.top = `${topPad - 16}px`;
      ball.style.display = "none";
      els.board.appendChild(ball);
    }

    function buildSlots(table) {
      els.slots.style.gridTemplateColumns = `repeat(${table.length}, 1fr)`;
      els.slots.innerHTML = "";
      table.forEach((mult) => {
        const slot = UI.el("div", { class: "plinko-slot" }, `${mult}x`);
        els.slots.appendChild(slot);
      });
    }

    const TABLES = {
      // Mirrors src/games/plinko.ts — used purely so the slot row can render before the first drop.
      low: { 8: [5.6,2.1,1.1,1,0.5,1,1.1,2.1,5.6], 10:[8.9,3,1.4,1.1,1,0.5,1,1.1,1.4,3,8.9], 12:[10,3,1.6,1.4,1.1,1,0.5,1,1.1,1.4,1.6,3,10], 14:[15,4,1.9,1.4,1.1,1,0.7,0.5,0.7,1,1.1,1.4,1.9,4,15], 16:[16,9,2,1.4,1.4,1.2,1.1,1,0.5,1,1.1,1.2,1.4,1.4,2,9,16] },
      medium: { 8:[13,3,1.3,0.7,0.4,0.7,1.3,3,13], 10:[22,5,2,1.4,0.6,0.4,0.6,1.4,2,5,22], 12:[33,11,4,2,1.1,0.6,0.3,0.6,1.1,2,4,11,33], 14:[58,15,7,4,1.9,1,0.5,0.2,0.5,1,1.9,4,7,15,58], 16:[110,41,10,5,3,1.5,1,0.5,0.3,0.5,1,1.5,3,5,10,41,110] },
      high: { 8:[29,4,1.5,0.3,0.2,0.3,1.5,4,29], 10:[76,10,3,0.9,0.3,0.2,0.3,0.9,3,10,76], 12:[170,24,8.1,2,0.7,0.2,0.2,0.2,0.7,2,8.1,24,170], 14:[420,56,18,5,1.9,0.3,0.2,0.2,0.2,0.3,1.9,5,18,56,420], 16:[1000,130,26,9,4,2,0.2,0.2,0.2,0.2,0.2,2,4,9,26,130,1000] },
    };

    function refreshLayout() {
      buildBoard();
      buildSlots(TABLES[risk][rows]);
    }

    els.riskSel.addEventListener("change", () => { risk = els.riskSel.value; refreshLayout(); });
    els.rowsSel.addEventListener("change", () => { rows = Number(els.rowsSel.value); refreshLayout(); });
    window.addEventListener("resize", refreshLayout);

    async function animateDrop(path, slot) {
      const ball = els.board.querySelector("#plinko-ball");
      const w = els.board.clientWidth || 600;
      const h = els.board.clientHeight || 360;
      const topPad = 30;
      const bottomPad = 50;

      ball.style.display = "block";
      ball.style.transition = "none";
      ball.style.left = `${w / 2 - 7}px`;
      ball.style.top = `${topPad - 16}px`;
      // Force layout so the next transition actually animates from this start point.
      void ball.offsetHeight;
      ball.style.transition = "left 0.28s ease, top 0.28s ease";

      let x = w / 2;
      for (let r = 0; r < path.length; r++) {
        const bounce = path[r];
        const spread = w / (rows + 3);
        x += bounce === 1 ? spread / 2 : -spread / 2;
        const y = topPad + ((r + 1) / rows) * (h - topPad - bottomPad);
        ball.style.left = `${x - 7}px`;
        ball.style.top = `${y - 7}px`;
        await sleep(300);
      }

      const slotEl = els.slots.children[slot];
      if (slotEl) slotEl.classList.add("landed");
    }

    function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

    els.drop.addEventListener("click", async () => {
      if (busy) return;
      const dollars = Number(els.amount.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a bet amount.", "loss");

      busy = true;
      els.drop.disabled = true;
      for (const s of els.slots.children) s.classList.remove("landed");
      els.result.className = "result-banner";

      try {
        const res = await Api.post("/games/plinko", { amount: Math.round(dollars * 100), risk, rows });
        const { path, slot } = res.result.state;
        await animateDrop(path, slot);

        const isWin = res.result.result === "win";
        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        els.result.textContent = isWin
          ? `🎉 Landed in the ${res.result.multiplier}x slot — won ${UI.money(res.result.payout)}.`
          : `Landed in the ${res.result.multiplier}x slot — payout ${UI.money(res.result.payout)} on a ${UI.money(Math.round(dollars * 100))} bet.`;

        els.fairness.innerHTML = UI.fairnessLine({
          serverSeedHash: accountState.fairness?.activeServerSeedHash,
          clientSeed: accountState.fairness?.clientSeed,
          nonce: res.nextNonce - 1,
        });

        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Plinko!` : `Plinko paid ${UI.money(res.result.payout)} on a ${UI.money(Math.round(dollars * 100))} bet.`, isWin ? "win" : "info");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        els.drop.disabled = false;
      }
    });

    refreshLayout();
  }

  return { render };
})();
