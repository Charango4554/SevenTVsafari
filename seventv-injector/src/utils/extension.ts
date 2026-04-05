import { SUPPORTED_HOST_PATTERNS } from "../constants";

let currentScript: HTMLScriptElement | null = null;

export async function setCurrentScript(script: HTMLScriptElement | null): Promise<void> {
  currentScript = script;
  window.__SEVENTV_CURRENT_SCRIPT__ = script;
}

export function getCurrentScript(): HTMLScriptElement | null {
  if (currentScript) {
    return currentScript;
  }

  if (window.__SEVENTV_CURRENT_SCRIPT__) {
    return window.__SEVENTV_CURRENT_SCRIPT__;
  }

  return document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null;
}

export function getAssetUrl(fileName: string): string {
  const script = getCurrentScript();

  if (!script?.src) {
    return fileName;
  }

  return new URL(fileName, script.src).toString();
}

export function supportsRuntime(): boolean {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined" ||
    typeof fetch === "undefined"
  ) {
    return false;
  }

  try {
    const probe = "__seventv_runtime_probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
    return false;
  }

  return true;
}

export function isSupportedHost(hostname: string): boolean {
  return SUPPORTED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function isUsefulContext(): boolean {
  if (document.contentType && !document.contentType.includes("html")) {
    return false;
  }

  if (window.location.pathname.endsWith(".html")) {
    return false;
  }

  return true;
}
