import type {
  PlatformAdapter,
  PlatformChannel,
  PlatformUser,
} from "../watcher";
import {
  insertTextAtCursor,
  queryFirst,
} from "../utils/window";

const RESERVED_PATHS = new Set([
  "directory",
  "downloads",
  "jobs",
  "login",
  "messages",
  "moderator",
  "p",
  "popout",
  "search",
  "settings",
  "signup",
  "subscriptions",
  "turbo",
  "videos",
]);

const chatRootSelectors = [
  '[data-a-target="chat-scroller"]',
  ".chat-scrollable-area__message-container",
  '[data-test-selector="chat-room-component-layout"]',
];

const chatMessageSelectors = [
  ".chat-line__message",
  '[data-a-target="chat-line-message"]',
];

const chatInputSelectors = [
  '[data-a-target="chat-input"] [contenteditable="true"]',
  '[data-a-target="chat-input"]',
  'textarea[data-a-target="chat-input"]',
];

const menuAnchorSelectors = [
  ".chat-input__buttons-container",
  '[data-a-target="chat-send-button"]',
  "form .Layout-sc-1xcs6mc-0:last-child",
];

function currentPathSegment(): string | null {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const [firstSegment] = segments;
  if (RESERVED_PATHS.has(firstSegment.toLowerCase())) {
    return null;
  }

  return firstSegment.toLowerCase();
}

function getChannelUrl(slug: string): string {
  return `${window.location.protocol}//${window.location.host}/${slug}`;
}

export const twitchPlatform: PlatformAdapter = {
  id: "twitch",
  chatRootSelectors,
  chatMessageSelectors,
  matchesHost(hostname) {
    return /(^|\.)twitch\.tv$/i.test(hostname);
  },
  getChannel(): PlatformChannel | null {
    const slug = currentPathSegment();
    if (!slug) {
      return null;
    }

    return {
      id: slug,
      displayName: slug,
      url: getChannelUrl(slug),
    };
  },
  getCurrentUser(): PlatformUser | null {
    const avatarButton = document.querySelector<HTMLElement>(
      '[data-a-target="user-menu-toggle"]',
    );

    const displayName = avatarButton?.getAttribute("aria-label") ?? null;
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
