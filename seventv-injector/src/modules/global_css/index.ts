import { CSS_FILE_NAME, GLOBAL_STYLE_ELEMENT_ID } from "../../constants";
import type { RuntimeModule } from "../../constants";
import { getAssetUrl } from "../../utils/extension";
import { debug } from "../../utils/debug";

import "./styles.css";

let pendingLoad: Promise<void> | null = null;

export function load(): Promise<void> {
  if (document.getElementById(GLOBAL_STYLE_ELEMENT_ID)) {
    return Promise.resolve();
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  pendingLoad = new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = GLOBAL_STYLE_ELEMENT_ID;
    link.rel = "stylesheet";
    link.href = getAssetUrl(CSS_FILE_NAME);
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => {
        debug.warn("Failed to load stylesheet", link.href);
        resolve();
      },
      { once: true },
    );

    (document.head ?? document.documentElement).appendChild(link);
  });

  return pendingLoad;
}

const globalCssModule: RuntimeModule = {
  id: "global_css",
  async setup() {
    await load();
  },
};

export default globalCssModule;
