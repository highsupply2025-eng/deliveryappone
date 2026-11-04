import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // If accessing courier route, forward cleanly to /captain so unauthenticated or pending drivers are not trapped
    if (location.pathname === "/courier" || location.pathname.startsWith("/courier/")) {
      throw redirect({ to: "/captain" });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
