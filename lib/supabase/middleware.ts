import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the auth session on every request and guards the routes.
 *
 * Server Components cannot write cookies, so without this a session would
 * expire mid-use and the app would start behaving as if nobody was signed in.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /* Middleware runs before every page, so anything thrown here takes the whole
     site down with a 500 that names no cause. Missing configuration is the
     common way to get there, so say so plainly rather than crashing. */
  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(" and ");

    return new NextResponse(
      `Not configured: ${missing} is missing.\n\n` +
        "On Vercel: Project > Settings > Environment Variables, add it for " +
        "Production, then redeploy - variables are baked in at build time, so " +
        "adding one to an existing deployment does nothing until it rebuilds.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  /* Do not remove: this call is what actually refreshes an expiring token.

     Wrapped because a network blip reaching Supabase would otherwise crash
     middleware and take down every route at once. Treating a failure as "not
     signed in" degrades to the sign-in page, which is safe and recoverable. */
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/sign-in") ||
    path.startsWith("/auth") ||
    path === "/robots.txt";

  if (!user && !isPublic) {
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    return NextResponse.redirect(target);
  }

  if (user && path === "/sign-in") {
    const target = request.nextUrl.clone();
    target.pathname = "/today";
    return NextResponse.redirect(target);
  }

  return response;
}
