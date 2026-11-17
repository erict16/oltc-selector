import type { Metadata } from "next";
import { AgentsGuide } from "@/components/AgentsGuide";

export const metadata: Metadata = {
  title: "CLI · OLTC Selector",
  description:
    "oltc picks the tap-changer type from the command line, with the same engine as the web page. Or send one line to an AI assistant and let it run oltc for you.",
};

export default function AgentsPage() {
  return <AgentsGuide />;
}
