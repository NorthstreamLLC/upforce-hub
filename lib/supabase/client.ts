import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser components.
 *
 * The publishable key is safe here by design - Row Level Security is what
 * protects the data, and every table in this app requires an authenticated
 * session before it returns a single row.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
