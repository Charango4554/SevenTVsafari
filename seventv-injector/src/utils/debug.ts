import { storage } from "../storage";

const PREFIX = "[7TV Injector]";

function isDebugEnabled(): boolean {
  return storage.getItem<boolean>("debug_enabled", false);
}

export const debug = {
  log: (...args: unknown[]) => console.log(PREFIX, ...args),
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  trace: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.debug(PREFIX, ...args);
    }
  },
};
