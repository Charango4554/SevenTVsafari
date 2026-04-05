import { SETTINGS_SCHEMA_VERSION } from "./constants";
import { storage } from "./storage";

export const SettingIds = {
  EMOTES: "emotes",
  EMOTE_MENU: "emoteMenu",
  COSMETICS: "cosmetics",
  DEBUG: "debug",
} as const;

export type SettingId = (typeof SettingIds)[keyof typeof SettingIds];

export interface SettingsShape {
  emotes: boolean;
  emoteMenu: boolean;
  cosmetics: boolean;
  debug: boolean;
}

export interface SettingDefinition {
  id: SettingId;
  label: string;
  description: string;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    id: SettingIds.EMOTES,
    label: "Emotes 7TV",
    description: "Active le chargement des emotes et le cache de recherche 7TV.",
  },
  {
    id: SettingIds.EMOTE_MENU,
    label: "Menu d’emotes",
    description: "Ajoute un bouton 7TV pour rechercher et insérer des emotes dans le chat.",
  },
  {
    id: SettingIds.COSMETICS,
    label: "Cosmetics",
    description: "Prépare l’affichage des cosmetics 7TV dans les zones gérées par le runtime.",
  },
  {
    id: SettingIds.DEBUG,
    label: "Debug",
    description: "Active les logs détaillés du runtime injecté.",
  },
];

export const DEFAULT_SETTINGS: SettingsShape = {
  emotes: true,
  emoteMenu: true,
  cosmetics: true,
  debug: false,
};

type BooleanSettingId = {
  [K in SettingId]: SettingsShape[K] extends boolean ? K : never;
}[SettingId];

type SettingsListener = (snapshot: SettingsShape) => void;

export class SettingsService {
  private readonly listeners = new Set<SettingsListener>();
  private values: SettingsShape;

  constructor() {
    this.values = this.load();
  }

  private load(): SettingsShape {
    const storedVersion = storage.getItem<number>("settings_version", 0);
    const storedSettings = storage.getItem<Partial<SettingsShape>>("settings", {});

    const migrated = this.migrate(
      {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
      },
      storedVersion,
    );

    this.persist(migrated);

    return migrated;
  }

  private migrate(values: SettingsShape, fromVersion: number): SettingsShape {
    let next = { ...DEFAULT_SETTINGS, ...values };

    if (fromVersion < 1) {
      next = {
        ...next,
        debug: Boolean(next.debug),
      };
    }

    return next;
  }

  private persist(values: SettingsShape = this.values): void {
    storage.setItem("settings_version", SETTINGS_SCHEMA_VERSION);
    storage.setItem("settings", values);
    storage.setItem("debug_enabled", values.debug);
  }

  private notify(): void {
    const snapshot = this.snapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  snapshot(): SettingsShape {
    return { ...this.values };
  }

  get<K extends SettingId>(id: K): SettingsShape[K] {
    return this.values[id];
  }

  set<K extends SettingId>(id: K, value: SettingsShape[K]): void {
    if (this.values[id] === value) {
      return;
    }

    this.values = {
      ...this.values,
      [id]: value,
    };

    this.persist();
    this.notify();
  }

  update(partial: Partial<SettingsShape>): void {
    this.values = {
      ...this.values,
      ...partial,
    };

    this.persist();
    this.notify();
  }

  toggle(id: BooleanSettingId): void {
    this.set(id, !this.values[id]);
  }

  reset(): void {
    this.values = { ...DEFAULT_SETTINGS };
    this.persist();
    this.notify();
  }

  subscribe(listener: SettingsListener, emitImmediately = false): () => void {
    this.listeners.add(listener);

    if (emitImmediately) {
      listener(this.snapshot());
    }

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const settings = new SettingsService();
