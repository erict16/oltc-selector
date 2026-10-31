#!/usr/bin/env node
import { APP_VERSION } from "../lib/appVersion";
import { runCli } from "../lib/cli";
import {
  checkForUpdate,
  defaultCacheFile,
  updateCheckEnabled,
} from "../lib/updateCheck";

const argv = process.argv.slice(2);
const code = runCli(argv);
// Tell, never install. stderr keeps --json output clean.
if (updateCheckEnabled(argv, process.env)) {
  const notice = await checkForUpdate({
    current: APP_VERSION,
    cacheFile: defaultCacheFile(process.env),
  });
  if (notice) process.stderr.write(notice);
}
process.exit(code);
