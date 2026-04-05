import type {
  PlatformAdapter,
  PlatformChannel,
  PlatformUser,
} from "../watcher";
import {
  insertTextAtCursor,
  queryFirst,
} from "../utils/window";

const chatRootSelectors = [
  "yt-live-chat-item-list-renderer #items",
  "yt-live-chat-app #items",
  "#chat-messages",
];

const chatMessageSelectors = [
  "yt-live-chat-text-message-renderer",
  "yt-live-chat-paid-message-renderer",
  "yt-live-chat-membership-item-renderer",
];

const chatInputSelectors = [
  "yt-live-chat-text-input-field-renderer #input",
  "yt-live-chat-message-input-renderer #input",
  "#input[contenteditable='true']",
];

const menuAnchorSelectors = [
  "yt-live-chat-message-input-renderer #send-button",
  "yt-live-chat-input-panel-renderer",
];

function resolveChannelFromPath(): PlatformChannel | null {
  const [firstSegment] = window.location.pathname.split("/").filter(Boolean);

  if (!firstSegment) {
    return null;
  }

  if (firstSegment.startsWith("@")) {
    return {
      id: firstSegment.slice(1),
      displayName: firstSegment,
      url: `${window.location.origin}/${firstSegment}`,
    };
  }

  return null;
}

export const youtubePlatform: PlatformAdapter = {
  id: "youtube",
  chatRootSelectors,
  chatMessageSelectors,
  matchesHost(hostname) {
    return /(^|\.)youtube\.com$/i.test(hostname);
  },
  getChannel(): PlatformChannel | null {
    const fromPath = resolveChannelFromPath();
    if (fromPath) {
      return fromPath;
    }

    const ownerLink = document.querySelector<HTMLAnchorElement>(
      "ytd-channel-name a, #owner #channel-name a, #text-container a",
    );
    if (!ownerLink?.href) {
      return null;
    }

    return {
      id: ownerLink.href,
      displayName: ownerLink.textContent?.trim() || ownerLink.href,
      url: ownerLink.href,
    };
  },
  getCurrentUser(): PlatformUser | null {
    const avatarButton = document.querySelector<HTMLElement>(
      "button#avatar-btn, #avatar-btn",
    );
    const displayName = avatarButton?.getAttribute("aria-label");

    if (!displayName) {
      return null;
    }

    return {
      displayName,
    };
  },
  getChatRoot(): HTMLElement | null {
    return queryFirst<HTMLElement>(chatRootSelectors);
  },
  getChatInput(): HTMLElement | null {
    return queryFirst<HTMLElement>(chatInputSelectors);
  },
  getMenuAnchor(): HTMLElement | null {
    return queryFirst<HTMLElement>(menuAnchorSelectors);
  },
  getMessageText(element: Element): string {
    return element.textContent?.trim() ?? "";
  },
  insertText(text: string): boolean {
    const input = this.getChatInput();
    if (!input) {
      return false;
    }

    return insertTextAtCursor(input, text);
  },
};
