import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/content/cache-tags";
import { HERO_TOP_RATED_QUERY } from "@/lib/content/queries";
import type { Review } from "@/lib/content/types";
import { client } from "@/sanity/client";

/**
 * The homepage hero's data: a feature review and an all-time TOP 10.
 * `HeroSection` renders it and `ReviewsSection` excludes the feature; both
 * call `getHeroPool()` and share one cached fetch.
 */

/** How far back "lately" reaches. */
const WINDOW_DAYS = 30;

/** Midnight UTC, WINDOW_DAYS ago. Rounded to the day so the query params are
 *  stable and an identical call inside the same cache scope hits. */
function windowStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS);
  return d.toISOString();
}

export interface HeroPool {
  /** The featured review: best score in the window, or of all time when the window is empty. */
  feature: Review | undefined;
  /** The ten best-scored reviews of all time, ranked. May include `feature`. */
  topTen: Review[];
}

export async function getHeroPool(): Promise<HeroPool> {
  // `use cache` here does double duty. It caches the query, and it is also the
  // documented fix for the `new Date()` inside windowStart(): Cache Components
  // refuses to prerender an unstable value unless it sits in a cached scope,
  // and the cutoff is deliberately rounded to the day so the cache key is
  // stable for 24 hours rather than changing on every render.
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.reviews);

  const { recent, allTime } = await client.fetch<{
    recent: Review[];
    allTime: Review[];
  }>(HERO_TOP_RATED_QUERY, { cutoff: windowStart() });

  const feature = recent[0] ?? allTime[0];
  return { feature, topTen: allTime };
}

/**
 * The `_id` of the hero's feature review, or `undefined` when the hero
 * renders nothing. Never throws.
 */
export async function getHeroFeatureId(): Promise<string | undefined> {
  const { feature } = await getHeroPool().catch(() => ({ feature: undefined }));
  return feature?._id;
}
