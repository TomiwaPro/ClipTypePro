import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { TOS_LAST_UPDATED, TOS_SECTIONS } from "@/lib/landing/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service — ClipType Pro",
  description: "The terms governing your use of ClipType Pro.",
};

export default function TosPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={TOS_LAST_UPDATED}
      sections={TOS_SECTIONS}
    />
  );
}
