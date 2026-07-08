import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Present only when the app is actually configured to talk to Supabase —
// callers fall back to seed data when this is null (see lib/loadCompanies.ts).
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
