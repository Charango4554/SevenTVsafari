import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { KEYBOARD_SHORTCUT_LABEL, VERSION } from "../../constants";
import type { RuntimeModule } from "../../constants";
import {
  DEFAULT_SETTINGS,
  SETTING_DEFINITIONS,
  settings,
  type SettingsShape,
} from "../../settings";
import { watcher } from "../../watcher";

let root: Root | null = null;

function SettingsApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SettingsShape>(settings.snapshot());
  const [platform, setPlatform] = useState(watcher.getPlatform()?.id ?? "runtime");

  useEffect(() => settings.subscribe(setSnapshot, true), []);

  useEffect(
    () =>
      watcher.on("load", () => {
        setPlatform(watcher.getPlatform()?.id ?? "runtime");
      }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.altKey && event.key === "7") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="seventv-settings-launcher"
        aria-label={`Ouvrir les paramètres 7TV (${KEYBOARD_SHORTCUT_LABEL})`}
        onClick={() => setIsOpen((current) => !current)}
      >
        7TV
      </button>

      {isOpen ? (
        <div className="seventv-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="seventv-settings-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="seventv-settings-panel__header">
              <div className="seventv-settings-panel__headline">
                <h2>7TV Injector</h2>
                <p>
                  Runtime injecté pour Twitch et YouTube. Plateforme courante :{" "}
                  <strong>{platform}</strong>
                </p>
              </div>

              <button
                type="button"
                className="seventv-button is-secondary"
                onClick={() => setIsOpen(false)}
              >
                Fermer
              </button>
            </header>

            <section className="seventv-settings-list">
              {SETTING_DEFINITIONS.map((definition) => {
                const enabled = snapshot[definition.id];

                return (
                  <div key={definition.id} className="seventv-setting-row">
                    <div>
                      <h3>{definition.label}</h3>
                      <p>{definition.description}</p>
                    </div>

                    <button
                      type="button"
                      className={`seventv-switch${enabled ? " is-active" : ""}`}
                      aria-pressed={enabled}
                      aria-label={definition.label}
                      onClick={() => settings.toggle(definition.id)}
                    />
                  </div>
                );
              })}
            </section>

            <footer className="seventv-settings-panel__footer">
              <div>
                <p>Version du bundle : {VERSION}</p>
                <p>Raccourci : {KEYBOARD_SHORTCUT_LABEL}</p>
              </div>

              <div className="seventv-row">
                <button
                  type="button"
                  className="seventv-button is-secondary"
                  onClick={() => settings.update(DEFAULT_SETTINGS)}
                >
                  Valeurs par défaut
                </button>

                <button
                  type="button"
                  className="seventv-button is-danger"
                  onClick={() => settings.reset()}
                >
                  Réinitialiser
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

const settingsModule: RuntimeModule = {
  id: "settings",
  setup() {
    if (root) {
      return;
    }

    const mountTarget = document.body ?? document.documentElement;
    if (!mountTarget) {
      return;
    }

    const container = document.createElement("div");
    container.id = "seventv-settings-root";
    mountTarget.appendChild(container);

    root = createRoot(container);
    root.render(<SettingsApp />);
  },
};

export default settingsModule;
