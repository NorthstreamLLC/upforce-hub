import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST only.
 *
 * A GET here would let any page on the internet sign the user out by embedding
 * an image pointing at this URL.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${request.nextUrl.origin}/sign-in`, {
    status: 303,
  });
}
