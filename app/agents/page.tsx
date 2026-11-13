import type { Metadata } from "next";
import { AgentsGuide } from "@/components/AgentsGuide";

export const metadata: Metadata = {
  title: "Let an AI assistant pick the type · OLTC Selector",
  description:
    "Send one line to your AI assistant. It runs oltc-selector from npm and picks a type from the catalogue.",
};

export default function AgentsPage() {
  return <AgentsGuide />;
}
