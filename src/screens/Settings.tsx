import { useRef, useState } from "react";
import { useSettings, type Accent, type ColorVision, type DigitStyle, type MistakeCheck, type ReducedMotion, type ThemeSetting } from "../app/settings";
import { useI18n } from "../i18n";
import { useData } from "../app/data";
import { useToast } from "../app/toast";
import { exportBackup, inspectBackup, applyBackup, resetAllData, type BackupSummary } from "../app/storage";
import { Button, Segmented, SettingRow, Sheet, Switch } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import { CREDITS } from "../config/credits";
import { hapticsSupported } from "../app/audio";

const ACCENTS: Accent[] = ["blue", "pink", "green", "orange", "purple", "teal"];

interface SettingsScreenProps {
  onNavigate: (route: string) => void;
  onReplayOnboarding: () => void;
}

export function SettingsScreen({ onNavigate, onReplayOnboarding }: SettingsScreenProps) {
  const { t, locale } = useI18n();
  const { settings, update, resetSettings } = useSettings();
  const { reloadData } = useData();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, setPending] = useState<{ data: Record<string, unknown>; summary: BackupSummary } | null>(null);
  const [importName, setImportName] = useState("");

  const handleExport = () => {
    try {
      const blob = new Blob([exportBackup(settings)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ayo-sudoku-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      push(t("settings.exportDone"), "success");
    } catch {
      push(t("settings.importFailed"));
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportName(file.name);
    const raw = await file.text();
    const result = inspectBackup(raw);
    if (!result.ok) {
      push(t("settings.importFailed"));
      return;
    }
    setPending({ data: result.data, summary: result.summary });
  };

  const confirmImport = () => {
    if (!pending) return;
    applyBackup(pending.data);
    const backupSettings = pending.data.settings as Partial<typeof settings> | undefined;
    if (backupSettings && typeof backupSettings === "object") {
      update({
        ...backupSettings,
        schemaVersion: 1,
      });
    }
    reloadData();
    setPending(null);
    push(t("settings.importDone"), "success");
  };

  const handleReset = () => {
    resetAllData();
    resetSettings();
    reloadData();
    setResetOpen(false);
    push(t("settings.resetDone"), "success");
  };

  return (
    <div className="settings-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <p className="screen-eyebrow">{t("nav.settings")}</p>
          <h1>{t("settings.title")}</h1>
          <p>{t("settings.subtitle")}</p>
        </div>
        <span className="settings-version">{t("settings.version", { version: CREDITS.version })}</span>
      </header>

      <main className="settings-main">
        <section className="settings-card">
          <h2>
            <Icon name="globe" size={19} /> {t("settings.language")}
          </h2>
          <Segmented
            options={[
              { value: "en", label: t("settings.english") },
              { value: "id", label: t("settings.indonesian") },
            ]}
            value={locale}
            onChange={(value) => update({ locale: value })}
            label={t("settings.language")}
          />
          <p className="settings-note">{t("settings.languageNote")}</p>
        </section>

        <section className="settings-card">
          <h2>
            <Icon name="sun" size={19} /> {t("settings.appearance")}
          </h2>
          <SettingRow label={t("settings.theme")} icon="auto">
            <Segmented
              compact
              options={[
                { value: "auto", label: t("settings.themeAuto") },
                { value: "light", label: t("settings.themeLight") },
                { value: "dark", label: t("settings.themeDark") },
              ]}
              value={settings.theme}
              onChange={(value) => update({ theme: value as ThemeSetting })}
              label={t("settings.theme")}
            />
          </SettingRow>
          <SettingRow label={t("settings.accent")} icon="palette">
            <div className="accent-swatches" role="radiogroup" aria-label={t("settings.accent")}>
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={settings.accent === accent}
                  aria-label={t(`settings.accent${accent[0].toUpperCase()}${accent.slice(1)}`)}
                  className={`accent-swatch accent-${accent} ${settings.accent === accent ? "is-active" : ""}`}
                  onClick={() => update({ accent })}
                />
              ))}
            </div>
          </SettingRow>
          <SettingRow label={t("settings.digitStyle")} icon="type">
            <Segmented
              compact
              options={[
                { value: "numerals", label: t("settings.numerals") },
                { value: "letters", label: t("settings.letters") },
                { value: "shapes", label: t("settings.shapes") },
                { value: "emoji", label: t("settings.emoji") },
              ]}
              value={settings.digitStyle}
              onChange={(value) => update({ digitStyle: value as DigitStyle })}
              label={t("settings.digitStyle")}
            />
          </SettingRow>
          <Switch
            label={t("settings.textSize")}
            checked={settings.largeText}
            onChange={(largeText) => update({ largeText })}
          />
          <Switch
            label={t("settings.contrast")}
            checked={settings.highContrast}
            onChange={(highContrast) => update({ highContrast })}
          />
          <SettingRow label={t("settings.motion")}>
            <Segmented
              compact
              options={[
                { value: "system", label: t("settings.motionSystem") },
                { value: "on", label: t("settings.motionOn") },
                { value: "off", label: t("settings.motionOff") },
              ]}
              value={settings.reducedMotion}
              onChange={(value) => update({ reducedMotion: value as ReducedMotion })}
              label={t("settings.motion")}
            />
          </SettingRow>
          <SettingRow label={t("settings.colorVision")} icon="eye">
            <select
              className="select"
              value={settings.colorVision}
              onChange={(event) => update({ colorVision: event.target.value as ColorVision })}
              aria-label={t("settings.colorVision")}
            >
              <option value="none">{t("settings.cvdNone")}</option>
              <option value="deuteranopia">{t("settings.deuteranopia")}</option>
              <option value="protanopia">{t("settings.protanopia")}</option>
              <option value="tritanopia">{t("settings.tritanopia")}</option>
            </select>
          </SettingRow>
        </section>

        <section className="settings-card">
          <h2>
            <Icon name="grid" size={19} /> {t("settings.gameplay")}
          </h2>
          <SettingRow
            label={t("settings.mistakeCheck")}
            description={t("game.mistakeNotice")}
          >
            <Segmented
              compact
              options={[
                { value: "off", label: t("settings.mistakeOff") },
                { value: "onEntry", label: t("settings.mistakeOnEntry") },
                { value: "onRequest", label: t("settings.mistakeOnRequest") },
              ]}
              value={settings.mistakeCheck}
              onChange={(value) => update({ mistakeCheck: value as MistakeCheck })}
              label={t("settings.mistakeCheck")}
            />
          </SettingRow>
          <Switch
            label={t("settings.autoCandidates")}
            description={t("settings.autoCandidatesNote")}
            checked={settings.autoCandidates}
            onChange={(autoCandidates) => update({ autoCandidates })}
          />
          <Switch
            label={t("settings.smartCleanup")}
            description={t("settings.smartCleanupNote")}
            checked={settings.smartCleanup}
            onChange={(smartCleanup) => update({ smartCleanup })}
          />
          <Switch
            label={t("settings.highlightSame")}
            checked={settings.highlight.sameDigit}
            onChange={(sameDigit) =>
              update({ highlight: { ...settings.highlight, sameDigit } })
            }
          />
          <Switch
            label={t("settings.highlightPeers")}
            checked={settings.highlight.peers}
            onChange={(peers) => update({ highlight: { ...settings.highlight, peers } })}
          />
          <Switch
            label={t("settings.highlightCandidates")}
            checked={settings.highlight.candidates}
            onChange={(candidates) => update({ highlight: { ...settings.highlight, candidates } })}
          />
          <Switch
            label={t("settings.showTimer")}
            checked={settings.showTimer}
            onChange={(showTimer) => update({ showTimer })}
          />
          <Switch
            label={t("settings.leftHanded")}
            checked={settings.leftHanded}
            onChange={(leftHanded) => update({ leftHanded })}
          />
          <Switch
            label={t("settings.keepAwake")}
            description={t("settings.keepAwakeNote")}
            checked={settings.keepAwake}
            onChange={(keepAwake) => update({ keepAwake })}
          />
        </section>

        <section className="settings-card">
          <h2>
            <Icon name="volume" size={19} /> {t("settings.sound")}
          </h2>
          <Switch
            label={t("settings.soundOn")}
            description={t("settings.soundNote")}
            checked={settings.sound.on}
            onChange={(on) => update({ sound: { ...settings.sound, on } })}
          />
          <SettingRow label={t("settings.volume")}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sound.volume}
              onChange={(event) =>
                update({ sound: { ...settings.sound, volume: Number(event.target.value) } })
              }
              className="range"
              aria-label={t("settings.volume")}
            />
          </SettingRow>
          <Switch
            label={t("settings.haptics")}
            description={t("settings.hapticsNote")}
            checked={settings.haptics}
            onChange={(haptics) => update({ haptics })}
            disabled={!hapticsSupported()}
          />
        </section>

        <section className="settings-card">
          <h2>
            <Icon name="download" size={19} /> {t("settings.data")}
          </h2>
          <SettingRow label={t("settings.exportData")} description={t("settings.exportNote")}>
            <Button variant="tinted" icon="download" onClick={handleExport}>
              JSON
            </Button>
          </SettingRow>
          <SettingRow label={t("settings.importData")} description={t("settings.importNote")}>
            <Button variant="tinted" icon="upload" onClick={() => fileRef.current?.click()}>
              JSON
            </Button>
          </SettingRow>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <SettingRow label={t("settings.resetData")} description={t("settings.resetNote")}>
            <Button variant="danger" icon="trash" onClick={() => setResetOpen(true)}>
              {t("common.reset")}
            </Button>
          </SettingRow>
          <p className="settings-note">
            <Icon name="info" size={15} /> {t("settings.privacyNote")}
          </p>
        </section>

        <section className="settings-card settings-links">
          <button type="button" className="settings-link" onClick={() => onNavigate("/about")}>
            <span>
              <Icon name="info" size={19} />
              <span>
                <strong>{t("settings.about")}</strong>
                <small>{t("common.version", { version: CREDITS.version })}</small>
              </span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
          <button type="button" className="settings-link" onClick={onReplayOnboarding}>
            <span>
              <Icon name="sparkles" size={19} />
              <span>
                <strong>{t("settings.onboarding")}</strong>
                <small>{t("onboarding.tutorialTitle")}</small>
              </span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
          <div className="settings-credit">
            <Icon name="heart" size={15} />
            {t("common.madeBy", { name: CREDITS.author })}
            <a href={CREDITS.authorUrl} target="_blank" rel="noreferrer noopener">
              ffrizzy.vercel.app
            </a>
          </div>
        </section>
      </main>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("settings.resetTitle")}
        size="sm"
      >
        <p className="confirm-body">{t("settings.resetBody")}</p>
        <div className="confirm-actions">
          <Button variant="tinted" onClick={() => setResetOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={handleReset} icon="trash">
            {t("settings.resetEverything")}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t("settings.importData")}
        subtitle={importName}
        size="sm"
      >
        {pending ? (
          <>
            <p className="confirm-body">
              {t("settings.importSummary", {
                saves: pending.summary.saves,
                results: pending.summary.results,
                daily: pending.summary.daily,
              })}
            </p>
            <div className="confirm-actions">
              <Button variant="tinted" onClick={() => setPending(null)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={confirmImport} icon="upload">
                {t("settings.importData")}
              </Button>
            </div>
          </>
        ) : null}
      </Sheet>
    </div>
  );
}
