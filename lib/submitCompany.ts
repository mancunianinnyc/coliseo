import { supabase } from "./supabase";

export interface SubmitCompanyInput {
  name: string;
  website: string;
  category: string;
  region: string;
  blurb?: string;
  logoUrl?: string;
}

export type SubmitCompanyOutcome =
  | { ok: true; id: number }
  | { ok: false; error: string; noBackend?: boolean };

// Calls the server-authoritative `submit_company` SECURITY DEFINER function.
// The database inserts the company as status='pending' (hidden from the arena
// until an admin approves it) and seeds its ratings. The client only reports the
// form fields and surfaces whatever the server returns.
export async function submitCompany(
  input: SubmitCompanyInput,
): Promise<SubmitCompanyOutcome> {
  if (!supabase) return { ok: false, error: "no-backend", noBackend: true };

  // Store a bare domain — the app prepends "https://" when linking, so a scheme
  // here would produce a broken "https://https://…" link on the profile.
  const website = input.website.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  const { data, error } = await supabase.rpc("submit_company", {
    p_name: input.name,
    p_website: website,
    p_category: input.category,
    p_region: input.region,
    p_blurb: input.blurb ?? null,
    p_logo_url: input.logoUrl ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data as number };
}
