import { MAX_RECENT_EMOTES } from "../../constants";
import type { RuntimeModule } from "../../constants";
import { settings, SettingIds } from "../../settings";
import { storage } from "../../storage";
import type { EmoteSummary } from "../../utils/api";
import { searchEmotes } from "../../utils/api";
import { debug } from "../../utils/debug";
import { watcher } from "../../watcher";

const RECENT_EMOTES_KEY = "recent_emotes";

class EmotesService {
  private readonly cache = new Map<string, EmoteSummary[]>();
  private readonly inflight = new Map<string, Promise<EmoteSummary[]>>();

  async search(query: string, limit = 30): Promise<EmoteSummary[]> {
    return this.fetch(query.trim() || null, limit);
  }

  async getTrending(limit = 24): Promise<EmoteSummary[]> {
    return this.fetch(null, limit);
  }

  getRecent(): EmoteSummary[] {
    return storage
      .getItem<EmoteSummary[]>(RECENT_EMOTES_KEY, [])
      .slice(0, MAX_RECENT_EMOTES);
  }

  remember(emote: EmoteSummary): void {
    const next = [emote, ...this.getRecent().filter((item) => item.id !== emote.id)].slice(
      0,
      MAX_RECENT_EMOTES,
    );

    storage.setItem(RECENT_EMOTES_KEY, next);
  }

  private async fetch(query: string | null, limit: number): Promise<EmoteSummary[]> {
    const cacheKey = `${query ?? "__trending"}:${limit}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? [];
    }

    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey) ?? Promise.resolve([]);
    }

    const request = searchEmotes(query, limit)
      .then((results) => {
        this.cache.set(cacheKey, results);
        this.inflight.delete(cacheKey);
        return results;
      })
      .catch((error) => {
        this.inflight.delete(cacheKey);
        debug.warn("Failed to fetch emotes", error);
        throw error;
      });

    this.inflight.set(cacheKey, request);

    return request;
  }
}

export const emotesService = new EmotesService();

let started = false;

const emotesModule: RuntimeModule = {
  id: "emotes",
  setup() {
    if (started) {
      return;
    }

    started = true;

    watcher.on("load.chat", () => {
      if (settings.get(SettingIds.EMOTES)) {
        void emotesService.getTrending();
      }
    });
  },
};

export default emotesModule;
