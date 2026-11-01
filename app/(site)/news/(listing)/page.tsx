import { Suspense } from "react";
import { connection } from "next/server";

import { Metadata } from "next";

import NewsCategoryTabs, { type NewsCategoryCount } from "@/components/news-category-tabs";
import { NewsCard } from "@/components/retro/news-card";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteHeader } from "@/components/site-header";
import Pagination from "@/components/ui/pagination";
import { OG_IMAGE } from "@/lib/site/constants";
import { breadcrumbSchema, collectionPageSchema, graph } from "@/lib/content/schema";
import {
  cachedFetch,
  NEWS_BY_CATEGORY_PAGINATED_QUERY,
  NEWS_CATEGORY_COUNTS_QUERY,
  NEWS_COUNT_BY_CATEGORY_QUERY,
  NEWS_COUNT_QUERY,
  NEWS_PAGINATED_QUERY,
} from "@/lib/content/queries";
import type { NewsPost } from "@/lib/content/types";

/**
 * This route is intentionally request-bound, and needs BOTH declarations:
 *
 *  - `await connection()` in the page body forces request-time rendering, so
 *    the out-of-range `notFound()` can still set a 404. Without it a static
 *    shell flushes 200 first and `?page=99` answers 200 with an empty grid.
 *  - `instant = false` tells the Cache Components validator that blocking here
 *    is the design, not an oversight. It does NOT make the route dynamic —
 *    that is what connection() is for. Setting only this one looks like it
 *    works and silently reintroduces the soft 404.
 *
 * Everything on the page is keyed on ?type, ?page and ?sort, so the only
 * prerenderable part is the site chrome. Splitting that out is worth doing, but
 * it requires moving the 404 into generateMetadata as a noindex first.
 */
export const instant = false;


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface NewsPageProps {
  searchParams: SearchParams;
}

type CountsShape = { all: number; categories: NewsCategoryCount[] };

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;

  const counts = await cachedFetch<CountsShape>(NEWS_CATEGORY_COUNTS_QUERY)
    .catch(() => null);
  const match = counts?.categories.find((c) => c.slug === category);

  // Same sizing rule as the reviews listing: ~55 character titles once the
  // template suffix lands, ~145 character descriptions. The category branch
  // also has to stop appending "News" to a category already called "Gaming
  // News", which was shipping the title "Gaming News News".
  const categoryTitle = match
    ? match.title.endsWith("News")
      ? match.title
      : `${match.title} News`
    : undefined;
  const title = categoryTitle
    ? `${categoryTitle} and Previews, Updated Daily`
    : "Gaming News, Previews and Anime Updates";
  const description = match
    ? `The latest ${match.title.toLowerCase()} coverage from Life Meets Pixel: announcements, delays, previews and the industry moves that actually change what you play.`
    : "Gaming news, hands-on previews and anime updates for people who want the detail rather than the press release. Written and scored from Sydney.";
  const canonicalUrl = match ? `${siteUrl}/news?category=${match.slug}` : `${siteUrl}/news`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      // Next.js REPLACES a parent openGraph object rather than merging it,
      // so the locale has to be restated on every page that defines its own.
      locale: "en_AU",
      title: `${title} | Life Meets Pixel`,
      description,
      url: canonicalUrl,
      type: "website",
      images: [OG_IMAGE],
    },
  };
}

const ITEMS_PER_PAGE = 12;

async function NewsList({ category, page }: { category?: string; page: number }) {
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  const [news, totalCount] = category
    ? await Promise.all([
        cachedFetch<NewsPost[]>(
          NEWS_BY_CATEGORY_PAGINATED_QUERY,
          { category, start, end },
        ),
        cachedFetch<number>(NEWS_COUNT_BY_CATEGORY_QUERY, { category }),
      ])
    : await Promise.all([
        cachedFetch<NewsPost[]>(NEWS_PAGINATED_QUERY, { start, end }),
        cachedFetch<number>(NEWS_COUNT_QUERY),
      ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (news.length === 0) {
    return (
      <div className="stat-block" style={{ textAlign: "center", padding: 48 }}>
        <h3 style={{ color: "var(--neon-1)", marginBottom: 8 }}>NO NEWS FOUND</h3>
        <p style={{ color: "var(--ink-dim)", fontSize: 13 }}>
          Nothing filed under this category yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="news-grid news-grid--listing">
        {news.map((post, i) => (
          <NewsCard key={post._id} post={post} priority={i < 3} />
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}

function NewsListSkeleton() {
  return (
    <div className="news-grid news-grid--listing">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{ height: 380, background: "var(--bg-1)", border: "3px solid var(--bg-3)" }}
        />
      ))}
    </div>
  );
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  // Request-time, so the out-of-range notFound() below can still set the
  // status. A prerendered shell flushes 200 before the guard runs.
  await connection();

  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);

  const counts = await cachedFetch<CountsShape>(NEWS_CATEGORY_COUNTS_QUERY);

  const requested = typeof params.category === "string" ? params.category : undefined;
  // Ignore an unknown ?category= rather than rendering an empty page for it.
  const category = counts.categories.some((c) => c.slug === requested) ? requested : undefined;
  const active = counts.categories.find((c) => c.slug === category);

  const pageTitle = active ? `${active.title} News` : "News & Previews";
  const entryCount = active ? active.count : counts.all;

  return (
    <>
      <SiteHeader currentPage="news" />
      <JsonLd
        data={graph(
          collectionPageSchema({
            name: pageTitle,
            path: category ? `/news?category=${category}` : "/news",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "News", path: "/news" },
            ...(active ? [{ name: active.title, path: `/news?category=${active.slug}` }] : []),
          ]),
        )}
      />
      <main id="main-content" className="lmp-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="section-head">
          <div className="section-head__title">
            <span className="num">RSS</span>
            <h1>{pageTitle.toUpperCase()}</h1>
          </div>
          <span
            style={{
              fontFamily: "var(--font-press-start-2p)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {entryCount} {entryCount === 1 ? "ENTRY" : "ENTRIES"}
          </span>
        </div>

        <NewsCategoryTabs
          currentCategory={category}
          all={counts.all}
          categories={counts.categories}
        />

        {/* The page previously went h1 -> h3 with no h2 anywhere, a skipped
            level. Matches the /reviews listing, which uses the same device. */}
        <h2 className="sr-only">Results</h2>
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsList category={category} page={currentPage} />
        </Suspense>
      </main>
    </>
  );
}
