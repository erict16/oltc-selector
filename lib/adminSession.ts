const STORAGE_KEY = "oltc-selector:admin";

const adminSubs = new Set<() => void>();

function configuredHash(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_PASSWORD_SHA256 ?? "")
    .trim()
    .toLowerCase();
}

export function isAdminConfigured(): boolean {
  return /^[0-9a-f]{64}$/.test(configuredHash());
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

export function readAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
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

export async function tryAdminLogin(password: string): Promise<boolean> {
  const want = configuredHash();
  if (!want) return false;
  const got = await sha256Hex(password);
  if (got !== want) return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    return false;
  }
  emitAdmin();
  return true;
}

export function adminLogout() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emitAdmin();
}
