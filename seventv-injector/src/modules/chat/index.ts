import type { RuntimeModule } from "../../constants";
import { settings, SettingIds } from "../../settings";
import { watcher, type LoadChatPayload } from "../../watcher";

let started = false;
let currentChatRoot: HTMLElement | null = null;

function applyChatState(payload: LoadChatPayload): void {
  currentChatRoot = payload.root;
  payload.root.classList.add("seventv-chat-root");
  payload.root.dataset.seventvPlatform = payload.platform.id;
  payload.root.dataset.seventvCosmetics = String(settings.get(SettingIds.COSMETICS));
}

const chatModule: RuntimeModule = {
  id: "chat",
  setup() {
    if (started) {
      return;
    }

    started = true;

    watcher.on("load.chat", (payload) => {
      applyChatState(payload);
    });

    watcher.on("chat.message", (payload) => {
      payload.element.classList.add("seventv-chat-message");
      payload.element.dataset.seventvEnhanced = "true";
    });

    settings.subscribe((snapshot) => {
      if (currentChatRoot) {
        currentChatRoot.dataset.seventvCosmetics = String(snapshot.cosmetics);
      }
    }, true);
  },
};

export default chatModule;
