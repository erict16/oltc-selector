import { writeFileSync } from "node:fs";
import {
  ORDER_REPLAY_SKIPPED,
  formatReplayMarkdown,
  runOrderReplay,
} from "../lib/orderReplay";

const out = process.argv[2];
if (!out) {
  console.error("usage: npx vite-node scripts/write-order-replay.ts <out.md>");
  process.exit(2);
}
const rows = runOrderReplay();
let md = formatReplayMarkdown(rows);
md += "\n## Skipped\n\n";
for (const s of ORDER_REPLAY_SKIPPED) {
  md += `- **${s.id}** — ${s.source}: ${s.reason}\n`;
}
writeFileSync(out, md);
const failed = rows.filter((r) => !r.pass);
console.log(`wrote ${out} (${rows.length} rows, ${failed.length} failed)`);
if (failed.length) process.exit(1);
