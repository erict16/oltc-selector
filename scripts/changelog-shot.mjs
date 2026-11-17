// Screenshot one page for the release notes, with headless Edge over CDP
// (or any Chromium: set SHOT_BROWSER to its binary, e.g. on a Mac).
// Run the version you want on its own port first (a git worktree of its
// tag, sharing this repo's node_modules), then:
//   node scripts/changelog-shot.mjs http://localhost:3101/ shot.png ["js to run first"]
// 1440x900 at 2x, Chinese, the Next.js dev badge removed. Hide any price
// block before the capture (v1.x showed list prices). Then save it as
// public/changelog/v<version>.webp, 1600 px wide (sharp), and add the path
// to RELEASE_META in lib/releaseNotes.ts.
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, js] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const edge =
  process.env.SHOT_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const prof = mkdtempSync(join(tmpdir(), "edgeshot-"));
const proc = spawn(edge, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--lang=zh-CN",
  `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
};
const send = (method, params = {}) =>
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(4000);
await send("Runtime.evaluate", { expression: "localStorage.setItem('oltc-selector-lang','zh');localStorage.setItem('oltc-lang','zh')" });
await send("Page.navigate", { url });
await sleep(5000);
if (js) {
  await send("Runtime.evaluate", { expression: js, awaitPromise: true });
  await sleep(2500);
}
await send("Runtime.evaluate", { expression: "document.querySelectorAll('nextjs-portal').forEach(e=>e.remove());window.scrollTo(0,0)" });
await sleep(300);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close();
proc.kill();
console.log("saved", out);
process.exit(0);
