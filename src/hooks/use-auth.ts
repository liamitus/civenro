"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { generateCitizenId, resolveUsername } from "@/lib/citizen-id";

const supabase = createSupabaseBrowserClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      // Backfill username for existing users who don't have one
      if (currentUser && _event === "SIGNED_IN") {
        const existing = currentUser.user_metadata?.username as string | undefined;
        if (!existing || existing === "Anonymous") {
          const username = resolveUsername(currentUser);
          await supabase.auth.updateUser({ data: { username } });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: generateCitizenId() } },
      });
      // If signup succeeds and we have the user ID, update with a
      // deterministic Citizen ID based on their actual UUID.
      if (!error && data.user) {
        const stableId = generateCitizenId(data.user.id);
        await supabase.auth.updateUser({ data: { username: stableId } });
      }
      return { error };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, loading, signIn, signUp, signOut };
}
