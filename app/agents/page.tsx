import type { Metadata } from "next";
import { AgentsGuide } from "@/components/AgentsGuide";

export const metadata: Metadata = {
  title: "Let an AI assistant pick the type · OLTC Selector",
  description:
    "Download the skill pack and upload it to your AI assistant. It installs oltc and picks a type from the catalogue.",
};

export default function AgentsPage() {
  return <AgentsGuide />;
}
