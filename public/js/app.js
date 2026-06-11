/* App shell: auth flow, navigation between games, shared account state. */
const App = (() => {
  const state = { id: null, username: null, nickname: null, rank: "bronze", balance: 0, bank: 0, level: 1, xp: 0, fairness: null };
  let _lowBalanceToastShown = false;

  const GAMES = [
    { key: "crash",    label: "🚀 Crash",    mod: () => CrashGame },
    { key: "coinflip", label: "🪙 Coinflip",  mod: () => CoinflipGame },
    { key: "dice", label: "🎲 Dice", mod: () => DiceGame },
    { key: "limbo", label: "📈 Limbo", mod: () => LimboGame },
    { key: "mines", label: "💣 Mines", mod: () => MinesGame },
    { key: "plinko", label: "🔵 Plinko", mod: () => PlinkoGame },
    { key: "roulette", label: "🎡 Roulette", mod: () => RouletteGame },
    { key: "blackjack", label: "🃏 Blackjack", mod: () => BlackjackGame },
    { key: "slots", label: "🎰 Slots", mod: () => SlotsGame },
    { key: "keno", label: "🎯 Keno", mod: () => KenoGame },
    { key: "wheel", label: "🎡 Wheel", mod: () => WheelGame },
    { key: "baccarat", label: "🎴 Baccarat", mod: () => BaccaratGame },
    { key: "hilo", label: "↕️ Hi-Lo", mod: () => HiloGame },
    { key: "videopoker", label: "🃏 Video Poker", mod: () => VideoPokerGame },
    { key: "chipshop", label: "🏦 Chips", mod: () => ChipShopGame },
    { key: "leaderboard", label: "🏆 Leaderboard", mod: () => LeaderboardGame },
    { key: "friends", label: "👥 Friends", mod: () => FriendsGame },
    { key: "settings", label: "⚙️ Settings", mod: () => SettingsGame },
  ];

  let activeCleanup = null;
  let activeKey = null;

  function showScreen(name) {
    document.getElementById("auth-screen").classList.toggle("hidden", name !== "auth");
    document.getElementById("app-screen").classList.toggle("hidden", name !== "app");
  }

  function buildNav() {
    const nav = document.getElementById("game-nav");
    nav.innerHTML = "";
    const entries = [...GAMES];
    if ((state.username || "").toLowerCase() === "ditol21") {
      entries.push({ key: "admin", label: "⚙️ Admin", mod: () => AdminGame });
    }
    for (const game of entries) {
      const btn = UI.el("button", { onclick: () => mount(game.key) }, game.label);
      btn.dataset.key = game.key;
      nav.appendChild(btn);
    }
  }

  function mount(key) {
    if (activeKey === key) return;
    if (activeCleanup) {
      try { activeCleanup(); } catch { /* ignore */ }
      activeCleanup = null;
    }

    activeKey = key;
    for (const btn of document.querySelectorAll("#game-nav button")) {
      btn.classList.toggle("active", btn.dataset.key === key);
    }

    const container = document.getElementById("game-area");
    container.innerHTML = "";

    const allEntries = [...GAMES, { key: "admin", label: "⚙️ Admin", mod: () => AdminGame }];
    const game = allEntries.find((g) => g.key === key);
    if (!game) return;
    const mod = game.mod();
    activeCleanup = mod.render(container, state) || null;
  }

  async function refreshAccount() {
    const { user } = await Api.me();
    state.id = user.id;
    state.username = user.username;
    state.nickname = user.nickname ?? null;
    state.rank = user.rank ?? "bronze";
    state.balance = user.balance;
    state.bank = user.bank ?? 0;
    state.level = user.level;
    state.xp = user.xp;
    state.fairness = user.fairness;
    UI.setBalance(state.balance);
    UI.setLevel(state.level, state.xp);

    // Nudge low-balance players toward the chip shop (once per session)
    if (state.balance <= 1000 && !_lowBalanceToastShown) {
      _lowBalanceToastShown = true;
      setTimeout(() => {
        UI.toast("⚡ You have 10 chips or fewer — visit 🏦 Chips to claim 20 free chips!", "info");
      }, 800);
    }

    return user;
  }

  async function enterApp() {
    showScreen("app");
    buildNav();
    await refreshAccount();
    buildNav();

    const params = new URLSearchParams(window.location.search);

    // Handle email verification redirect from /auth/verify-email
    if (params.get("emailVerified") === "ok") {
      history.replaceState({}, "", "/");
      UI.toast("✅ Email verified! Welcome to Casino Aurelius.", "win");
    } else if (params.get("emailVerified") === "expired") {
      history.replaceState({}, "", "/");
      UI.toast("⚠️ Verification link expired. Please request a new one.", "info");
    } else if (params.get("emailVerified") === "error") {
      history.replaceState({}, "", "/");
      UI.toast("❌ Invalid verification link.", "loss");
    }

    // Handle redirect back from Stripe Checkout
    if (params.get("checkout") === "success") {
      history.replaceState({}, "", "/");
      await refreshAccount();
      UI.toast("💳 Payment received! Chips added to your account.", "win");
      mount("chipshop");
    } else if (params.get("checkout") === "cancel") {
      history.replaceState({}, "", "/");
      UI.toast("Payment cancelled.", "info");
      mount("chipshop");
    } else {
      mount("crash");
    }
  }

  function showVerifyEmailUI(email, verificationLink) {
    const errorEl = document.getElementById("auth-error");
    errorEl.innerHTML = `
      <div style="text-align:left;line-height:1.7;">
        <strong>📧 One more step — verify your email</strong><br/>
        ${verificationLink
          ? `<a href="${verificationLink}"
               style="display:inline-block;margin:10px 0;background:#6f5cf2;color:white;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
               ✅ Click here to verify your account
             </a><br/>`
          : `A verification link was sent to <strong>${email}</strong>.<br/>`}
        After verifying, come back here and log in.
        <br/><br/>
        <button id="resend-btn" style="background:transparent;border:1px solid rgba(111,92,242,0.5);color:#6f5cf2;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;">
          Get a new verification link
        </button>
        <div id="resend-result" style="margin-top:8px;font-size:0.82rem;"></div>
      </div>`;
    errorEl.classList.remove("hidden");
    errorEl.style.color = "var(--text)";

    document.getElementById("resend-btn").addEventListener("click", async () => {
      const btn = document.getElementById("resend-btn");
      const resultEl = document.getElementById("resend-result");
      btn.disabled = true; btn.textContent = "Getting link…";
      try {
        const data = await Api.post("/auth/resend-verification", { email });
        btn.textContent = "Done!";
        if (data.verificationLink) {
          resultEl.innerHTML = `<a href="${data.verificationLink}"
            style="color:#6f5cf2;font-weight:700;text-decoration:underline;">
            Click here to verify →
          </a>`;
        } else {
          resultEl.textContent = "Link sent! Check your email.";
        }
      } catch (err) {
        btn.textContent = "Get a new verification link";
        btn.disabled = false;
        UI.toast(err.message || "Failed to resend.", "loss");
      }
    });
  }

  function wireAuthForms() {
    const tabs = document.querySelectorAll(".tab");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const errorEl = document.getElementById("auth-error");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const isLogin = tab.dataset.tab === "login";
        loginForm.classList.toggle("hidden", !isLogin);
        registerForm.classList.toggle("hidden", isLogin);
        errorEl.classList.add("hidden");
        errorEl.style.color = "";
      });
    });

    function showError(message) {
      errorEl.innerHTML = "";
      errorEl.textContent = message;
      errorEl.style.color = "";
      errorEl.classList.remove("hidden");
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(loginForm);
      try {
        const data = await Api.login({ identifier: fd.get("identifier"), password: fd.get("password") });
        Api.setToken(data.token);
        await enterApp();
      } catch (err) {
        if (err.emailNotVerified) {
          showVerifyEmailUI(err.email, null);
        } else {
          showError(err.message);
        }
      }
    });

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(registerForm);
      const emailVal = fd.get("email");
      try {
        const data = await Api.register({
          username: fd.get("username"),
          email: emailVal,
          password: fd.get("password"),
        });
        // Registration no longer returns a token — user must verify email first
        if (data.emailSent) {
          showVerifyEmailUI(emailVal, data.verificationLink);
        } else if (data.token) {
          // Legacy path (should not happen with new backend)
          Api.setToken(data.token);
          UI.toast("Welcome! 1,000 chips added to your balance.", "win");
          await enterApp();
        }
      } catch (err) {
        showError(err.message);
      }
    });
  }

  function wireTopbar() {
    document.getElementById("logout-btn").addEventListener("click", () => {
      Api.setToken(null);
      if (activeCleanup) { try { activeCleanup(); } catch { /* ignore */ } }
      activeCleanup = null;
      activeKey = null;
      showScreen("auth");
    });
  }

  async function init() {
    wireAuthForms();
    wireTopbar();

    if (Api.getToken()) {
      try {
        await enterApp();
        return;
      } catch {
        Api.setToken(null);
      }
    }
    showScreen("auth");
  }

  return { state, refreshAccount, init };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
