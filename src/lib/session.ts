import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "restaurant" | "courier" | "customer";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let currentId: string | null | undefined;

    const loadRole = async (u: User | null) => {
      const version = ++generation;
      currentId = u?.id ?? null;
      if (active) {
        setUser(u);
        setLoading(true);
      }
      if (!u) {
        if (active) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id);

        if (!active || version !== generation) return;

        const roles = (data ?? []).map((r) => r.role as AppRole);
        const metaRole = u.user_metadata?.role as AppRole | undefined;
        if (metaRole && !roles.includes(metaRole)) {
          roles.push(metaRole);
        }

        const priority: AppRole[] = ["admin", "restaurant", "courier", "customer"];
        setRole(priority.find((p) => roles.includes(p)) ?? metaRole ?? "customer");
      } catch (err) {
        console.error("Failed to load user role:", err);
        const metaRole = u.user_metadata?.role as AppRole | undefined;
        if (active && version === generation) {
          setRole(metaRole ?? "customer");
        }
      } finally {
        if (active && version === generation) {
          setLoading(false);
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) void loadRole(session?.user ?? null);
      });
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void loadRole(data.session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading };
}

export function dashboardPathFor(role: AppRole | null): string {
  if (role === "admin") return "/admin-app";
  if (role === "restaurant") return "/vendor";
  if (role === "courier") return "/captain";
  return "/orders";
}
