import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer role check
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", newSession.user.id);
          const roles = (data ?? []).map((r) => r.role);
          setIsSuperAdmin(roles.includes("super_admin"));
          setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
        }, 0);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .then(({ data }) => {
            const roles = (data ?? []).map((r) => r.role);
            setIsSuperAdmin(roles.includes("super_admin"));
            setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
          });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, isAdmin, isSuperAdmin, loading, signOut };
};
