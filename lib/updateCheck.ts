/**
 * The CLI tells the user when npm has a newer oltc-selector. It never
 * installs anything: the notice names the command and stops there.
 * One registry call a day at most; the answer is cached on disk.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const UPDATE_TTL_MS = 24 * 60 * 60 * 1000;
const REGISTRY_LATEST = "https://registry.npmjs.org/oltc-selector/latest";

type Cache = { checkedAt: number; latest: string | null };

/** True when `latest` is a higher x.y.z than `current`. Anything unparsable is not newer. */
export function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!;
  }
  return false;
}

export function updateNotice(latest: string, current: string): string {
  return (
    `\n有新版本 oltc-selector ${latest}（当前 ${current}），不会自动更新。` +
    `\n需要时运行：npm i -g oltc-selector@latest，或用 npx -y oltc-selector@latest。\n`
  );
}

/** Off for CI, `--no-update-check`, OLTC_NO_UPDATE_CHECK and the common NO_UPDATE_NOTIFIER. */
export function updateCheckEnabled(
  argv: readonly string[],
  env: Record<string, string | undefined>,
): boolean {
  if (argv.includes("--no-update-check")) return false;
  if (env.OLTC_NO_UPDATE_CHECK || env.NO_UPDATE_NOTIFIER || env.CI) return false;
  return true;
}

export function defaultCacheFile(env: Record<string, string | undefined>): string {
  const base = env.XDG_CACHE_HOME || path.join(homedir(), ".cache");
  return path.join(base, "oltc-selector", "update-check.json");
}

async function fetchLatest(timeoutMs: number): Promise<string | null> {
  const res = await fetch(REGISTRY_LATEST, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { version?: unknown };
  return typeof body.version === "string" ? body.version : null;
}

function readCache(file: string): Cache | null {
  try {
    const c = JSON.parse(readFileSync(file, "utf8")) as Cache;
    return typeof c.checkedAt === "number" ? c : null;
  } catch {
    return null;
  }
}

function writeCache(file: string, c: Cache): void {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(c) + "\n");
  } catch {
    // A read-only home is not worth an error; the next run asks again.
  }
}

/**
 * The notice to print, or null. Uses the cached answer while it is fresh;
 * otherwise asks the registry once, with a short timeout. Never throws.
 */
export async function checkForUpdate(opts: {
  current: string;
  cacheFile: string;
  now?: number;
  timeoutMs?: number;
  fetchLatest?: (timeoutMs: number) => Promise<string | null>;
}): Promise<string | null> {
  const now = opts.now ?? Date.now();
  try {
    let latest: string | null;
    const cached = readCache(opts.cacheFile);
    if (cached && now - cached.checkedAt < UPDATE_TTL_MS) {
      latest = cached.latest;
    } else {
      latest = await (opts.fetchLatest ?? fetchLatest)(opts.timeoutMs ?? 1500).catch(
        () => cached?.latest ?? null,
      );
      writeCache(opts.cacheFile, { checkedAt: now, latest });
    }
    return latest && isNewer(latest, opts.current)
      ? updateNotice(latest, opts.current)
      : null;
  } catch {
    return null;
  }
}
