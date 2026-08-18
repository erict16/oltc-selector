/**
 * Anthony QS gold corpus. Corpus agent fills these arrays.
 * orderReplay concatenates them onto Qu-ET260001–013 — do not drop those.
 */
import type { ReplayCase } from "./orderReplay";

export type AnthonyFileRow = {
  file: string;
  qsNo: string;
  revision: string;
  /** Latest R kept; older revisions collapsed. */
  superseded?: boolean;
  unread?: boolean;
  unreadReason?: string;
};

export const ANTHONY_FILES: AnthonyFileRow[] = [];

export const ANTHONY_REPLAY: ReplayCase[] = [];

export const ANTHONY_REPLAY_SKIPPED: Array<{
  id: string;
  source: string;
  reason: string;
}> = [];
