/* Shared rendering helpers used by every game module. */
const UI = (() => {
  const SUIT_RED = new Set(["♥", "♦"]);
  const SYMBOL_GLYPH = {
    wild: "🌟", scatter: "🎁", crown: "👑", gem: "💎", bell: "🔔",
    clover: "🍀", horseshoe: "🧲", ace: "🅰️", king: "🇰", queen: "🇶",
  };

  function money(cents) {
    const abs = Math.abs(cents) / 100;
    const sign = cents < 0 ? "-" : "";
    const formatted = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
    return `${sign}${formatted} 🪙`;
  }

  function toast(message, kind = "info") {
    const stack = document.getElementById("toast-stack");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s";
      setTimeout(() => el.remove(), 300);
    }, 3800);
  }

  function setBalance(cents) {
    const chips = Math.floor(cents / 100);
    document.getElementById("balance-amount").textContent = chips.toLocaleString();
  }

  function setLevel(level, xp) {
    document.getElementById("user-level").textContent = level;
    // XP curve mirrors the backend: level N needs N*1000 cumulative XP.
    let remaining = xp;
    let threshold = 1000;
    let lvl = 1;
    while (remaining >= threshold) {
      remaining -= threshold;
      lvl += 1;
      threshold = lvl * 1000;
    }
    const pct = Math.min(100, Math.round((remaining / threshold) * 100));
    document.getElementById("xp-fill").style.width = `${pct}%`;
  }

  function applyAccountUpdate(state, patch) {
    if (patch.balance !== undefined) {
      state.balance = patch.balance;
      setBalance(state.balance);
    }
    if (patch.bank !== undefined) state.bank = patch.bank;
    if (patch.level !== undefined || patch.xp !== undefined) {
      state.level = patch.level ?? state.level;
      state.xp = patch.xp ?? state.xp;
      setLevel(state.level, state.xp);
    }
    if (patch.leveledUp) toast(`🎉 Level up! You're now level ${state.level} (+${money(state.level * 500)} bonus)`, "win");
  }

  function cardLabel(card) {
    return { rank: card.rank, suit: card.suit, red: SUIT_RED.has(card.suit) };
  }

  function renderCard(card, faceDown = false) {
    if (faceDown) return `<div class="card hidden-card">??</div>`;
    const red = SUIT_RED.has(card.suit) ? "red-suit" : "";
    return `<div class="card ${red}">${card.rank}<span>${card.suit}</span></div>`;
  }

  function symbolGlyph(symbol) {
    return SYMBOL_GLYPH[symbol] || "❓";
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of [].concat(children)) {
      if (child == null) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function fairnessLine(fairness) {
    if (!fairness) return "";
    const nonceBit = fairness.nonce !== undefined ? ` · nonce <code>${fairness.nonce}</code>` : "";
    return `<div class="fairness-line">🔒 Provably fair — server seed hash <code>${fairness.serverSeedHash || fairness.activeServerSeedHash}</code>
      · client seed <code>${fairness.clientSeed}</code>${nonceBit}</div>`;
  }

  return { money, toast, setBalance, setLevel, applyAccountUpdate, renderCard, cardLabel, symbolGlyph, el, fairnessLine };
})();
