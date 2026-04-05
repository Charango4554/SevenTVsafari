import { GLOBAL_INJECTED_FLAG, MODULE_PRIORITY, VERSION } from "./constants";
import { load as loadGlobalCss } from "./modules/global_css";
import { settings } from "./settings";
import { setCurrentScript, supportsRuntime, isSupportedHost, isUsefulContext } from "./utils/extension";
import { debug } from "./utils/debug";
import { watcher } from "./watcher";

interface RuntimeModuleNamespace {
  default?: {
    id: string;
    order?: number;
    setup(): void | Promise<void>;
  };
}

function getModulePriority(id: string, explicitOrder?: number): number {
  if (typeof explicitOrder === "number") {
    return explicitOrder;
  }

  return MODULE_PRIORITY[id] ?? 999;
}

async function loadModules(): Promise<void> {
  const moduleNamespaces = import.meta.glob<RuntimeModuleNamespace>(
    ["./modules/**/index.ts", "./modules/**/index.tsx"],
    {
      eager: true,
    },
  );

  const modules = Object.values(moduleNamespaces)
    .map((namespace) => namespace.default)
    .filter((module): module is NonNullable<RuntimeModuleNamespace["default"]> => Boolean(module))
    .sort(
      (left, right) =>
        getModulePriority(left.id, left.order) - getModulePriority(right.id, right.order),
    );

  for (const module of modules) {
    await module.setup();
  }
}

async function bootstrap(
  currentScript: HTMLScriptElement | null,
): Promise<void> {
  if (!supportsRuntime() || !isUsefulContext()) {
    return;
  }

  if (!isSupportedHost(window.location.hostname)) {
    return;
  }

  if (window[GLOBAL_INJECTED_FLAG]) {
    return;
  }

  window[GLOBAL_INJECTED_FLAG] = true;

  await setCurrentScript(currentScript);
  await loadGlobalCss();
  await loadModules();
  watcher.setup();

  window.SevenTV = {
    version: VERSION,
    settings,
    watcher: {
      emitLoad: (name: string) => watcher.emitLoad(name),
    },
  };

  debug.info(`7TV injector v${VERSION} loaded on ${window.location.hostname}`);
}

void bootstrap(
  document.currentScript instanceof HTMLScriptElement ? document.currentScript : null,
).catch((error) => {
  delete window[GLOBAL_INJECTED_FLAG];
  debug.error("Bootstrap failed", error);
});
