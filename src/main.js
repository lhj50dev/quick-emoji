const STORAGE_KEYS = {
  recent: "quickEmoji.recent",
  favorites: "quickEmoji.favorites",
  pin: "quickEmoji.pin",
};

const MAX_RECENT = 24;
const SUPPORT_URL = "https://buymeacoffee.com/lhj50dev4";

const FALLBACK_DATA = [
  { emoji: "\u{1F600}", name: "grinning face", keywords: ["grinning", "face"] },
  {
    emoji: "\u{1F604}",
    name: "smiling face with open mouth",
    keywords: ["smile", "face"],
  },
  { emoji: "\u{1F602}", name: "face with tears of joy", keywords: ["joy", "tear"] },
  { emoji: "\u{1F973}", name: "partying face", keywords: ["party"] },
  { emoji: "\u{1F525}", name: "fire", keywords: ["fire"] },
  { emoji: "\u2705", name: "check mark", keywords: ["check"] },
  { emoji: "\u2764\uFE0F", name: "red heart", keywords: ["heart"] },
];

let activeTab = "all";
let recent = loadList(STORAGE_KEYS.recent);
let favorites = loadList(STORAGE_KEYS.favorites);
let emojiData = [];
let isLoading = true;

let grid;
let searchInput;
let clearSearch;
let statusEl;
let toastEl;
let tabs;
let pinToggle;
let supportBtn;

function getAppWindow() {
  return window.__TAURI__?.window?.getCurrentWindow?.() ?? null;
}

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function matchQuery(item, query) {
  if (!query) return true;
  const hay = normalize(`${item.name || ""} ${(item.keywords || []).join(" ")}`);
  return query
    .split(" ")
    .filter((token) => token.length > 0)
    .every((token) => hay.includes(normalize(token)));
}

function getFiltered() {
  const query = searchInput.value.trim();
  let list = emojiData.length ? emojiData : FALLBACK_DATA;

  if (activeTab === "recent") {
    list = recent
      .map((emoji) => emojiData.find((item) => item.emoji === emoji))
      .filter(Boolean);
  }

  if (activeTab === "favorites") {
    list = favorites
      .map((emoji) => emojiData.find((item) => item.emoji === emoji))
      .filter(Boolean);
  }

  return list.filter((item) => matchQuery(item, query));
}

function render() {
  if (!grid) return;
  const list = getFiltered();
  grid.innerHTML = "";

  if (isLoading) {
    grid.innerHTML = `<div class="empty">Loading emoji data...</div>`;
    return;
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty">No results found</div>`;
    return;
  }

  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "emoji-card";

    const btn = document.createElement("button");
    btn.className = "emoji-btn";
    btn.type = "button";
    btn.textContent = item.emoji;
    btn.setAttribute("aria-label", item.name || "emoji");
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleCopy(item);
    });

    const fav = document.createElement("button");
    fav.className = "fav-btn";
    fav.type = "button";
    fav.textContent = "\u2605";
    const isFav = favorites.includes(item.emoji);
    fav.setAttribute("aria-pressed", String(isFav));
    fav.setAttribute("title", isFav ? "Remove favorite" : "Add favorite");
    fav.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(item.emoji);
    });

    card.append(btn, fav);
    card.addEventListener("click", () => handleCopy(item));
    grid.append(card);
  });
}

async function handleCopy(item) {
  try {
    await copyText(item.emoji);
    pushRecent(item.emoji);
    status(`\u2705 Copied ${item.emoji}`);
  } catch (error) {
    status("Copy failed");
  }
}

function pushRecent(emoji) {
  recent = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, MAX_RECENT);
  saveList(STORAGE_KEYS.recent, recent);
  if (activeTab === "recent") {
    render();
  }
}

function toggleFavorite(emoji) {
  if (favorites.includes(emoji)) {
    favorites = favorites.filter((item) => item !== emoji);
  } else {
    favorites = [emoji, ...favorites];
  }
  saveList(STORAGE_KEYS.favorites, favorites);
  render();
}

function status(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.add("pulse");
  setTimeout(() => statusEl.classList.remove("pulse"), 250);
  showToast(message);
}

let toastTimer;
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 800);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

function setActiveTab(next) {
  activeTab = next;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === next;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  render();
}

function initTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });
}

function initSearch() {
  searchInput.addEventListener("input", render);
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    render();
  });
}

function initSupport() {
  supportBtn.addEventListener("click", async () => {
    try {
      const openUrl = window.__TAURI__?.opener?.openUrl;
      if (openUrl) {
        await openUrl(SUPPORT_URL);
      } else {
        window.open(SUPPORT_URL, "_blank");
      }
    } catch (error) {
      window.open(SUPPORT_URL, "_blank");
    }
  });
}

async function initPin() {
  const stored = localStorage.getItem(STORAGE_KEYS.pin);
  const isPinned = stored ? stored === "true" : true;
  pinToggle.setAttribute("aria-pressed", String(isPinned));
  pinToggle.querySelector(".pin-text").textContent = isPinned
    ? "Always on top"
    : "Pin off";

  const appWindow = getAppWindow();
  const canControl = !!appWindow?.setAlwaysOnTop;

  async function applyPinState(next) {
    if (!canControl) {
      status("Window API not available");
      return false;
    }
    try {
      await appWindow.setAlwaysOnTop(next);
      if (appWindow.isAlwaysOnTop) {
        const actual = await appWindow.isAlwaysOnTop();
        pinToggle.setAttribute("aria-pressed", String(actual));
        pinToggle.querySelector(".pin-text").textContent = actual
          ? "Always on top"
          : "Pin off";
      }
      return true;
    } catch (error) {
      status("Pin toggle failed");
      return false;
    }
  }

  setTimeout(() => {
    applyPinState(isPinned);
  }, 100);

  pinToggle.addEventListener("click", async () => {
    const next = pinToggle.getAttribute("aria-pressed") !== "true";
    pinToggle.setAttribute("aria-pressed", String(next));
    localStorage.setItem(STORAGE_KEYS.pin, String(next));
    pinToggle.querySelector(".pin-text").textContent = next
      ? "Always on top"
      : "Pin off";

    const ok = await applyPinState(next);
    if (!ok) {
      const fallback = !next;
      pinToggle.setAttribute("aria-pressed", String(fallback));
      pinToggle.querySelector(".pin-text").textContent = fallback
        ? "Always on top"
        : "Pin off";
    }
  });
}

async function loadEmojiData() {
  status("Loading emoji data...");
  try {
    const cached = localStorage.getItem("quickEmoji.emojiData");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed?.emojis)) {
        emojiData = parsed.emojis;
        isLoading = false;
        render();
        status(`Loaded ${emojiData.length} emojis`);
        return;
      }
    }

    const response = await fetch("data/emoji.json");
    if (!response.ok) {
      throw new Error(`Failed to load emoji.json: ${response.status}`);
    }
    const payload = await response.json();
    emojiData = Array.isArray(payload?.emojis) ? payload.emojis : [];
    localStorage.setItem("quickEmoji.emojiData", JSON.stringify(payload));
    isLoading = false;
    render();
    status(`Loaded ${emojiData.length} emojis`);
  } catch (error) {
    emojiData = FALLBACK_DATA;
    isLoading = false;
    render();
    status("Using fallback emoji list");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  grid = document.querySelector("#emoji-grid");
  searchInput = document.querySelector("#search-input");
  clearSearch = document.querySelector("#clear-search");
  statusEl = document.querySelector("#status");
  toastEl = document.querySelector("#toast");
  tabs = Array.from(document.querySelectorAll(".tab"));
  pinToggle = document.querySelector("#pin-toggle");
  supportBtn = document.querySelector("#support-btn");

  if (!grid || !searchInput || !clearSearch || !statusEl || !toastEl || !pinToggle) {
    console.error("UI not ready");
    return;
  }

  initTabs();
  initSearch();
  if (supportBtn) {
    initSupport();
  }
  initPin();
  loadEmojiData();
});
