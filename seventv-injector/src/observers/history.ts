export type HistoryEventSource = "pushState" | "replaceState" | "popstate";

export interface HistoryChangePayload {
  source: HistoryEventSource;
  url: URL;
}

type HistoryListener = (payload: HistoryChangePayload) => void;

export class HistoryObserver {
  private readonly listeners = new Set<HistoryListener>();
  private started = false;

  setup(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const wrapMethod = <T extends "pushState" | "replaceState">(name: T): void => {
      const original = history[name].bind(history);

      history[name] = ((...args: Parameters<History[T]>) => {
        const result = original(...args);
        this.emit(name);
        return result;
      }) as History[T];
    };

    wrapMethod("pushState");
    wrapMethod("replaceState");

    window.addEventListener("popstate", () => {
      this.emit("popstate");
    });
  }

  on(listener: HistoryListener): () => void {
    this.setup();
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(source: HistoryEventSource): void {
    const payload: HistoryChangePayload = {
      source,
      url: new URL(window.location.href),
    };

    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}

export const historyObserver = new HistoryObserver();
