import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/content/cache-tags";
import { client } from "@/sanity/client";

type FeedReview = {
  _id: string;
  title: string;
  slug: { current: string };
  summary: string;
  publishedAt: string;
  reviewScore: number;
  author: { name: string };
  reviewableItem: { title: string; coverImage?: { asset?: { url: string } } };
};

type FeedNews = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  breaking: boolean;
  author: { name: string };
  featuredImage?: { asset?: { url: string } };
};

const FEED_REVIEWS_QUERY = `*[
  _type == "review"
  && defined(slug.current)
]|order(publishedAt desc)[0...20]{
  _id,
  title,
  slug,
  summary,
  publishedAt,
  reviewScore,
  author->{ name },
  reviewableItem->{
    title,
    coverImage{ asset->{ url } }
  }
}`;

const FEED_NEWS_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
]|order(publishedAt desc)[0...20]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  author->{ name },
  featuredImage{ asset->{ url } }
}`;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

/**
 * `use cache` cannot go on the GET export itself, so the data access lives in
 * its own cached function and the handler calls it. Replaces the old
 * `export const revalidate = 1800`, which cacheComponents rejects.
 */
async function getFeedContent() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.reviews, TAGS.news, TAGS.feeds);
  const [reviews, news] = await Promise.all([
    client.fetch<FeedReview[]>(FEED_REVIEWS_QUERY),
    client.fetch<FeedNews[]>(FEED_NEWS_QUERY),
  ]);
  return { reviews, news };
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";

  const { reviews, news } = await getFeedContent();

  type Item = {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid: string;
    author: string;
    image?: string;
    category: "Review" | "News";
  };

  const items: Item[] = [
    ...reviews.map((r) => ({
      title: `${r.title} · ${r.reviewScore.toFixed(1)}/10`,
      link: `${siteUrl}/reviews/${r.slug.current}`,
      description: r.summary,
      pubDate: new Date(r.publishedAt).toUTCString(),
      guid: `${siteUrl}/reviews/${r.slug.current}`,
      author: r.author?.name ?? "Life Meets Pixel",
      image: r.reviewableItem?.coverImage?.asset?.url,
      category: "Review" as const,
    })),
    ...news.map((n) => ({
      title: n.breaking ? `🔴 ${n.title}` : n.title,
      link: `${siteUrl}/news/${n.slug.current}`,
      description: n.excerpt,
      pubDate: new Date(n.publishedAt).toUTCString(),
      guid: `${siteUrl}/news/${n.slug.current}`,
      author: n.author?.name ?? "Life Meets Pixel",
      image: n.featuredImage?.asset?.url,
      category: "News" as const,
    })),
  ]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 30);

  const lastBuildDate = items[0]?.pubDate ?? new Date().toUTCString();

  const itemsXml = items
    .map(
      (it) => `
    <item>
      <title>${cdata(it.title)}</title>
      <link>${xmlEscape(it.link)}</link>
      <guid isPermaLink="true">${xmlEscape(it.guid)}</guid>
      <pubDate>${it.pubDate}</pubDate>
      <dc:creator>${cdata(it.author)}</dc:creator>
      <category>${xmlEscape(it.category)}</category>
      <description>${cdata(it.description)}</description>
      ${it.image ? `<enclosure url="${xmlEscape(it.image)}" type="image/jpeg" />` : ""}
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Life Meets Pixel: Reviews &amp; News</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Honest reviews of games, movies, books, anime, board games, and tech. No sponsors. No PR fluff. This public feed carries excerpts; members get a personal full-text feed at ${siteUrl}/membership</description>
    <language>en-AU</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Life Meets Pixel (Next.js)</generator>${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}

