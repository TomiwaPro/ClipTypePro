import { redirect } from "next/navigation";

/**
 * Public referral landing — anyone hitting /ref/<code> bounces to
 * /signup?ref=<code>. The signup flow consumes the code at sign-up
 * time and (in a follow-up) writes a referrals row for the referrer.
 *
 * No DB lookup here on purpose: an invalid code still lands the
 * visitor on signup with no friction. The referrer-resolution happens
 * server-side at signup, where we already know the new user's id.
 */

type Params = Promise<{ code: string }>;

export default async function RefPage({ params }: { params: Params }) {
  const { code } = await params;
  // Strip anything that isn't a base-36 character so we can't be used
  // as an open redirect or to inject query-string fragments.
  const safe = (code ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 32);
  redirect(`/signup?ref=${encodeURIComponent(safe)}`);
}
