/* App shell: auth flow, navigation between games, shared account state. */
const App = (() => {
  const state = { id: null, username: null, nickname: null, rank: "bronze", balance: 0, bank: 0, level: 1, xp: 0, fairness: null };

  const GAMES = [
    { key: "crash", label: "🚀 Crash", mod: () => CrashGame },
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
    if (state.username === "Ditol21") {
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
    return user;
  }

  async function enterApp() {
    showScreen("app");
    buildNav();
    await refreshAccount();

    // Handle redirect back from Stripe Checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      history.replaceState({}, "", "/");
      // Balance was updated by webhook; refresh to show new chips
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
      });
    });

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(loginForm);
      try {
        const { token } = await Api.login({ identifier: fd.get("identifier"), password: fd.get("password") });
        Api.setToken(token);
        await enterApp();
      } catch (err) {
        showError(err.message);
      }
    });

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(registerForm);
      try {
        const { token } = await Api.register({
          username: fd.get("username"),
          email: fd.get("email"),
          password: fd.get("password"),
        });
        Api.setToken(token);
        UI.toast("Welcome! $1,000 has been added to your balance.", "win");
        await enterApp();
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
