import { Suspense } from "react";
import { connection } from "next/server";

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewCard } from "@/components/retro/review-card";
import { CatSprite } from "@/components/retro/sprites";
import ReviewTypeTabs from "@/components/review-type-tabs";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteHeader } from "@/components/site-header";
import Pagination from "@/components/ui/pagination";
import { OG_IMAGE } from "@/lib/site/constants";
import { breadcrumbSchema, collectionPageSchema, graph } from "@/lib/content/schema";
import {
  CAT_TYPE_HEADING,
  CAT_TYPE_LABEL,
  ITEM_TYPES,
  itemTypeToCat,
} from "@/lib/content/mappings";
import {
  cachedFetch,
  REVIEW_COUNTS_BY_TYPE_QUERY,
  REVIEWS_BY_TYPE_PAGINATED_BY_SCORE_QUERY,
  REVIEWS_BY_TYPE_PAGINATED_QUERY,
  REVIEWS_COUNT_BY_TYPE_QUERY,
  REVIEWS_COUNT_QUERY,
  REVIEWS_PAGINATED_BY_SCORE_QUERY,
  REVIEWS_PAGINATED_QUERY,
} from "@/lib/content/queries";
import type { Review, ReviewableItem } from "@/lib/content/types";

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


type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface ReviewsPageProps {
  searchParams: SearchParams;
}

/** Recency answers "what's new". It does not answer "what's good" — the
 *  question this site is uniquely equipped to answer, and until now the one it
 *  gave browsers no way to ask. Two options, not a dropdown, so the decision
 *  point stays at 2. */
type Sort = "new" | "score";

const ITEMS_PER_PAGE = 12;

type CountsShape = Record<ReviewableItem["itemType"] | "all", number>;

export async function generateMetadata({
  searchParams,
}: ReviewsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const typeParam = params.type as string | undefined;
  const type = (ITEM_TYPES as string[]).includes(typeParam ?? "")
    ? (typeParam as ReviewableItem["itemType"])
    : undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";

  // Titles land around 55 characters and descriptions around 145 once the
  // " | Life Meets Pixel" template suffix is added. "All Reviews" was 30 with
  // the suffix and a 64 character description, both short enough that Google
  // rewrites them from page text instead of using what we wrote.
  const title = type
    ? `${CAT_TYPE_HEADING[type]} Reviews, Scored Out of 10`
    : "Reviews: Games, Anime, Movies and Tech";
  const description = type
    ? `Honest, scored reviews of ${CAT_TYPE_LABEL[type].toLowerCase()}, with a breakdown of what works and what does not. No sponsors, no PR fluff, written from Sydney.`
    : "Honest reviews of games, anime, movies, books, board games and tech, each scored out of 10 with a full breakdown. No sponsors and no PR fluff.";

  const canonicalPath = type ? `/reviews?type=${type}` : "/reviews";
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

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


/** Mediums with at least one review, best-populated first — used to give the
 *  empty state real exits instead of "check back soon". */
function populatedTypes(counts: CountsShape, exclude?: ReviewableItem["itemType"]) {
  return ITEM_TYPES.filter((t) => t !== exclude && (counts[t] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 3);
}

function EmptyState({
  type,
  counts,
}: {
  type?: ReviewableItem["itemType"];
  counts: CountsShape;
}) {
  const nearby = populatedTypes(counts, type);
  return (
    <div className="stat-block empty-state">
      {/* The category's own 9x9 sprite, not the 48px emoji this used to be:
          full-colour vector glyphs beside hand-plotted pixel art are the
          Pixel-Icon Rule's exact failure mode, and land in the confirmed
          nostalgia-kitsch anti-reference. */}
      <div className="empty-state__sprite" aria-hidden="true">
        <CatSprite cat={type ? itemTypeToCat(type) : "game"} size={48} />
      </div>
      <h3 className="empty-state__title">NOTHING HERE YET</h3>
      <p className="empty-state__body">
        {type
          ? `No ${CAT_TYPE_LABEL[type].toLowerCase()} reviewed yet. We're working on it.`
          : "No reviews published yet."}
      </p>
      {/* Always an exit. This panel is reached by a chip the page itself
          renders at 0, so a dead end here is a guaranteed bounce on a surface
          whose success metric is another page read. */}
      <div className="empty-state__exits">
        <Link href="/reviews" className="retro-btn retro-btn--lime">
          ► ALL {counts.all ?? 0} REVIEWS
        </Link>
        {nearby.map((t) => (
          <Link key={t} href={`/reviews?type=${t}`} className="retro-btn">
            {CAT_TYPE_HEADING[t].toUpperCase()} {counts[t]}
          </Link>
        ))}
      </div>
    </div>
  );
}

async function ReviewsList({
  type,
  page,
  sort,
  counts,
}: {
  type?: ReviewableItem["itemType"];
  page: number;
  sort: Sort;
  counts: CountsShape;
}) {
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;

  const listQuery = type
    ? sort === "score"
      ? REVIEWS_BY_TYPE_PAGINATED_BY_SCORE_QUERY
      : REVIEWS_BY_TYPE_PAGINATED_QUERY
    : sort === "score"
      ? REVIEWS_PAGINATED_BY_SCORE_QUERY
      : REVIEWS_PAGINATED_QUERY;

  const [reviews, totalCount] = type
    ? await Promise.all([
        cachedFetch<Review[]>(listQuery, { itemType: type, start, end }),
        cachedFetch<number>(REVIEWS_COUNT_BY_TYPE_QUERY, { itemType: type }),
      ])
    : await Promise.all([
        cachedFetch<Review[]>(listQuery, { start, end }),
        cachedFetch<number>(REVIEWS_COUNT_QUERY),
      ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  if (reviews.length === 0) {
    return <EmptyState type={type} counts={counts} />;
  }

  return (
    <>
      <div className="reviews-grid">
        {reviews.map((review, i) => (
          <ReviewCard key={review._id} review={review} priority={i < 3} />
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}

function ReviewsListSkeleton() {
  return (
    <div className="reviews-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 507, background: "var(--bg-1)", border: "3px solid var(--bg-3)" }} />
      ))}
    </div>
  );
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  // Forces request-time rendering, which the notFound() guard below depends on.
  //
  // Under cacheComponents this route would otherwise ship a static shell, and a
  // shell flushes a 200 before the guard ever runs — `?page=99` came back 200
  // with an empty grid instead of 404. `export const instant = false` does NOT
  // fix this: it only silences the validator, it does not make the route
  // dynamic. connection() does.
  await connection();

  const params = await searchParams;
  const typeParam = params.type as string | undefined;
  const type = (ITEM_TYPES as string[]).includes(typeParam ?? "")
    ? (typeParam as ReviewableItem["itemType"])
    : undefined;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const sort: Sort = params.sort === "score" ? "score" : "new";

  const counts = await cachedFetch<CountsShape>(REVIEW_COUNTS_BY_TYPE_QUERY);

  const pageTitle = type ? `${CAT_TYPE_HEADING[type]} Reviews` : "All Reviews";
  const entryCount = type ? (counts[type] ?? 0) : (counts.all ?? 0);

  // KNOWN LIMITATION under cacheComponents: this renders the 404 page but the
  // response is 200.
  //
  // Before Cache Components this guard produced a real 404. It no longer can:
  // the root layout's static shell flushes a 200 before any page code runs, and
  // nothing recovers the status afterwards. Verified — `connection()` to force
  // request-time rendering, `instant = false`, and moving the guard into
  // generateMetadata all still returned 200.
  //
  // It is kept because the visible outcome is still correct: the reader gets
  // the 404 page with an exit rather than "42 ENTRIES" above an empty grid, and
  // Next's not-found emits <meta name="robots" content="noindex">, so the thin
  // page stays out of the index. The status code is the only thing lost.
  // Fixing it properly means rejecting out-of-range pages in proxy.ts, which
  // needs the review count at the network boundary.
  const totalPages = Math.max(1, Math.ceil(entryCount / ITEMS_PER_PAGE));
  if (entryCount > 0 && currentPage > totalPages) notFound();

  const sortHref = (s: Sort) => {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (s === "score") qs.set("sort", "score");
    const q = qs.toString();
    return q ? `/reviews?${q}` : "/reviews";
  };

  return (
    <>
      <SiteHeader currentPage="reviews" />
      <JsonLd
        data={graph(
          collectionPageSchema({
            name: pageTitle,
            path: type ? `/reviews?type=${type}` : "/reviews",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Reviews", path: "/reviews" },
            ...(type ? [{ name: CAT_TYPE_HEADING[type], path: `/reviews?type=${type}` }] : []),
          ]),
        )}
      />
      <main id="main-content" className="lmp-container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="section-head">
          <div className="section-head__title">
            <span className="num">DB</span>
            <h1>{pageTitle.toUpperCase()}</h1>
          </div>
          <span className="listing-count" style={{ fontFamily: "var(--font-press-start-2p)", color: "var(--ink-mute)" }}>
            {entryCount} {entryCount === 1 ? "ENTRY" : "ENTRIES"}
          </span>
        </div>

        <ReviewTypeTabs currentType={type} counts={counts} />

        <div className="sort-bar">
          <span className="sort-bar__label">SORT</span>
          <Link
            href={sortHref("new")}
            className={`filter-btn ${sort === "new" ? "is-on" : ""}`}
            aria-current={sort === "new" ? "true" : undefined}
          >
            NEWEST
          </Link>
          <Link
            href={sortHref("score")}
            className={`filter-btn ${sort === "score" ? "is-on" : ""}`}
            aria-current={sort === "score" ? "true" : undefined}
          >
            HIGHEST SCORED
          </Link>
        </div>

        {/* The scores were the only thing on this page with no key: twelve
            tone-coded numbers, no legend, and no route to the published scale
            on a site whose positioning is auditable scoring. */}
        <Link href="/about" className="score-key" style={{ marginBottom: 20 }}>
          <span className="score-key__head">◆ HOW WE SCORE</span>
          <span className="score-key__bands">
            <span className="score-key__band">
              <i style={{ background: "var(--neon-3)" }} aria-hidden="true" />
              8.0+
            </span>
            <span className="score-key__band">
              <i style={{ background: "var(--neon-4)" }} aria-hidden="true" />
              6.0&ndash;7.9
            </span>
            <span className="score-key__band">
              <i style={{ background: "var(--heart)" }} aria-hidden="true" />
              &lt;6.0
            </span>
          </span>
          <span className="score-key__more">
            Every score breaks down into the 3&ndash;5 things it is made of. Read the full scale &rarr;
          </span>
        </Link>

        <h2 className="sr-only">
          {entryCount} {entryCount === 1 ? "review" : "reviews"}
          {type ? ` in ${CAT_TYPE_LABEL[type]}` : ""}
          {sort === "score" ? ", highest scored first" : ", newest first"}
        </h2>
        <Suspense fallback={<ReviewsListSkeleton />}>
          <ReviewsList type={type} page={currentPage} sort={sort} counts={counts} />
        </Suspense>
      </main>
    </>
  );
}
