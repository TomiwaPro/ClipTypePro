import { StubPage } from "@/components/dashboard/stub-page";

export default function BillingPage() {
  return (
    <StubPage
      title="Billing & Subscription"
      subtitle="Manage your plan, payment method, and invoices"
      comingIn="Step 8"
      bullets={[
        "Current plan + monthly/annual toggle",
        "Stripe customer portal link (manage card, cancel)",
        "Promo / coupon codes (STAY50, LAUNCH30, PRO50)",
        "Invoice history with PDF download",
        "Pre-cancel churn modal with 50%-off save offer",
      ]}
    />
  );
}
