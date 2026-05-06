import { redirect } from "next/navigation";

/**
 * Default landing for /dashboard — sends to the Typer tab, matching the
 * v4 prototype's default view. Real content for each tab lives at
 * /dashboard/<slug>.
 */
export default function DashboardIndex() {
  redirect("/dashboard/typer");
}
