import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";

export const metadata: Metadata = {
  title: "Terms of Use · OLTC Selector",
  description: "Terms of use for the personal OLTC Selector project.",
};

export default function TermsPage() {
  return <LegalView page="terms" />;
}
