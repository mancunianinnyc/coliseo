"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface SessionState {
  userId: string | null; // the pseudonymous identity (anon auth.users id)
  ready: boolean; // auth has settled (session found or sign-in attempted)
  anonDisabled: boolean; // Supabase project has anonymous sign-ins turned off
}

// Establishes a *pseudonymous* identity via Supabase Anonymous Auth: no email,
// no name, no password — just a persistent auth.users row + JWT stored in
// localStorage, so a returning visitor keeps the same id (and their streak).
//
// Degrades gracefully:
//   - Supabase not configured  -> ready with userId null (local-only mode)
//   - anonymous sign-ins off   -> ready with userId null + anonDisabled true
// In both cases the app still runs on seed/loaded data; votes just aren't
// recorded and the streak isn't persisted until an identity exists.
export function useSession(): SessionState {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [anonDisabled, setAnonDisabled] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (active) {
          setUserId(session.user.id);
          setReady(true);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error) {
        // Most likely the project has anonymous sign-ins disabled — surface it
        // so the UI can hint at it, but don't block the app.
        if (error.message.toLowerCase().includes("anonymous")) setAnonDisabled(true);
        console.error("Anonymous sign-in failed:", error.message);
      }
      setUserId(data?.user?.id ?? null);
      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, ready, anonDisabled };
}
