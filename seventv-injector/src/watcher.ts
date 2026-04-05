import { domObserver } from "./observers/dom";
import {
  historyObserver,
  type HistoryChangePayload,
} from "./observers/history";
import { twitchPlatform } from "./platforms/twitch";
import { youtubePlatform } from "./platforms/youtube";
import { debug } from "./utils/debug";

export interface PlatformChannel {
  id: string;
  displayName: string;
  url: string;
}

export interface PlatformUser {
  id?: string;
  login?: string;
  displayName?: string;
}

export interface PlatformAdapter {
  id: "twitch" | "youtube";
  chatRootSelectors: string[];
  chatMessageSelectors: string[];
  matchesHost(hostname: string): boolean;
  getChannel(): PlatformChannel | null;
  getCurrentUser(): PlatformUser | null;
  getChatRoot(): HTMLElement | null;
  getChatInput(): HTMLElement | null;
  getMenuAnchor(): HTMLElement | null;
  getMessageText(element: Element): string;
  insertText(text: string): boolean;
}

export interface LoadChatPayload {
  platform: PlatformAdapter;
  root: HTMLElement;
}

export interface ChatMessagePayload {
  platform: PlatformAdapter;
  element: HTMLElement;
  text: string;
  channel: PlatformChannel | null;
}

export interface WatcherEventMap {
  load: undefined;
  "load.chat": LoadChatPayload;
  "load.channel": PlatformChannel | null;
  "chat.message": ChatMessagePayload;
  "channel.updated": PlatformChannel | null;
  navigation: HistoryChangePayload;
}

type WatcherListener<K extends keyof WatcherEventMap> = (
  payload: WatcherEventMap[K],
) => void;

class TypedEmitter<TEvents extends Record<string, unknown>> {
  private readonly listeners = new Map<
    keyof TEvents,
    Set<(payload: TEvents[keyof TEvents]) => void>
  >();

  on<K extends keyof TEvents>(
    event: K,
    listener: (payload: TEvents[K]) => void,
  ): () => void {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(listener as (payload: TEvents[keyof TEvents]) => void);
    this.listeners.set(event, bucket);

    return () => {
      bucket.delete(listener as (payload: TEvents[keyof TEvents]) => void);

      if (bucket.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(payload as TEvents[keyof TEvents]);
    }
  }
}

const platforms: PlatformAdapter[] = [twitchPlatform, youtubePlatform];

class Watcher {
  private readonly emitter = new TypedEmitter<WatcherEventMap>();
  private platform: PlatformAdapter | null = null;
  private started = false;
  private currentChannelKey: string | null = null;
  private seenChatRoots = new WeakSet<HTMLElement>();

  setup(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.platform = platforms.find((candidate) =>
      candidate.matchesHost(window.location.hostname),
    ) ?? null;

    if (!this.platform) {
      return;
    }

    debug.trace("Watcher setup for platform", this.platform.id);

    domObserver.start();
    historyObserver.on((payload) => {
      this.emitter.emit("navigation", payload);
      this.handleLoadCycle();
    });

    for (const selector of this.platform.chatRootSelectors) {
      domObserver.on(
        selector,
        () => {
          this.emitChatLoadIfReady();
        },
        { emitExisting: true },
      );
    }

    for (const selector of this.platform.chatMessageSelectors) {
      domObserver.on(
        selector,
        (element) => {
          if (!this.platform || !(element instanceof HTMLElement)) {
            return;
          }

          const root = this.platform.getChatRoot();
          if (!root || (!root.contains(element) && root !== element)) {
            return;
          }

          this.emitter.emit("chat.message", {
            platform: this.platform,
            element,
            text: this.platform.getMessageText(element),
            channel: this.platform.getChannel(),
          });
        },
        { emitExisting: false },
      );
    }

    this.handleLoadCycle();
  }

  on<K extends keyof WatcherEventMap>(
    event: K,
    listener: WatcherListener<K>,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  emit<K extends keyof WatcherEventMap>(event: K, payload: WatcherEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  emitLoad(name: string): void {
    if (name === "chat") {
      this.emitChatLoadIfReady();
      return;
    }

    if (name === "channel") {
      this.emitter.emit("load.channel", this.platform?.getChannel() ?? null);
      return;
    }

    this.emitter.emit("load", undefined);
  }

  getPlatform(): PlatformAdapter | null {
    return this.platform;
  }

  private handleLoadCycle(): void {
    this.emitter.emit("load", undefined);

    const channel = this.platform?.getChannel() ?? null;
    const nextChannelKey = channel?.url ?? null;

    if (nextChannelKey !== this.currentChannelKey) {
      this.currentChannelKey = nextChannelKey;
      this.seenChatRoots = new WeakSet<HTMLElement>();

      this.emitter.emit("load.channel", channel);
      this.emitter.emit("channel.updated", channel);
    }

    this.emitChatLoadIfReady();
  }

  private emitChatLoadIfReady(): void {
    if (!this.platform) {
      return;
    }

    const root = this.platform.getChatRoot();
    if (!root || this.seenChatRoots.has(root)) {
      return;
    }

    this.seenChatRoots.add(root);
    this.emitter.emit("load.chat", {
      platform: this.platform,
      root,
    });
  }
}

export const watcher = new Watcher();
