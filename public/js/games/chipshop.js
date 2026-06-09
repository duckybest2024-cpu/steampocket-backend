const ChipShopGame = (() => {
  const PACKAGES = [
    { chips: 100,   label: "Starter Pack",   desc: "100 chips",   emoji: "🟡" },
    { chips: 500,   label: "Regular Pack",   desc: "500 chips",   emoji: "🔴" },
    { chips: 1000,  label: "Pro Pack",        desc: "1,000 chips", emoji: "💜" },
    { chips: 5000,  label: "High Roller",     desc: "5,000 chips", emoji: "⚫" },
  ];

  function render(container, accountState) {
    function rebuild() {
      const gameChips = Math.floor(accountState.balance / 100);
      const bankChips = Math.floor((accountState.bank || 0) / 100);

      container.innerHTML = `
        <div class="game-panel">
          <div class="game-header">
            <h2>🏦 Chip Cage</h2>
            <p>Exchange between your bank and playing chips. All amounts shown in chips (1 chip = $1).</p>
          </div>

          <div class="chip-balances">
            <div class="chip-bal-card playing">
              <div class="cbc-label">Playing Chips</div>
              <div class="cbc-amount">${gameChips.toLocaleString()} 🪙</div>
              <div class="cbc-hint">In your pocket — bet these</div>
            </div>
            <div class="chip-bal-card bank">
              <div class="cbc-label">Bank</div>
              <div class="cbc-amount">${bankChips.toLocaleString()} 🏦</div>
              <div class="cbc-hint">Safe from the tables</div>
            </div>
          </div>

          <!-- Buy chips from bank -->
          <div class="chip-section">
            <h3>Buy Chips from Bank</h3>
            <p class="chip-section-hint">Move chips from your bank to the table to play games.</p>
            ${bankChips === 0 ? `<p class="chip-empty-hint">Your bank is empty. Cash out winnings first, or use the faucet to get chips directly.</p>` : `
              <div class="buy-packages">
                ${PACKAGES.map(p => `
                  <button class="chip-pkg ${p.chips > bankChips ? "disabled" : ""}" data-chips="${p.chips}" ${p.chips > bankChips ? "disabled" : ""}>
                    <span class="pkg-emoji">${p.emoji}</span>
                    <span class="pkg-label">${p.label}</span>
                    <span class="pkg-desc">${p.desc}</span>
                  </button>
                `).join("")}
              </div>
              <div class="controls-row" style="margin-top:12px">
                <div class="field">
                  <label>Custom amount (chips)</label>
                  <input type="number" id="buy-custom" min="1" max="${bankChips}" value="${Math.min(bankChips, 100)}" />
                </div>
                <div class="btn-row" style="align-items:flex-end">
                  <button id="buy-custom-btn" class="primary-btn">Buy Chips</button>
                </div>
              </div>
            `}
          </div>

          <!-- Cash out playing chips -->
          <div class="chip-section cashout-section">
            <h3>Cash Out to Bank</h3>
            <p class="chip-section-hint">Move your playing chips safely to the bank. You can buy them back any time.</p>
            ${gameChips === 0 ? `<p class="chip-empty-hint">No chips to cash out right now.</p>` : `
              <div class="cashout-preview">
                <div class="cashout-row">
                  <span>Playing chips</span><span class="co-chips">${gameChips.toLocaleString()} 🪙</span>
                </div>
                <div class="cashout-row total">
                  <span>Will be moved to bank</span><span class="co-chips co-green">${gameChips.toLocaleString()} 🏦</span>
                </div>
              </div>
              <div class="btn-row" style="margin-top:14px">
                <button id="cashout-btn" class="danger-btn">💰 Cash Out All Chips</button>
              </div>
            `}
          </div>

          <!-- Faucet -->
          <div class="chip-section">
            <h3>🚰 Free Chips</h3>
            <p class="chip-section-hint">Top up your playing chips for free (available when below 500 chips).</p>
            <div class="btn-row">
              <button id="faucet-shop-btn" class="secondary-btn" ${gameChips >= 500 ? "disabled" : ""}>
                Get 500 Free Chips
              </button>
            </div>
          </div>
        </div>
      `;

      // Buy package buttons
      container.querySelectorAll(".chip-pkg:not(.disabled)").forEach((btn) => {
        btn.addEventListener("click", async () => doBuyChips(Number(btn.dataset.chips)));
      });

      // Custom buy
      const customBtn = container.querySelector("#buy-custom-btn");
      if (customBtn) {
        customBtn.addEventListener("click", async () => {
          const amt = Math.round(Number(container.querySelector("#buy-custom").value));
          if (amt > 0) doBuyChips(amt);
        });
      }

      // Cash out
      const cashoutBtn = container.querySelector("#cashout-btn");
      if (cashoutBtn) {
        cashoutBtn.addEventListener("click", async () => {
          cashoutBtn.disabled = true;
          try {
            const res = await Api.post("/wallet/cashout-chips", {});
            accountState.balance = res.balance;
            accountState.bank = res.bank;
            UI.setBalance(res.balance);
            UI.toast(`Cashed out ${UI.money(res.cashedOut)} to bank!`, "win");
            rebuild();
          } catch (err) {
            UI.toast(err.message, "loss");
            cashoutBtn.disabled = false;
          }
        });
      }

      // Faucet
      const faucetBtn = container.querySelector("#faucet-shop-btn");
      if (faucetBtn) {
        faucetBtn.addEventListener("click", async () => {
          faucetBtn.disabled = true;
          try {
            const res = await Api.post("/wallet/faucet", { amount: 50000 });
            accountState.balance = res.balance;
            UI.setBalance(res.balance);
            UI.toast("Got 500 free chips!", "win");
            rebuild();
          } catch (err) {
            UI.toast(err.message, "loss");
            faucetBtn.disabled = false;
          }
        });
      }
    }

    async function doBuyChips(chips) {
      const amount = chips * 100; // chips → cents
      try {
        const res = await Api.post("/wallet/buy-chips", { amount });
        accountState.balance = res.balance;
        accountState.bank = res.bank;
        UI.setBalance(res.balance);
        UI.toast(`Bought ${chips} chips from bank!`, "win");
        rebuild();
      } catch (err) {
        UI.toast(err.message, "loss");
      }
    }

    rebuild();
  }

  return { render };
})();
