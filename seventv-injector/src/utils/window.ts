import type { SettingsService } from "../settings";

export interface SevenTVRuntimeApi {
  version: string;
  settings: SettingsService;
  watcher: {
    emitLoad(name: string): void;
  };
}

declare global {
  interface Window {
    SevenTV?: SevenTVRuntimeApi;
    __seventv_injected?: boolean;
    __SEVENTV_CURRENT_SCRIPT__?: HTMLScriptElement | null;
  }
}

export function isHTMLElement(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

export function queryFirst<T extends Element>(
  selectors: string[],
  root: ParentNode = document,
): T | null {
  for (const selector of selectors) {
    const element = root.querySelector<T>(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

export function queryAll<T extends Element>(
  selectors: string[],
  root: ParentNode = document,
): T[] {
  const found = new Set<T>();

  for (const selector of selectors) {
    for (const element of root.querySelectorAll<T>(selector)) {
      found.add(element);
    }
  }

  return [...found];
}

function dispatchInputEvents(target: HTMLElement, data: string): void {
  if (typeof InputEvent !== "undefined") {
    target.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data,
        inputType: "insertText",
      }),
    );
  } else {
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function placeCaretAtEnd(target: HTMLElement): void {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertTextAtCursor(target: HTMLElement, text: string): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;

    target.focus();
    target.value = `${target.value.slice(0, start)}${text}${target.value.slice(end)}`;
    target.setSelectionRange(start + text.length, start + text.length);
    dispatchInputEvents(target, text);

    return true;
  }

  if (target.isContentEditable) {
    target.focus();

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    if (!target.contains(selection.anchorNode)) {
      placeCaretAtEnd(target);
    }

    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.rangeCount === 0) {
      placeCaretAtEnd(target);
    }

    const range = window.getSelection()?.getRangeAt(0);
    if (!range) {
      return false;
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);

    const finalSelection = window.getSelection();
    finalSelection?.removeAllRanges();
    finalSelection?.addRange(range);

    dispatchInputEvents(target, text);
    return true;
  }

  return false;
}
