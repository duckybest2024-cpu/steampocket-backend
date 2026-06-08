const RouletteGame = (() => {
  const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const colorOf = (n) => (n === 0 ? "green" : RED.has(n) ? "red" : "black");

  function render(container, accountState) {
    // Selection model: a Map from a stable key -> { type, numbers?, group?, label, amount }
    const selections = new Map();
    let busy = false;

    container.innerHTML = `
      <div class="game-panel">
        <div class="game-header">
          <h2>🎡 Roulette</h2>
          <p>European single-zero wheel. Click numbers for straight-up bets, or use the outside bets below — stake is split evenly across every selection you make.</p>
        </div>

        <div class="roulette-board" id="roulette-numbers"></div>
        <div class="outside-bets" id="roulette-outside"></div>

        <div class="controls-row" style="margin-top:18px">
          <div class="field">
            <label>Total stake ($)</label>
            <input type="number" id="roulette-amount" value="10" min="0.01" step="0.01" />
          </div>
          <div class="btn-row">
            <button id="roulette-clear" class="secondary-btn">Clear bets</button>
            <button id="roulette-spin" class="primary-btn">Spin</button>
          </div>
        </div>
        <p id="roulette-summary" style="color:var(--text-dim); font-size:0.85rem">No bets selected yet — click numbers or outside bets above.</p>

        <div class="wheel-result hidden" id="roulette-wheel-result">
          <div class="pocket-badge" id="roulette-pocket">--</div>
          <div>
            <div id="roulette-pocket-label" style="font-weight:700"></div>
            <div id="roulette-pocket-sub" style="color:var(--text-dim); font-size:0.85rem"></div>
          </div>
        </div>

        <div id="roulette-result" class="result-banner"></div>
        <div id="roulette-fairness"></div>
      </div>
    `;

    const els = {
      numbers: container.querySelector("#roulette-numbers"),
      outside: container.querySelector("#roulette-outside"),
      amount: container.querySelector("#roulette-amount"),
      clear: container.querySelector("#roulette-clear"),
      spin: container.querySelector("#roulette-spin"),
      summary: container.querySelector("#roulette-summary"),
      wheelResult: container.querySelector("#roulette-wheel-result"),
      pocket: container.querySelector("#roulette-pocket"),
      pocketLabel: container.querySelector("#roulette-pocket-label"),
      pocketSub: container.querySelector("#roulette-pocket-sub"),
      result: container.querySelector("#roulette-result"),
      fairness: container.querySelector("#roulette-fairness"),
    };

    function buildNumberGrid() {
      els.numbers.innerHTML = "";

      const zeroRow = UI.el("div", { class: "roulette-row", style: "grid-template-columns: 1fr;" });
      zeroRow.appendChild(makeCell(0, "straight"));
      els.numbers.appendChild(zeroRow);

      // Three rows of 12, classic layout: row1 = 3,6,9...36 ; row2 = 2,5,8...35 ; row3 = 1,4,7...34
      for (let row = 0; row < 3; row++) {
        const rowEl = UI.el("div", { class: "roulette-row" });
        for (let col = 0; col < 12; col++) {
          const n = (col * 3) + (3 - row);
          rowEl.appendChild(makeCell(n, "straight"));
        }
        els.numbers.appendChild(rowEl);
      }
    }

    function makeCell(number, type) {
      const cell = UI.el("div", { class: `roulette-cell ${colorOf(number)}` }, String(number));
      cell.dataset.key = `${type}:${number}`;
      cell.addEventListener("click", () => toggleSelection(cell.dataset.key, { type, numbers: [number], label: `Straight up ${number}` }, cell));
      return cell;
    }

    function buildOutsideBets() {
      els.outside.innerHTML = "";
      const groups = [
        { key: "red", type: "red", label: "Red (1:1)" },
        { key: "black", type: "black", label: "Black (1:1)" },
        { key: "even", type: "even", label: "Even (1:1)" },
        { key: "odd", type: "odd", label: "Odd (1:1)" },
        { key: "low", type: "low", label: "1-18 (1:1)" },
        { key: "high", type: "high", label: "19-36 (1:1)" },
        { key: "dozen:1", type: "dozen", group: 1, label: "1st 12 (2:1)" },
        { key: "dozen:2", type: "dozen", group: 2, label: "2nd 12 (2:1)" },
        { key: "dozen:3", type: "dozen", group: 3, label: "3rd 12 (2:1)" },
        { key: "column:1", type: "column", group: 1, label: "Column 1 (2:1)" },
        { key: "column:2", type: "column", group: 2, label: "Column 2 (2:1)" },
        { key: "column:3", type: "column", group: 3, label: "Column 3 (2:1)" },
      ];
      for (const g of groups) {
        const btn = UI.el("button", {}, g.label);
        btn.addEventListener("click", () => toggleSelection(g.key, { type: g.type, group: g.group, label: g.label }, btn));
        els.outside.appendChild(btn);
      }
    }

    function toggleSelection(key, payload, node) {
      if (selections.has(key)) {
        selections.delete(key);
        node.classList.remove("selected");
        node.querySelector(".chip")?.remove();
      } else {
        selections.set(key, { ...payload, node });
        node.classList.add("selected");
      }
      refreshSummary();
    }

    function refreshSummary() {
      // Remove stale chips, then re-render the per-cell stake amounts.
      for (const chip of container.querySelectorAll(".chip")) chip.remove();

      if (selections.size === 0) {
        els.summary.textContent = "No bets selected — click numbers or outside bets above.";
        return;
      }

      const dollars = Number(els.amount.value) || 0;
      const totalCents = Math.round(dollars * 100);
      const each = Math.floor(totalCents / selections.size);

      const labels = [];
      for (const sel of selections.values()) {
        labels.push(`${sel.label} (${UI.money(each)})`);
        sel.node.appendChild(UI.el("span", { class: "chip" }, UI.money(each)));
      }
      els.summary.innerHTML = `<strong>${selections.size}</strong> bet(s), ${UI.money(each)} each — ${UI.money(each * selections.size)} total: ${labels.join(" · ")}`;
    }

    els.amount.addEventListener("input", refreshSummary);

    els.clear.addEventListener("click", () => {
      selections.clear();
      for (const c of els.numbers.querySelectorAll(".roulette-cell.selected")) c.classList.remove("selected");
      for (const b of els.outside.querySelectorAll("button.selected")) b.classList.remove("selected");
      refreshSummary();
    });

    els.spin.addEventListener("click", async () => {
      if (busy) return;
      if (selections.size === 0) return UI.toast("Select at least one bet first.", "loss");
      const dollars = Number(els.amount.value);
      if (!dollars || dollars <= 0) return UI.toast("Enter a stake amount.", "loss");

      const totalCents = Math.round(dollars * 100);
      const each = Math.floor(totalCents / selections.size);
      if (each <= 0) return UI.toast("Stake is too small to split across your selections.", "loss");

      const bets = [...selections.values()].map((sel) => ({
        type: sel.type,
        amount: each,
        ...(sel.numbers ? { numbers: sel.numbers } : {}),
        ...(sel.group ? { group: sel.group } : {}),
      }));

      busy = true;
      els.spin.disabled = true;
      els.wheelResult.classList.add("hidden");
      els.result.className = "result-banner";

      try {
        const res = await Api.post("/games/roulette/spin", { bets });
        const { landed, color, bets: breakdown } = res.result.state;

        els.pocket.textContent = String(landed);
        els.pocket.className = `pocket-badge ${color}`;
        els.pocketLabel.textContent = `Ball landed on ${landed} (${color})`;
        const wins = breakdown.filter((b) => b.won);
        els.pocketSub.textContent = wins.length
          ? `Winning bets: ${wins.map((w) => `${w.type}${w.numbers?.length === 1 ? ` (${w.numbers[0]})` : ""} +${UI.money(w.payout)}`).join(", ")}`
          : "None of your bets covered this number.";
        els.wheelResult.classList.remove("hidden");

        const isWin = res.result.result === "win";
        els.result.className = `result-banner show ${isWin ? "win" : "loss"}`;
        els.result.textContent = isWin
          ? `🎉 The wheel landed on ${landed} — won ${UI.money(res.result.payout)} total.`
          : `The wheel landed on ${landed} — lost ${UI.money(totalCents - res.result.payout)} net.`;

        els.fairness.innerHTML = UI.fairnessLine({
          serverSeedHash: accountState.fairness?.activeServerSeedHash,
          clientSeed: accountState.fairness?.clientSeed,
        });

        UI.applyAccountUpdate(accountState, res);
        UI.toast(isWin ? `Won ${UI.money(res.result.payout)} on Roulette!` : `Lost on Roulette — ball landed on ${landed}.`, isWin ? "win" : "loss");
      } catch (err) {
        UI.toast(err.message, "loss");
      } finally {
        busy = false;
        els.spin.disabled = false;
      }
    });

    buildNumberGrid();
    buildOutsideBets();
    refreshSummary();
  }

  return { render };
})();
