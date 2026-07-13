"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface SessionState {
  userId: string | null; // the pseudonymous identity (anon auth.users id)
  ready: boolean; // auth has settled (existing session restored, or none found)
  anonDisabled: boolean; // Supabase project has anonymous sign-ins turned off
  // Returns the pseudonymous user id, minting the anonymous identity ON FIRST
  // USE (first vote / submission) rather than on page load. Resolves null when
  // Supabase isn't configured or anonymous sign-ins are off.
  ensureUserId: () => Promise<string | null>;
}

// Establishes a *pseudonymous* identity via Supabase Anonymous Auth: no email,
// no name, no password — just a persistent auth.users row + JWT stored in
// localStorage, so a returning visitor keeps the same id (and their streak).
//
// LAZY BY DESIGN: on load we only *restore* an existing session (a local
// operation — no auth API call). A brand-new visitor gets no auth.users row
// until they actually do something worth recording (vote, mark unknown,
// submit). This keeps a traffic spike of drive-by visitors from exhausting
// Supabase's anonymous sign-in rate limits — and from minting junk users.
//
// Degrades gracefully:
//   - Supabase not configured  -> ready with userId null (local-only mode)
//   - anonymous sign-ins off   -> ensureUserId() resolves null + anonDisabled
// In both cases the app still runs on seed/loaded data; votes just aren't
// recorded and the streak isn't persisted until an identity exists.
export function useSession(): SessionState {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [anonDisabled, setAnonDisabled] = useState(false);
  // Dedupes concurrent ensureUserId() calls so a burst (e.g. vote + unknown
  // flag in quick succession) mints exactly one anonymous identity.
  const pendingSignIn = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    (async () => {
      // Local-only: reads the persisted JWT from localStorage. Returning
      // visitors resume their identity with zero auth API traffic.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      setUserId(session?.user?.id ?? null);
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

  const ensureUserId = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return session.user.id;

    if (!pendingSignIn.current) {
      pendingSignIn.current = supabase.auth
        .signInAnonymously()
        .then(({ data, error }) => {
          if (error) {
            // Most likely the project has anonymous sign-ins disabled —
            // surface it so the UI can hint at it, but don't block the app.
            if (error.message.toLowerCase().includes("anonymous")) setAnonDisabled(true);
            console.error("Anonymous sign-in failed:", error.message);
            return null;
          }
          return data?.user?.id ?? null;
          // userId state updates via onAuthStateChange.
        })
        .finally(() => {
          pendingSignIn.current = null;
        });
    }
    return pendingSignIn.current;
  }, []);

  return { userId, ready, anonDisabled, ensureUserId };
}
