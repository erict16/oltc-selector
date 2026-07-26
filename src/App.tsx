import { useMemo, useState } from "react";
import { FIXTURES, selectOltc } from "./lib/engine";
import type { Lang, ModelResult, SelectInput } from "./lib/types";
import { t } from "./i18n/messages";
import { positionsFromPlusMinus } from "./lib/tapCode";

const defaultInput: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv: 72.5,
  stepVoltageV: 1500,
  regulation: "reversing",
  positions: 19,
  pitch: 10,
  midPositions: 3,
  selectorSize: "auto",
  mdu: "auto",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [input, setInput] = useState<SelectInput>(defaultInput);
  const [pm, setPm] = useState<string>("9");
  const [advanced, setAdvanced] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [ran, setRan] = useState(true);

  const patch = <K extends keyof SelectInput>(key: K, value: SelectInput[K]) => {
    setInput((s) => ({ ...s, [key]: value }));
    setRan(true);
  };

  const output = useMemo(() => selectOltc(input), [input]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  const applyPm = (raw: string) => {
    setPm(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      patch("plusMinusSteps", undefined);
      return;
    }
    const pos = positionsFromPlusMinus(n);
    setInput((s) => ({
      ...s,
      plusMinusSteps: n,
      positions: pos,
    }));
    setRan(true);
  };

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Huaming · OLTC</p>
          <h1>{t(lang, "brand")}</h1>
          <p className="tagline">{t(lang, "tagline")}</p>
        </div>
        <button
          type="button"
          className="lang-btn"
          onClick={() => setLang((l) => (l === "en" ? "zh" : "en"))}
        >
          {t(lang, "lang")}
        </button>
      </header>

      <p className="banner">{t(lang, "disclaimer")}</p>

      <div className="presets">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setInput({ ...FIXTURES.ueHwv.input });
            setPm("9");
            setRan(true);
          }}
        >
          {t(lang, "presetUe")}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setInput({ ...FIXTURES.wilsonShzv.input });
            setPm("");
            setRan(true);
          }}
        >
          {t(lang, "presetShzv")}
        </button>
      </div>

      <div className="layout">
        <form
          className="panel form"
          onSubmit={(e) => {
            e.preventDefault();
            setRan(true);
          }}
        >
          <h2>{t(lang, "apply")}</h2>
          <div className="grid2">
            <Field label={t(lang, "mounting")}>
              <select
                value={input.mounting}
                onChange={(e) =>
                  patch("mounting", e.target.value as SelectInput["mounting"])
                }
              >
                <option value="in_tank">{t(lang, "mount_in_tank")}</option>
                <option value="on_tank">{t(lang, "mount_on_tank")}</option>
                <option value="external_compartment">
                  {t(lang, "mount_external_compartment")}
                </option>
                <option value="dry_type">{t(lang, "mount_dry_type")}</option>
                <option value="reactor">{t(lang, "mount_reactor")}</option>
              </select>
            </Field>
            <Field label={t(lang, "medium")}>
              <select
                value={input.medium}
                onChange={(e) =>
                  patch("medium", e.target.value as SelectInput["medium"])
                }
              >
                <option value="oil_vacuum">{t(lang, "med_oil_vacuum")}</option>
                <option value="oil">{t(lang, "med_oil")}</option>
                <option value="dry">{t(lang, "med_dry")}</option>
              </select>
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={input.preferVacuum}
              onChange={(e) => patch("preferVacuum", e.target.checked)}
            />
            {t(lang, "preferVacuum")}
          </label>

          <h2>{t(lang, "electrical")}</h2>
          <div className="grid2">
            <Field label={t(lang, "phases")}>
              <select
                value={input.phases}
                onChange={(e) =>
                  patch("phases", e.target.value as SelectInput["phases"])
                }
              >
                <option value="III">III (3φ)</option>
                <option value="II">II (2φ)</option>
                <option value="I">I (1φ)</option>
              </select>
            </Field>
            <Field label={t(lang, "connection")}>
              <select
                value={input.connection}
                onChange={(e) =>
                  patch(
                    "connection",
                    e.target.value as SelectInput["connection"],
                  )
                }
              >
                <option value="Y">Y</option>
                <option value="D">D</option>
                <option value="any">—</option>
              </select>
            </Field>
            <Field label={t(lang, "throughCurrent")}>
              <input
                type="number"
                min={1}
                step={1}
                value={input.throughCurrentA}
                onChange={(e) =>
                  patch("throughCurrentA", Number(e.target.value))
                }
              />
            </Field>
            <Field label={t(lang, "um")}>
              <input
                type="number"
                min={1}
                step={0.1}
                value={input.umKv}
                onChange={(e) => patch("umKv", Number(e.target.value))}
              />
            </Field>
            <Field label={t(lang, "stepV")}>
              <input
                type="number"
                min={0}
                step={1}
                value={input.stepVoltageV}
                onChange={(e) => patch("stepVoltageV", Number(e.target.value))}
              />
            </Field>
            <Field label={t(lang, "switches")}>
              <input
                type="number"
                min={0}
                value={input.switchesPerDay ?? ""}
                onChange={(e) =>
                  patch(
                    "switchesPerDay",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </Field>
          </div>

          <h2>{t(lang, "tapping")}</h2>
          <div className="grid2">
            <Field label={t(lang, "regulation")}>
              <select
                value={input.regulation}
                onChange={(e) =>
                  patch(
                    "regulation",
                    e.target.value as SelectInput["regulation"],
                  )
                }
              >
                <option value="reversing">{t(lang, "reg_reversing")}</option>
                <option value="linear">{t(lang, "reg_linear")}</option>
                <option value="coarse_fine">
                  {t(lang, "reg_coarse_fine")}
                </option>
              </select>
            </Field>
            <Field label={t(lang, "pmSteps")}>
              <input
                type="number"
                min={0}
                value={pm}
                onChange={(e) => applyPm(e.target.value)}
                placeholder="e.g. 8 → 19 pos"
              />
            </Field>
            <Field label={t(lang, "positions")}>
              <input
                type="number"
                min={1}
                value={input.positions ?? ""}
                onChange={(e) =>
                  patch(
                    "positions",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </Field>
            <Field label={t(lang, "selectorSize")}>
              <select
                value={input.selectorSize ?? "auto"}
                onChange={(e) =>
                  patch(
                    "selectorSize",
                    e.target.value as SelectInput["selectorSize"],
                  )
                }
              >
                <option value="auto">{t(lang, "size_auto")}</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="DE">DE</option>
              </select>
            </Field>
            <Field label={t(lang, "mdu")}>
              <select
                value={input.mdu ?? "auto"}
                onChange={(e) =>
                  patch("mdu", e.target.value as SelectInput["mdu"])
                }
              >
                <option value="auto">Auto</option>
                <option value="CMA7">CMA7</option>
                <option value="SHM-D">SHM-D</option>
                <option value="SHM-DA">SHM-DA</option>
                <option value="none">—</option>
              </select>
            </Field>
          </div>

          <button
            type="button"
            className="linkish"
            onClick={() => setAdvanced((a) => !a)}
          >
            {advanced ? t(lang, "hideAdvanced") : t(lang, "showAdvanced")}
          </button>

          {advanced && (
            <>
              <h3>{t(lang, "advanced")}</h3>
              <div className="grid2">
                <Field label={t(lang, "pitch")}>
                  <select
                    value={input.pitch ?? 10}
                    onChange={(e) =>
                      patch(
                        "pitch",
                        Number(e.target.value) as SelectInput["pitch"],
                      )
                    }
                  >
                    {[10, 12, 14, 16, 18].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t(lang, "mid")}>
                  <select
                    value={input.midPositions ?? 3}
                    onChange={(e) =>
                      patch(
                        "midPositions",
                        Number(e.target.value) as 0 | 1 | 3,
                      )
                    }
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={3}>3</option>
                  </select>
                </Field>
                <Field label={t(lang, "bil")}>
                  <input
                    type="number"
                    value={input.bilKv ?? ""}
                    onChange={(e) =>
                      patch(
                        "bilKv",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label={t(lang, "pf")}>
                  <input
                    type="number"
                    value={input.pfKv ?? ""}
                    onChange={(e) =>
                      patch(
                        "pfKv",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </div>
            </>
          )}

          <div className="actions">
            <button type="submit" className="primary">
              {t(lang, "select")}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setInput(defaultInput);
                setPm("9");
              }}
            >
              {t(lang, "reset")}
            </button>
          </div>
        </form>

        <section className="panel results">
          <h2>{t(lang, "results")}</h2>
          <div className="how">
            <strong>{t(lang, "howTitle")}</strong>
            <p>{t(lang, "howBody")}</p>
            <p className="muted">{t(lang, "hwvNote")}</p>
          </div>

          {ran && !output.ok && (
            <div className="error-box">
              {(lang === "zh" ? output.errorsZh : output.errorsEn).map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          {ran &&
            output.ok &&
            output.results.map((r, i) => (
              <ResultCard
                key={r.modelWithMdu + i}
                r={r}
                lang={lang}
                primary={i === 0}
                copied={copied}
                onCopy={copy}
              />
            ))}
        </section>
      </div>

      <footer className="foot">{t(lang, "footer")}</footer>
    </div>
  );
}

function ResultCard({
  r,
  lang,
  primary,
  copied,
  onCopy,
}: {
  r: ModelResult;
  lang: Lang;
  primary: boolean;
  copied: string | null;
  onCopy: (s: string) => void;
}) {
  const reasons = lang === "zh" ? r.reasonsZh : r.reasonsEn;
  const warnings = lang === "zh" ? r.warningsZh : r.warningsEn;
  return (
    <article className={`card ${primary ? "card-primary" : ""}`}>
      {primary && <span className="badge">#1</span>}
      <code className="model">{r.modelWithMdu}</code>
      <p className="model-sub">{r.model}</p>
      <div className="meta-row">
        <span>
          Um {r.umToken}
          {r.selectorSize ? ` · size ${r.selectorSize}` : ""}
        </span>
        <span>
          {r.connection} · {r.currentA} A · {r.phases}
        </span>
        <span>
          {r.tapCode} · {r.positions} pos
        </span>
        <span>
          {t(lang, "confidence")} {(r.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="card-actions">
        <button type="button" className="primary" onClick={() => onCopy(r.modelWithMdu)}>
          {copied === r.modelWithMdu ? t(lang, "copied") : t(lang, "copy")}
        </button>
        <button type="button" className="ghost" onClick={() => onCopy(r.model)}>
          {lang === "zh" ? "复制（无机构）" : "Copy without MDU"}
        </button>
      </div>
      <details open={primary}>
        <summary>{t(lang, "reasons")}</summary>
        <ul>
          {reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>{t(lang, "warnings")}</summary>
        <ul className="warn">
          {warnings.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
