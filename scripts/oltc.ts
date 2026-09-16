#!/usr/bin/env node
import { runCli } from "../lib/cli";

const code = runCli(process.argv.slice(2));
process.exit(code);
