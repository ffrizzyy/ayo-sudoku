import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseImport, type ImportResult } from "../engine";
import type { PuzzleDef } from "../engine/types";
import { useI18n } from "../i18n";
import { useToast } from "../app/toast";
import { useSettings } from "../app/settings";
import { Board } from "../ui/Board";
import { Button, Pill } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import { Icon } from "../ui/Icon";
import type { CellSnapshot } from "../app/storage";

const SAMPLE_GRID =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

function previewCells(puzzle: PuzzleDef): CellSnapshot[] {
  return puzzle.givens.split("").map((character) => {
    const value = Number(character) || 0;
    return { value, given: value > 0, corner: 0, center: 0, color: 0 };
  });
}

function errorMessage(error: string): string {
  const key = `import.errors.${error}`;
  return key;
}

interface ImportProps {
  initialCode?: string;
  onPlay: (puzzle: PuzzleDef) => void;
  onBack: () => void;
}

export function Import({ initialCode, onPlay, onBack }: ImportProps) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToast();
  const [input, setInput] = useState(initialCode ?? "");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"code" | "grid" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const parseId = useRef(0);

  const runParse = useCallback(
    (value: string) => {
      const text = value.trim();
      setError(null);
      setResult(null);
      setSource(null);
      if (!text) {
        setBusy(false);
        return;
      }
      setBusy(true);
      const id = ++parseId.current;
      window.setTimeout(() => {
        if (id !== parseId.current) return;
        const parsed = parseImport(text);
        setBusy(false);
        setResult(parsed);
        if (!parsed.ok) setError(errorMessage(parsed.error));
        else setSource(parsed.from);
      }, 260);
    },
    [],
  );

  useEffect(() => {
    runParse(input);
  }, [input, runParse]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        push(t("import.pasteEmpty"));
        return;
      }
      setInput(text.trim());
      textareaRef.current?.focus();
    } catch {
      push(t("import.pasteEmpty"));
      textareaRef.current?.focus();
    }
  };

  const puzzle = result?.ok ? result.puzzle : null;
  const cells = useMemo(() => (puzzle ? previewCells(puzzle) : []), [puzzle]);
  const noop = useCallback(() => undefined, []);

  return (
    <div className="import-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <button type="button" className="header-link" onClick={onBack}>
            <Icon name="arrow-left" size={17} /> {t("common.back")}
          </button>
          <h1>{t("import.title")}</h1>
          <p>{t("import.subtitle")}</p>
        </div>
      </header>

      <main className="import-main">
        <section className="import-card">
          <div className="card-head">
            <h2>{t("import.codeLabel")}</h2>
            <Pill tone="neutral">81 / 36 / 16</Pill>
          </div>
          <textarea
            ref={textareaRef}
            className="import-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("import.placeholder")}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={5}
            aria-label={t("import.placeholder")}
          />
          <div className="import-actions">
            <Button variant="tinted" icon="clipboard" onClick={() => void paste()}>
              {t("import.paste")}
            </Button>
            <Button variant="plain" icon="grid" onClick={() => setInput(SAMPLE_GRID)}>
              {t("import.sample")}
            </Button>
            {input ? (
              <button type="button" className="text-button" onClick={() => setInput("")}>
                {t("game.clear")}
              </button>
            ) : null}
          </div>
          {busy ? (
            <p className="import-status is-busy">
              <span className="spinner" /> {t("import.loading")}
            </p>
          ) : null}
          {error ? (
            <p className="import-status is-error" role="alert">
              <Icon name="alert" size={17} /> {t(error)}
            </p>
          ) : null}
        </section>

        <div className="import-side">
          {puzzle ? (
            <section className="import-preview-card">
              <div className="card-head">
                <h2>{t("import.preview")}</h2>
                <div className="import-pills">
                  <Pill tone="accent">{t(`tier.${puzzle.tier}`)}</Pill>
                  <Pill tone="neutral">{puzzle.spec.size}×{puzzle.spec.size}</Pill>
                  <Pill tone="neutral">
                    {source === "code" ? t("import.fromTemplate") : t("import.fromGrid")}
                  </Pill>
                </div>
              </div>
              <div className="import-board-preview">
                <Board
                  spec={puzzle.spec}
                  cells={cells}
                  selected={new Set()}
                  wrong={new Set()}
                  highlightSame={false}
                  highlightPeers={false}
                  highlightCandidates
                  digitStyle={settings.digitStyle}
                  onSelect={noop}
                />
              </div>
              <div className="import-meta">
                <span>
                  <strong>{puzzle.givens.replace(/0/g, "").length}</strong> {t("game.clues")}
                </span>
                <span>
                  {t("common.difficulty")}: <strong>{t(`tier.${puzzle.tier}`)}</strong>
                </span>
              </div>
              <Button
                variant="primary"
                size="lg"
                full
                icon="play"
                onClick={() => onPlay(puzzle)}
              >
                {t("import.play")}
              </Button>
            </section>
          ) : null}

          <section className="import-help">
            <h2>
              <Icon name="info" size={18} /> {t("import.title")}
            </h2>
            <p>{t("import.subtitle")}</p>
            <p className="import-help-note">{t("import.helpNote")}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
