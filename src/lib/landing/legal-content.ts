/**
 * Legal copy. Centralised for consistency between /privacy and /tos.
 * Update `lastUpdated` whenever a section changes — and ideally bump
 * the version in a database column so existing users get re-prompted
 * to re-accept (out of scope for now).
 */

export type LegalSection = { title: string; body: string };

export const PRIVACY_LAST_UPDATED = "April 28, 2026";
export const TOS_LAST_UPDATED = "April 28, 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Data We Collect",
    body: "We collect only what is necessary: your name, email address, and billing information. We do NOT collect, store, or transmit clipboard content. All clipboard processing happens locally on your device.",
  },
  {
    title: "How We Use Your Data",
    body: "Your data is used solely to operate your account, process payments, and provide support. We never sell your data. We never use it for advertising. We never share it with third parties except payment processors (Stripe) under strict data processing agreements.",
  },
  {
    title: "Cookies",
    body: "We use only essential cookies required to operate the Service. We do not use advertising cookies, tracking pixels, or third-party analytics. You may reject non-essential cookies without losing any functionality.",
  },
  {
    title: "Data Retention",
    body: "Account data is retained while your account is active. Session metadata logs retained for 30 days (configurable for Enterprise). On account deletion, all data is permanently erased within 30 days. Billing records retained 7 years as required by law.",
  },
  {
    title: "Your Rights",
    body: "You have the right to access, correct, export, or delete your personal data at any time. Submit requests via Settings > Privacy & Data, or email privacy@cliptypepro.com. We respond within 30 days. EU/UK users may lodge complaints with their national data protection authority.",
  },
  {
    title: "Security",
    body: "All data in transit is encrypted using TLS 1.3. Data at rest is encrypted using AES-256. We conduct annual third-party penetration tests. We operate a responsible disclosure programme at security@cliptypepro.com.",
  },
];

export const TOS_SECTIONS: LegalSection[] = [
  {
    title: "Acceptance",
    body: "By creating an account or using ClipType Pro, you agree to these Terms. If you do not agree, do not use the Service.",
  },
  {
    title: "Acceptable Use",
    body: "You may use ClipType Pro for legitimate productivity, professional, accessibility, and personal purposes. You must not use the Service for academic dishonesty, fraud, phishing, identity theft, or any activity that violates applicable law.",
  },
  {
    title: "Academic Integrity",
    body: "ClipType Pro automatically detects and disables itself when proctoring software is active. Users agree not to circumvent these protections.",
  },
  {
    title: "Subscriptions & Billing",
    body: "Subscriptions renew automatically. Cancel anytime. Refunds available within 14 days of any charge where the Service has not been substantially used. Prices in USD.",
  },
  {
    title: "Liability",
    body: "ClipType Pro Ltd accepts no liability for account suspensions resulting from use on third-party platforms. Total liability shall not exceed amounts paid in the 12 months preceding any claim.",
  },
  {
    title: "Governing Law",
    body: "These Terms are governed by the laws of England and Wales. Disputes subject to the exclusive jurisdiction of the courts of England and Wales.",
  },
];
