import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/lib/landing/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy — ClipType Pro",
  description: "How ClipType Pro collects, uses, stores, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={PRIVACY_LAST_UPDATED}
      sections={PRIVACY_SECTIONS}
    />
  );
}
