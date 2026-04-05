import { EMOTE_MENU_SEARCH_DEBOUNCE_MS } from "../../constants";
import type { RuntimeModule } from "../../constants";
import { settings, SettingIds } from "../../settings";
import { pickBestImage, type EmoteSummary } from "../../utils/api";
import { debug } from "../../utils/debug";
import { watcher, type LoadChatPayload, type PlatformAdapter } from "../../watcher";
import { emotesService } from "../emotes";

const BUTTON_CLASS = "seventv-toolbar-button seventv-emote-menu-button";

let started = false;
let button: HTMLButtonElement | null = null;
let panel: HTMLDivElement | null = null;
let resultsGrid: HTMLDivElement | null = null;
let searchInput: HTMLInputElement | null = null;
let footerStatus: HTMLSpanElement | null = null;
let activePlatform: PlatformAdapter | null = null;
let searchTimer: number | null = null;

function destroyButton(): void {
  button?.remove();
  button = null;
}

function detachPanelListeners(): void {
  document.removeEventListener("mousedown", onDocumentMouseDown, true);
  window.removeEventListener("keydown", onWindowKeyDown, true);
  window.removeEventListener("resize", positionPanel);
  window.removeEventListener("scroll", positionPanel, true);
}

function closePanel(): void {
  detachPanelListeners();
  panel?.remove();
  panel = null;
  resultsGrid = null;
  searchInput = null;
  footerStatus = null;

  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closePanel();
  }
}

function onDocumentMouseDown(event: MouseEvent): void {
  const target = event.target;

  if (
    target instanceof Node &&
    ((panel && panel.contains(target)) || (button && button.contains(target)))
  ) {
    return;
  }

  closePanel();
}

function positionPanel(): void {
  if (!panel || !button) {
    return;
  }

  const bounds = button.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(380, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, bounds.right - width),
    window.innerWidth - width - margin,
  );

  panel.style.left = `${left}px`;
  panel.style.top = `${Math.min(bounds.top, window.innerHeight - 120) - 12}px`;
  panel.style.transform = "translateY(-100%)";
}

function setFooterText(text: string): void {
  if (footerStatus) {
    footerStatus.textContent = text;
  }
}

function createCard(emote: EmoteSummary): HTMLButtonElement {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "seventv-emote-card";

  const image = pickBestImage(emote.images, 2);
  if (image) {
    const img = document.createElement("img");
    img.src = image.url;
    img.alt = emote.name;
    img.loading = "lazy";
    card.appendChild(img);
  }

  const name = document.createElement("span");
  name.className = "seventv-emote-card__name";
  name.textContent = emote.name;
  card.appendChild(name);

  const owner = document.createElement("span");
  owner.className = "seventv-emote-card__owner";
  owner.textContent = emote.ownerDisplayName ?? "7TV";
  card.appendChild(owner);

  card.addEventListener("click", () => {
    if (!activePlatform) {
      return;
    }

    const inserted = activePlatform.insertText(`${emote.name} `);
    if (inserted) {
      emotesService.remember(emote);
      closePanel();
    }
  });

  return card;
}

function renderEmptyState(message: string): void {
  if (!resultsGrid) {
    return;
  }

  resultsGrid.innerHTML = "";

  const emptyState = document.createElement("div");
  emptyState.className = "seventv-empty-state";
  emptyState.textContent = message;
  resultsGrid.appendChild(emptyState);
}

async function renderResults(query: string): Promise<void> {
  if (!resultsGrid) {
    return;
  }

  resultsGrid.innerHTML = "";
  renderEmptyState("Chargement des emotes 7TV…");

  try {
    const trimmed = query.trim();
    const results = trimmed
      ? await emotesService.search(trimmed, 30)
      : emotesService.getRecent().length > 0
        ? emotesService.getRecent()
        : await emotesService.getTrending(24);

    if (!resultsGrid) {
      return;
    }

    resultsGrid.innerHTML = "";

    if (results.length === 0) {
      renderEmptyState("Aucun résultat 7TV pour cette recherche.");
      return;
    }

    for (const emote of results) {
      resultsGrid.appendChild(createCard(emote));
    }

    setFooterText(
      trimmed
        ? `${results.length} résultat(s) pour “${trimmed}”`
        : "Recents ou tendances 7TV",
    );
  } catch (error) {
    debug.warn("Failed to render emote results", error);
    renderEmptyState("Impossible de charger les emotes 7TV.");
  }
}

function scheduleSearch(query: string): void {
  if (searchTimer !== null) {
    window.clearTimeout(searchTimer);
  }

  searchTimer = window.setTimeout(() => {
    searchTimer = null;
    void renderResults(query);
  }, EMOTE_MENU_SEARCH_DEBOUNCE_MS);
}

function openPanel(): void {
  if (!button) {
    return;
  }

  closePanel();

  panel = document.createElement("div");
  panel.className = "seventv-emote-menu";
  panel.innerHTML = `
    <div class="seventv-emote-menu__header">
      <div class="seventv-emote-menu__title">
        <span>7TV Emotes</span>
        <span class="seventv-status-pill">${activePlatform?.id ?? "runtime"}</span>
      </div>
    </div>
    <div class="seventv-emote-menu__body">
      <input class="seventv-input" type="search" placeholder="Rechercher une emote 7TV" />
      <div class="seventv-emote-grid"></div>
    </div>
    <div class="seventv-emote-menu__footer">
      <span class="seventv-subtle">Les emotes s’insèrent dans la zone de chat active.</span>
      <span class="seventv-subtle" data-role="status"></span>
    </div>
  `;

  searchInput = panel.querySelector<HTMLInputElement>(".seventv-input");
  resultsGrid = panel.querySelector<HTMLDivElement>(".seventv-emote-grid");
  footerStatus = panel.querySelector<HTMLSpanElement>("[data-role='status']");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      scheduleSearch(searchInput?.value ?? "");
    });
  }

  document.body.appendChild(panel);
  document.addEventListener("mousedown", onDocumentMouseDown, true);
  window.addEventListener("keydown", onWindowKeyDown, true);
  window.addEventListener("resize", positionPanel);
  window.addEventListener("scroll", positionPanel, true);

  button.setAttribute("aria-expanded", "true");
  positionPanel();
  searchInput?.focus();
  void renderResults("");
}

function togglePanel(): void {
  if (panel) {
    closePanel();
    return;
  }

  openPanel();
}

function ensureButton(payload: LoadChatPayload): void {
  activePlatform = payload.platform;

  if (!settings.get(SettingIds.EMOTE_MENU) || !settings.get(SettingIds.EMOTES)) {
    destroyButton();
    closePanel();
    return;
  }

  const anchor = payload.platform.getMenuAnchor() ?? payload.platform.getChatInput()?.parentElement;
  if (!anchor) {
    return;
  }

  if (button?.isConnected) {
    return;
  }

  const mountPoint =
    anchor.id === "send-button" && anchor.parentElement ? anchor.parentElement : anchor;

  button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.textContent = "7TV";
  button.setAttribute("aria-label", "Ouvrir le menu d’emotes 7TV");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePanel();
  });

  if (mountPoint.firstChild) {
    mountPoint.insertBefore(button, mountPoint.firstChild);
  } else {
    mountPoint.appendChild(button);
  }
}

const emoteMenuModule: RuntimeModule = {
  id: "emote_menu",
  setup() {
    if (started) {
      return;
    }

    started = true;

    watcher.on("load.chat", (payload) => {
      ensureButton(payload);
    });

    watcher.on("channel.updated", () => {
      closePanel();
      destroyButton();
    });

    settings.subscribe(() => {
      const platform = watcher.getPlatform();
      const root = platform?.getChatRoot();

      if (!platform || !root) {
        destroyButton();
        closePanel();
        return;
      }

      ensureButton({ platform, root });
    }, true);
  },
};

export default emoteMenuModule;
