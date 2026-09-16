import type { Metadata } from "next";
import { AgentsGuide } from "@/components/AgentsGuide";

export const metadata: Metadata = {
  title: "Hand selection to an AI assistant · OLTC Selector",
  description:
    "Use the same OLTC engine from WorkBuddy, ChatGPT, or another agent via the oltc CLI.",
};

export default function AgentsPage() {
  return <AgentsGuide />;
}
