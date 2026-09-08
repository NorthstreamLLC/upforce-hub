import type { MetadataRoute } from "next";

/**
 * Deny everything.
 *
 * Hub is an internal tool: there is no page here a search engine should have.
 * The page metadata already sends noindex, but that only reaches a crawler
 * that has fetched the page — this stops it at the door.
 *
 * Middleware lets this path through unauthenticated on purpose. A crawler is
 * by definition not signed in, so redirecting it to /sign-in would mean the
 * file is never delivered and the instruction never received. It gives nothing
 * away: it names no paths, only "stay out".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
