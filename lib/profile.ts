import { supabase } from "./supabase";
import { tierFor } from "./elo";

export interface ProfileState {
  streak: number;
  tier: string;
  lastActive: string | null; // YYYY-MM-DD
}

const DEFAULT_PROFILE: ProfileState = { streak: 0, tier: "Rookie", lastActive: null };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Loads the pseudonymous user's streak/tier from `profiles`, creating the row
// on first visit. RLS lets an authenticated (incl. anonymous) user read/upsert
// only their own row, so this is safe to run client-side.
export async function loadOrCreateProfile(userId: string): Promise<ProfileState> {
  if (!supabase) return DEFAULT_PROFILE;

  const { data, error } = await supabase
    .from("profiles")
    .select("streak, tier, last_active_date")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile load failed:", error.message);
    return DEFAULT_PROFILE;
  }
  if (data) {
    return { streak: data.streak, tier: data.tier, lastActive: data.last_active_date };
  }

  const { error: insertErr } = await supabase
    .from("profiles")
    .insert({ id: userId, streak: 0, tier: "Rookie" });
  if (insertErr) console.error("Profile create failed:", insertErr.message);
  return DEFAULT_PROFILE;
}

// Persists a streak change (keeps tier + last_active_date in sync). Derives the
// tier from the streak via the same pure lib/elo helper the UI uses.
export async function saveStreak(userId: string, streak: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    streak,
    tier: tierFor(streak).name,
    last_active_date: today(),
  });
  if (error) console.error("Streak save failed:", error.message);
}
