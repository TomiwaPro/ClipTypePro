import { HelpClient } from "@/components/dashboard/help/help-client";

export const dynamic = "force-static";

/**
 * Help — searchable FAQ + keyboard shortcuts + support entry points.
 *
 * Server component is just a shell so the route works without auth;
 * the FAQ content is bundled into the client component (it doesn't
 * change often, no need to round-trip a DB query).
 */
export default function HelpPage() {
  return <HelpClient />;
}
