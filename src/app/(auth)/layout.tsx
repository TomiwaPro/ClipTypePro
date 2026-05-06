/**
 * Marker layout for the (auth) route group. The AuthCard component
 * provides the visual frame; this layout just exists to make the route
 * group concrete and to hold any future shared providers (sonner toaster,
 * etc.) for unauthenticated routes.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
