import { toHTML, type PortableTextComponents } from "@portabletext/to-html";

import { rssFeedsEnabled, userHasPaidSubscription, userIdForRssToken } from "@/lib/members/rss";
import { cachedFetch } from "@/lib/content/queries";

type PortableText = Parameters<typeof toHTML>[0];

type FullReview = {
  title: string;
  slug: { current: string };
  summary: string;
  publishedAt: string;
  reviewScore: number;
  author: { name: string };
  content: PortableText;
  verdict?: string;
};

type FullNews = {
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  breaking: boolean;
  author: { name: string };
  content: PortableText;
};

const FULL_REVIEWS_QUERY = `*[_type == "review" && defined(slug.current)]
  |order(publishedAt desc)[0...15]{
    title, slug, summary, publishedAt, reviewScore, verdict, content,
    author->{ name }
  }`;

const FULL_NEWS_QUERY = `*[_type == "newsPost" && defined(slug.current)]
  |order(publishedAt desc)[0...15]{
    title, slug, excerpt, publishedAt, breaking, content,
    author->{ name }
  }`;

// Render only what survives in a feed reader; embeds become plain links.
const ptComponents: Partial<PortableTextComponents> = {
  types: {
    image: () => "",
    videoEmbed: ({ value }) =>
      value?.url
        ? `<p><a href="${value.url}">▶ Watch the video</a></p>`
        : "",
    divider: () => "<hr/>",
    spacer: () => "",
  },
  unknownType: () => "",
  unknownMark: ({ children }) => children ?? "",
};

function renderBody(content: PortableText): string {
  try {
    return toHTML(content, { components: ptComponents });
  } catch {
    return "";
  }
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!rssFeedsEnabled()) return new Response(null, { status: 404 });

  const { token } = await params;
  const cleanToken = token.replace(/\.xml$/, "");
  const userId = await userIdForRssToken(cleanToken);
  if (!userId) return new Response("Invalid feed token", { status: 404 });

  if (!(await userHasPaidSubscription(userId))) {
    return new Response(
      "This feed requires an active membership: https://lifemeetspixel.com/membership",
      { status: 402 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";
  const [reviews, news] = await Promise.all([
    cachedFetch<FullReview[]>(FULL_REVIEWS_QUERY),
    cachedFetch<FullNews[]>(FULL_NEWS_QUERY),
  ]);

  const items = [
    ...reviews.map((r) => ({
      title: `${r.title} · ${r.reviewScore.toFixed(1)}/10`,
      link: `${siteUrl}/reviews/${r.slug.current}`,
      pubDate: new Date(r.publishedAt).toUTCString(),
      author: r.author?.name ?? "Life Meets Pixel",
      html:
        `<p><em>${r.summary ?? ""}</em></p>` +
        renderBody(r.content) +
        (r.verdict ? `<h2>Verdict</h2><p>${r.verdict}</p>` : ""),
    })),
    ...news.map((n) => ({
      title: n.breaking ? `🔴 ${n.title}` : n.title,
      link: `${siteUrl}/news/${n.slug.current}`,
      pubDate: new Date(n.publishedAt).toUTCString(),
      author: n.author?.name ?? "Life Meets Pixel",
      html: `<p><em>${n.excerpt ?? ""}</em></p>` + renderBody(n.content),
    })),
  ]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 25);

  const itemsXml = items
    .map(
      (it) => `
    <item>
      <title>${cdata(it.title)}</title>
      <link>${xmlEscape(it.link)}</link>
      <guid isPermaLink="true">${xmlEscape(it.link)}</guid>
      <pubDate>${it.pubDate}</pubDate>
      <dc:creator>${cdata(it.author)}</dc:creator>
      <content:encoded>${cdata(it.html)}</content:encoded>
      <description>${cdata(it.html)}</description>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Life Meets Pixel: Full-Text Member Feed</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/feed/${cleanToken}.xml" rel="self" type="application/rss+xml" />
    <description>Complete articles for Life Meets Pixel members. This URL is personal, so don't share it.</description>
    <language>en-AU</language>
    <lastBuildDate>${items[0]?.pubDate ?? new Date().toUTCString()}</lastBuildDate>${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Tokenized URL: cacheable per-URL at the CDN, never shared caches
      // beyond that. 30 min matches the public feed.
      "Cache-Control": "private, max-age=1800",
    },
  });
}
