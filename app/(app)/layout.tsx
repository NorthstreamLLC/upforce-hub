import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HubProvider } from "@/components/HubStore";
import { Shell } from "@/components/Shell";
import { getSignedInProfile, getWorkspace } from "@/lib/queries";

/**
 * Loads the workspace once per session entry and hands it to the client store.
 *
 * Rendered dynamically: this is an internal tool behind auth where a cached
 * pipeline would be worse than no pipeline.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSignedInProfile();
  if (!profile) redirect("/sign-in");

  const workspace = await getWorkspace();
  const theme =
    cookies().get("upf-theme")?.value === "light" ? "light" : "dark";

  return (
    <HubProvider initial={workspace} initialTheme={theme}>
      <Shell profile={profile}>{children}</Shell>
    </HubProvider>
  );
}
