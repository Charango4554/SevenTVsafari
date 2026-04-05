import { STORAGE_PREFIX } from "./constants";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class LocalStorageStore {
  constructor(private readonly prefix: string) {}

  private makeKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  hasAccess(): boolean {
    try {
      const probeKey = this.makeKey("__probe");
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);

      return true;
    } catch {
      return false;
    }
  }

  getItem<T>(key: string, fallback: T): T {
    if (!this.hasAccess()) {
      return fallback;
    }

    return safeParse(window.localStorage.getItem(this.makeKey(key)), fallback);
  }

  setItem<T>(key: string, value: T): void {
    if (!this.hasAccess()) {
      return;
    }

    window.localStorage.setItem(this.makeKey(key), JSON.stringify(value));
  }

  removeItem(key: string): void {
    if (!this.hasAccess()) {
      return;
    }

    window.localStorage.removeItem(this.makeKey(key));
  }
}

export const storage = new LocalStorageStore(STORAGE_PREFIX);
