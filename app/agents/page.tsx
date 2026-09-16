import type { Metadata } from "next";
import { AgentsGuide } from "@/components/AgentsGuide";

export const metadata: Metadata = {
  title: "Hand selection to an assistant · OLTC Selector",
  description:
    "Download the WorkBuddy skill pack. It installs oltc and picks a type from the catalogue.",
};

export default function AgentsPage() {
  return <AgentsGuide />;
}
