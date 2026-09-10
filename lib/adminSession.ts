const STORAGE_KEY = "oltc-selector:admin";
const ADMIN_USER = "admin";
/** sha256("hm112233") — env NEXT_PUBLIC_ADMIN_PASSWORD_SHA256 overrides. */
const DEFAULT_PASSWORD_SHA256 =
  "487d4dd31f7fed4476ac4f22774fcabd63505c36703e8df36e8afe38f5eec51a";

const adminSubs = new Set<() => void>();

function configuredHash(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_PASSWORD_SHA256 ?? "")
    .trim()
    .toLowerCase();
  if (/^[0-9a-f]{64}$/.test(fromEnv)) return fromEnv;
  return DEFAULT_PASSWORD_SHA256;
}

export function isAdminConfigured(): boolean {
  return /^[0-9a-f]{64}$/.test(configuredHash());
}

export function isAdminUser(name: string): boolean {
  return name.trim() === ADMIN_USER;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function storageGet(which: "local" | "session"): boolean {
  try {
    const store = which === "local" ? localStorage : sessionStorage;
    return store.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function storageSet(which: "local" | "session", on: boolean) {
  try {
    const store = which === "local" ? localStorage : sessionStorage;
    if (on) store.setItem(STORAGE_KEY, "1");
    else store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  return storageGet("local") || storageGet("session");
}

function emitAdmin() {
  adminSubs.forEach((fn) => fn());
}

export function subscribeAdmin(fn: () => void) {
  adminSubs.add(fn);
  return () => {
    adminSubs.delete(fn);
  };
}

export function getAdminSnapshot(): boolean {
  return readAdminSession();
}

export function getServerAdmin(): boolean {
  return false;
}

export async function tryAdminLogin(
  user: string,
  password: string,
  remember = false,
): Promise<boolean> {
  if (!isAdminUser(user)) return false;
  const want = configuredHash();
  if (!want) return false;
  const got = await sha256Hex(password);
  if (got !== want) return false;
  storageSet("local", remember);
  storageSet("session", !remember);
  emitAdmin();
  return true;
}

export function adminLogout() {
  storageSet("local", false);
  storageSet("session", false);
  emitAdmin();
}
