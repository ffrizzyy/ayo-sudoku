import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { SettingsProvider, useSettings } from "./app/settings";
import { I18nProvider } from "./i18n";
import { ToastProvider } from "./app/toast";
import { DataProvider } from "./app/data";
import { CREDITS } from "./config/credits";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/screens.css";

function Root() {
  const { settings, update } = useSettings();
  return (
    <I18nProvider locale={settings.locale} onLocaleChange={(locale) => update({ locale })}>
      <ToastProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Ask the browser to keep local saves available unless storage pressure demands otherwise.
if ("storage" in navigator && navigator.storage.persist) {
  void navigator.storage.persist().catch(() => undefined);
}

// A friendly signature for anyone who opens the console.
console.log(
  `%c${CREDITS.appName}%c v${CREDITS.version}\n%cMade by ${CREDITS.author} · ${CREDITS.authorUrl}\nPuzzles and code by ${CREDITS.author}. No trackers, no accounts.`,
  "font-size:20px;font-weight:800;color:#0A84FF;",
  "font-size:12px;color:#8E8E93;",
  "font-size:12px;color:#8E8E93;",
);
