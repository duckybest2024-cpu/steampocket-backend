const ChipShopGame = (() => {
  const PACKAGES = [
    { id: "starter",    chips: 100,   priceCents: 100,  name: "Starter Pack",  emoji: "🟡", badge: "Intro",      saving: null },
    { id: "regular",    chips: 500,   priceCents: 400,  name: "Regular Pack",  emoji: "🔴", badge: "20% off",    saving: "save $1" },
    { id: "pro",        chips: 1000,  priceCents: 700,  name: "Pro Pack",      emoji: "💜", badge: "30% off",    saving: "save $3" },
    { id: "highroller", chips: 5000,  priceCents: 3000, name: "High Roller",   emoji: "⚫", badge: "Best value", saving: "save $20" },
  ];

  function usd(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function render(container, accountState) {
    function rebuild() {
      const gameChips = Math.floor(accountState.balance / 100);
      const bankChips = Math.floor((accountState.bank || 0) / 100);

      container.innerHTML = `
        <div class="game-panel">
          <div class="game-header">
            <h2>🏦 Chip Cage</h2>
            <p>Buy chips with a card (test mode — use card <code>4242 4242 4242 4242</code>), or move chips between your bank and table.</p>
          </div>

          ${gameChips <= 10 ? `
          <div class="chip-section" style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.4);border-radius:12px;padding:18px;margin-bottom:4px;">
            <h3 style="margin:0 0 8px;color:#fbbf24;">⚡ You're almost out of chips!</h3>
            <p class="chip-section-hint" style="margin:0 0 12px;">Claim 20 free emergency chips to keep playing. Available once every 24 hours.</p>
            <div class="btn-row">
              <button id="free-chips-btn" class="primary-btn">Get 20 Free Chips</button>
            </div>
          </div>` : ""}

          <div class="chip-balances">
            <div class="chip-bal-card playing">
              <div class="cbc-label">Playing Chips</div>
              <div class="cbc-amount">${gameChips.toLocaleString()} 🪙</div>
              <div class="cbc-hint">On the table</div>
            </div>
            <div class="chip-bal-card bank">
              <div class="cbc-label">Bank</div>
              <div class="cbc-amount">${bankChips.toLocaleString()} 🏦</div>
              <div class="cbc-hint">Safe from losses</div>
            </div>
          </div>

          <!-- LiqPay card purchase -->
          <div class="chip-section stripe-section">
            <div class="stripe-header">
              <h3>💳 Buy Chips with Card</h3>
              <span class="stripe-badge" style="background:rgba(0,160,255,0.15);color:#40b3ff;border-color:rgba(0,160,255,0.4)">LiqPay</span>
            </div>
            <p class="chip-section-hint">
              Pay securely via LiqPay — Visa, Mastercard, and Ukrainian cards accepted.
              Chips are credited instantly after payment is confirmed.
            </p>
            <div class="buy-packages">
              ${PACKAGES.map(p => `
                <div class="chip-pkg" data-id="${p.id}">
                  <div class="pkg-top">
                    <span class="pkg-emoji">${p.emoji}</span>
                    ${p.saving ? `<span class="pkg-saving">${p.saving}</span>` : ""}
                  </div>
                  <div class="pkg-name">${p.name}</div>
                  <div class="pkg-chips">${p.chips.toLocaleString()} 🪙</div>
                  <div class="pkg-price">${usd(p.priceCents)}</div>
                  <button class="liqpay-buy-btn" data-id="${p.id}">Buy now</button>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Cash out to bank -->
          <div class="chip-section cashout-section">
            <h3>💰 Cash Out to Bank</h3>
            <p class="chip-section-hint">Lock your chips in the bank — safe from bets. Buy them back any time.</p>
            ${gameChips === 0 ? `<p class="chip-empty-hint">No chips on the table to cash out.</p>` : `
              <div class="cashout-preview">
                <div class="cashout-row"><span>Playing chips</span><span>${gameChips.toLocaleString()} 🪙</span></div>
                <div class="cashout-row total"><span>Moves to bank</span><span class="co-green">${gameChips.toLocaleString()} 🏦</span></div>
              </div>
              <div class="btn-row" style="margin-top:12px">
                <button id="cashout-btn" class="danger-btn">Cash Out All</button>
              </div>
            `}
          </div>

          <!-- Buy from bank -->
          ${bankChips > 0 ? `
          <div class="chip-section">
            <h3>🏦 Move from Bank to Table</h3>
            <p class="chip-section-hint">You have ${bankChips.toLocaleString()} chips in the bank.</p>
            <div class="controls-row">
              <div class="field">
                <label>Amount (chips)</label>
                <input type="number" id="buy-from-bank" min="1" max="${bankChips}" value="${Math.min(bankChips, 100)}" />
              </div>
              <div class="btn-row" style="align-items:flex-end">
                <button id="bank-to-table-btn" class="primary-btn">Move to Table</button>
              </div>
            </div>
          </div>` : ""}

          <!-- Free chips faucet -->
          <div class="chip-section">
            <h3>🚰 Free Chips</h3>
            <p class="chip-section-hint">Get 500 free chips if your playing balance drops below 500.</p>
            <div class="btn-row">
              <button id="faucet-shop-btn" class="secondary-btn" ${gameChips >= 500 ? "disabled" : ""}>
                Get 500 Free Chips
              </button>
            </div>
          </div>

          <!-- Promo code -->
          <div class="chip-section">
            <h3>🎫 Promo Code</h3>
            <p class="chip-section-hint">Have a promo code? Enter it below to claim free chips.</p>
            <div class="controls-row">
              <div class="field">
                <label>Promo Code</label>
                <input type="text" id="promo-code-input" placeholder="EXAMPLE2024" style="text-transform:uppercase" />
              </div>
              <div class="btn-row" style="align-items:flex-end">
                <button id="promo-redeem-btn" class="primary-btn">Redeem</button>
              </div>
            </div>
            <div id="promo-result" style="font-size:0.85rem;margin-top:8px"></div>
          </div>
        </div>
      `;

      // LiqPay buy buttons — get signed payload from server, then submit form to LiqPay
      container.querySelectorAll(".liqpay-buy-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pkgId = btn.dataset.id;
          btn.disabled = true;
          btn.textContent = "Loading…";
          try {
            const { data, signature, checkoutUrl } = await Api.post("/wallet/liqpay-checkout", { packageId: pkgId });
            // Submit form to LiqPay's hosted checkout page
            const form = document.createElement("form");
            form.method = "POST";
            form.action = checkoutUrl;
            form.style.display = "none";
            [["data", data], ["signature", signature]].forEach(([name, value]) => {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = value;
              form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();
          } catch (err) {
            UI.toast(err.message || "Payment unavailable — add LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY to env", "loss");
            btn.disabled = false;
            btn.textContent = "Buy now";
          }
        });
      });

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
            UI.toast(`${Math.floor(res.cashedOut / 100)} chips moved to bank!`, "win");
            rebuild();
          } catch (err) {
            UI.toast(err.message, "loss");
            cashoutBtn.disabled = false;
          }
        });
      }

      // Bank → table
      const b2tBtn = container.querySelector("#bank-to-table-btn");
      if (b2tBtn) {
        b2tBtn.addEventListener("click", async () => {
          const chips = Math.round(Number(container.querySelector("#buy-from-bank").value));
          if (!chips || chips <= 0) return;
          b2tBtn.disabled = true;
          try {
            const res = await Api.post("/wallet/buy-chips", { amount: chips * 100 });
            accountState.balance = res.balance;
            accountState.bank = res.bank;
            UI.setBalance(res.balance);
            UI.toast(`${chips} chips moved to table!`, "win");
            rebuild();
          } catch (err) {
            UI.toast(err.message, "loss");
            b2tBtn.disabled = false;
          }
        });
      }

      // Emergency free chips (≤10 chips)
      const freeChipsBtn = container.querySelector("#free-chips-btn");
      if (freeChipsBtn) {
        freeChipsBtn.addEventListener("click", async () => {
          freeChipsBtn.disabled = true;
          freeChipsBtn.textContent = "Claiming…";
          try {
            const res = await Api.post("/wallet/free-chips", {});
            accountState.balance = res.balance;
            UI.setBalance(res.balance);
            UI.toast("🎁 Got 20 free chips! Good luck!", "win");
            rebuild();
          } catch (err) {
            UI.toast(err.message || "Could not claim free chips.", "loss");
            freeChipsBtn.disabled = false;
            freeChipsBtn.textContent = "Get 20 Free Chips";
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

      // Promo code redemption
      const promoInput = container.querySelector("#promo-code-input");
      const promoRedeemBtn = container.querySelector("#promo-redeem-btn");
      const promoResult = container.querySelector("#promo-result");
      if (promoInput) {
        promoInput.addEventListener("input", () => {
          promoInput.value = promoInput.value.toUpperCase();
        });
      }
      if (promoRedeemBtn) {
        promoRedeemBtn.addEventListener("click", async () => {
          const code = (promoInput ? promoInput.value.trim().toUpperCase() : "");
          if (!code) {
            if (promoResult) { promoResult.style.color = "var(--loss)"; promoResult.textContent = "Enter a promo code."; }
            return;
          }
          promoRedeemBtn.disabled = true;
          promoRedeemBtn.textContent = "Redeeming…";
          if (promoResult) promoResult.textContent = "";
          try {
            const res = await Api.post("/wallet/promo/redeem", { code });
            if (promoResult) {
              promoResult.style.color = "var(--win)";
              promoResult.textContent = res.message || `Redeemed! ${Math.floor((res.chips || 0) / 100)} chips added.`;
            }
            accountState.balance = res.balance;
            UI.setBalance(res.balance);
            UI.toast(res.message || "Promo code redeemed!", "win");
            if (typeof App !== "undefined" && App.refreshAccount) App.refreshAccount();
            rebuild();
          } catch (err) {
            if (promoResult) {
              promoResult.style.color = "var(--loss)";
              promoResult.textContent = err.message || "Failed to redeem code.";
            }
            UI.toast(err.message || "Failed to redeem.", "loss");
            promoRedeemBtn.disabled = false;
            promoRedeemBtn.textContent = "Redeem";
          }
        });
      }
    }

    rebuild();
  }

  return { render };
})();
