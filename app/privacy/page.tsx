import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";

export const metadata: Metadata = {
  title: "Privacy Policy · OLTC Selector",
  description: "Privacy policy for the personal OLTC Selector project.",
};

export default function PrivacyPage() {
  return <LegalView page="privacy" />;
}
