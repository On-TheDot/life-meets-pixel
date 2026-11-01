import { cacheLife, cacheTag } from "next/cache";

import { PUBLISH_TAGS } from "@/lib/content/cache-tags";
import { HIDDEN_AUTHOR_IDS, INDEXABLE_NEWS_SLUGS_QUERY } from "@/lib/content/queries";
import { client } from "@/sanity/client";

/**
 * A route handler, not `app/sitemap.ts`, and that distinction is the whole
 * point of this file.
 *
 * As a metadata route, the sitemap was prerendered to a static asset at build
 * and nothing could replace it afterwards: neither `revalidatePath('/sitemap.xml')`
 * nor `revalidateTag` touches a build-time asset, and the `cacheLife` fallback
 * never fired either. It sat frozen at the 8 August build for a week while the
 * webhook happily refreshed every human page and feed.xml alongside it. Four
 * news posts and a review published in that window never entered the sitemap.
 *
 * feed.xml has always been a route handler and has always updated correctly, so
 * the sitemap now uses the same shape: cached data function, publish tags, XML
 * built in the handler. robots.txt already points at /sitemap.xml, so the public
 * URL is unchanged.
 */

type SlugRow = { slug: { current: string }; publishedAt: string; _updatedAt: string };
type AuthorRow = { slug: { current: string }; _updatedAt: string };

async function getContent() {
  "use cache";
  cacheLife("max");
  cacheTag(...PUBLISH_TAGS);
  const [reviews, news, authors] = await Promise.all([
    client.fetch<SlugRow[]>(
      `*[_type == "review" && defined(slug.current)]{
        "slug": slug,
        publishedAt,
        _updatedAt
      }`,
    ),
    // Only news posts substantial enough to index. The short ones are marked
    // noindex in their own metadata, so listing them here would contradict that.
    client.fetch<SlugRow[]>(INDEXABLE_NEWS_SLUGS_QUERY),
    client.fetch<AuthorRow[]>(
      `*[_type == "author" && defined(slug.current) && !(_id in $hidden)]{
        "slug": slug,
        _updatedAt
      }`,
      { hidden: HIDDEN_AUTHOR_IDS },
    ),
  ]);

  return { reviews, news, authors };
}

type Entry = {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
};

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const iso = (d: string) => new Date(d).toISOString();

/**
 * The later of publish time and last edit, because `lastmod` is the only
 * freshness signal a sitemap carries and `publishedAt` never moves.
 *
 * Advertising publishedAt meant an article edited a year after publication
 * still looked untouched, so Google had no reason to come back and re-parse it.
 * That is visible in Search Console: the review-snippet report lists only the
 * handful of reviews crawled inside its recent window, while the rest sit
 * indexed and unvisited with perfectly good markup on them.
 */
const lastmodOf = (row: { publishedAt?: string; _updatedAt?: string }) => {
  const stamps = [row.publishedAt, row._updatedAt]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).toISOString());
  return stamps.sort().at(-1) ?? new Date(0).toISOString();
};

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";
  const { reviews, news, authors } = await getContent();

  // The listings and the homepage change when the newest article lands, so they
  // carry that article's date. The old file stamped them `new Date()`, which was
  // both meaningless to a crawler and the unstable value that pushed the whole
  // route into being cached at the top level in the first place.
  const newest =
    [...reviews, ...news]
      .map(lastmodOf)
      .sort()
      .at(-1) ?? new Date(0).toISOString();

  const staticPages: Entry[] = [
    { loc: baseUrl, lastmod: newest, changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/reviews`, lastmod: newest, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/news`, lastmod: newest, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/about`, lastmod: newest, changefreq: "monthly", priority: "0.7" },
    { loc: `${baseUrl}/membership`, lastmod: newest, changefreq: "monthly", priority: "0.6" },
    { loc: `${baseUrl}/contact`, lastmod: newest, changefreq: "monthly", priority: "0.5" },
  ];

  const reviewPages: Entry[] = reviews.map((r) => ({
    loc: `${baseUrl}/reviews/${r.slug.current}`,
    lastmod: lastmodOf(r),
    changefreq: "weekly",
    priority: "0.8",
  }));

  const newsPages: Entry[] = news.map((n) => ({
    loc: `${baseUrl}/news/${n.slug.current}`,
    lastmod: lastmodOf(n),
    changefreq: "monthly",
    priority: "0.7",
  }));

  const authorPages: Entry[] = authors.map((a) => ({
    loc: `${baseUrl}/author/${a.slug.current}`,
    lastmod: iso(a._updatedAt),
    changefreq: "monthly",
    priority: "0.6",
  }));

  const entries = [...staticPages, ...reviewPages, ...newsPages, ...authorPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
