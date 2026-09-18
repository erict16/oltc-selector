import type { Metadata } from "next";
import { ChangelogView } from "@/components/ChangelogView";

export const metadata: Metadata = {
  title: "更新记录 · OLTC Selector",
  description: "Release notes for the OLTC Selector.",
};

export default function ChangelogPage() {
  return <ChangelogView />;
}
