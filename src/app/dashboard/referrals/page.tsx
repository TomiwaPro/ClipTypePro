import { StubPage } from "@/components/dashboard/stub-page";

export default function ReferralsPage() {
  return (
    <StubPage
      title="Referral Programme"
      subtitle="Invite friends — earn free Pro months for every conversion"
      comingIn="Step 7"
      bullets={[
        "Personal referral code + shareable link",
        "Tracks invited / signed-up / converted (powered by referrals table)",
        "1 free Pro month per conversion (unlimited)",
        "Service-role webhook flips status when invited user upgrades",
      ]}
    />
  );
}
