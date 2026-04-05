export interface RuntimeModule {
  id: string;
  order?: number;
  setup(): void | Promise<void>;
}

export const VERSION = __SEVENTV_VERSION__;
export const API_URL = __SEVENTV_API_URL__;
export const EVENT_API_URL = __SEVENTV_EVENT_API_URL__;
export const CSS_FILE_NAME = __SEVENTV_CSS_FILE__;

export const GLOBAL_INJECTED_FLAG = "__seventv_injected" as const;
export const GLOBAL_STYLE_ELEMENT_ID = "seventv-injector-styles" as const;
export const STORAGE_PREFIX = "seventv_";
export const SETTINGS_SCHEMA_VERSION = 1;
export const MAX_RECENT_EMOTES = 24;
export const KEYBOARD_SHORTCUT_LABEL = "Alt+7";
export const EMOTE_MENU_SEARCH_DEBOUNCE_MS = 180;

export const MODULE_PRIORITY: Record<string, number> = {
  global_css: 0,
  emotes: 10,
  chat: 20,
  emote_menu: 30,
  settings: 40,
};

export const SUPPORTED_HOST_PATTERNS = [
  /(^|\.)twitch\.tv$/i,
  /(^|\.)youtube\.com$/i,
] as const;
