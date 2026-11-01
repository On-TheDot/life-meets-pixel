import { Metadata } from "next";
import { PortableText, type PortableTextComponents } from "next-sanity";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AdBreak from "@/components/ads/ad-break";
import Comments from "@/components/comments/comments";
import { AuthorChip } from "@/components/retro/author-chip";
import { CatBadge } from "@/components/retro/cat-badge";
import { HeartRow } from "@/components/retro/heart-row";
import { HPBar } from "@/components/retro/hp-bar";
import { ReviewCard } from "@/components/retro/review-card";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteHeader } from "@/components/site-header";
import { breadcrumbSchema, graph, reviewSchema } from "@/lib/content/schema";
import {
  authorInitial,
  authorLevel,
  CAT_LABELS,
  itemTypeToCat,
  CAT_TYPE_HEADING,
  paletteAccent,
  scoreBand,
  scoreTone,
} from "@/lib/content/mappings";
import {
  cachedFetch,
  ADJACENT_REVIEWS_QUERY,
  RELATED_REVIEWS_QUERY,
  REVIEW_QUERY,
  REVIEW_SLUGS_QUERY,
} from "@/lib/content/queries";
import type { Category, Genre, Platform, Review, Tag } from "@/lib/content/types";
import { formatPublishDate } from "@/lib/site/clock";
import type { PortableTextBlock } from "@portabletext/types";
import { client } from "@/sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const { projectId, dataset } = client.config();
const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

// Prerender every review so the route is served from the full route cache
// instead of `Cache-Control: no-store`, which blocks the back/forward cache.
export async function generateStaticParams() {
  const reviews = await client.fetch<Array<{ slug: string }>>(REVIEW_SLUGS_QUERY);
  return reviews.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const review = await cachedFetch<Review>(REVIEW_QUERY, await params);
  if (!review) {
    return { title: "Review Not Found", description: "The requested review could not be found." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";
  const itemImageUrl = review.reviewableItem?.coverImage
    ? urlFor(review.reviewableItem.coverImage)?.width(1200).height(630).url()
    : null;

  // Strip a trailing site name from CMS meta titles — the layout's title
  // template appends it, so leaving it in doubles the suffix.
  const seoTitle = (
    review.seo?.metaTitle ||
    `${review.title} | ${review.reviewableItem?.title} Review`
  ).replace(/\s*\|\s*Life Meets Pixel\s*$/i, "");
  const seoDescription =
    review.seo?.metaDescription ||
    review.summary ||
    `Read our review of ${review.reviewableItem?.title}. Score: ${review.reviewScore}/10`;
  const seoKeywords = review.seo?.keywords || [
    review.reviewableItem?.title,
    `${review.reviewableItem?.itemType} review`,
    "review",
    ...(review.categories?.map((cat: Category) => cat.title) || []),
  ];

  const canonicalUrl = `${siteUrl}/reviews/${review.slug.current}`;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    authors: [{ name: review.author?.name || "Life Meets Pixel" }],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      // Next.js REPLACES a parent openGraph object rather than merging it,
      // so the locale has to be restated on every page that defines its own.
      locale: "en_AU",
      type: "article",
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      siteName: "Life Meets Pixel",
      publishedTime: review.publishedAt,
      authors: [review.author?.name || "Life Meets Pixel"],
      images: itemImageUrl
        ? [{ url: itemImageUrl, width: 1200, height: 630, alt: review.reviewableItem?.coverImage?.alt || `${review.reviewableItem?.title} cover` }]
        : [],
      tags: review.categories?.map((cat: Category) => cat.title) || [],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: itemImageUrl ? [itemImageUrl] : [],
      creator: review.author?.socialLinks?.x || "@lifemeetspixel",
    },
  };
}

const getVideoEmbedUrl = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  return null;
};

/** Factory, not a constant: the image renderer needs the reviewed item's
 *  title for its alt fallback, and that only exists inside the page. */
const makePortableTextComponents = (
  itemTitle: string,
): PortableTextComponents => ({
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const imageUrl = urlFor(value)?.width(800).url();
      if (!imageUrl) return null;
      return (
        <figure style={{ margin: "24px 0" }}>
          <Image
            src={imageUrl}
            alt={value.alt || value.caption || `${itemTitle} screenshot`}
            width={800}
            height={450}
            style={{ width: "100%", height: "auto" }}
          />
          {value.caption && (
            <figcaption style={{ textAlign: "center", fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    videoEmbed: ({ value }) => {
      const embedUrl = getVideoEmbedUrl(value.url);
      if (!embedUrl) return null;
      const direct = embedUrl.match(/\.(mp4|webm|ogg)$/i);
      return (
        <figure style={{ margin: "24px 0" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", border: "3px solid var(--bg-3)" }}>
            {direct ? (
              <video src={embedUrl} controls style={{ width: "100%", height: "100%" }} preload="metadata" />
            ) : (
              <iframe
                src={embedUrl}
                style={{ width: "100%", height: "100%", border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={value.caption || "Embedded video"}
              />
            )}
          </div>
          {value.caption && (
            <figcaption style={{ textAlign: "center", fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    divider: () => <hr style={{ border: 0, borderTop: "2px dashed var(--bg-3)", margin: "24px 0" }} />,
    spacer: ({ value }) => {
      const size = value?.size as string | undefined;
      const h = size === "large" ? 48 : size === "small" ? 12 : 24;
      return <div style={{ height: h }} aria-hidden="true" />;
    },
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  },
});

// Find the index at which to insert the pros/cons block mid-article.
// Rule: inject just before the 2nd h2 block, which matches the designer's layout
// (intro → first section → pros/cons → deeper analysis → verdict). If the article
// has <2 h2s, inject at the midpoint of the block array as a fallback.
function findProsConsSplit(blocks: PortableTextBlock[]): number {
  const h2Indices: number[] = [];
  blocks.forEach((b, i) => {
    if (b._type === "block" && (b as { style?: string }).style === "h2") {
      h2Indices.push(i);
    }
  });
  if (h2Indices.length >= 2) return h2Indices[1];
  if (h2Indices.length === 1) return h2Indices[0];
  return Math.max(1, Math.floor(blocks.length / 2));
}

function ProsConsBlock({ pros, cons }: { pros?: string[]; cons?: string[] }) {
  if (!pros?.length && !cons?.length) return null;
  return (
    <div className="pros-cons">
      {pros?.length ? (
        <div className="pros">
          <h3>+ PROS</h3>
          <ul>
            {pros.map((p, i) => (
              <li key={`pro-${i}`}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {cons?.length ? (
        <div className="cons">
          <h3>− CONS</h3>
          <ul>
            {cons.map((c, i) => (
              <li key={`con-${i}`}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const getCreatorLabel = (itemType: string): string => {
  switch (itemType) {
    case "book":
      return "Author";
    case "movie":
    case "tvseries":
    case "anime":
      return "Director";
    default:
      return "Creator";
  }
};
const getPublisherLabel = (itemType: string): string => {
  switch (itemType) {
    case "book":
      return "Publisher";
    case "movie":
    case "tvseries":
    case "anime":
      return "Studio";
    default:
      return "Publisher";
  }
};

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const review = await cachedFetch<Review>(REVIEW_QUERY, resolvedParams);

  if (!review) notFound();

  // Same-medium plus one from a DIFFERENT medium. Filtering on itemType alone
  // meant "MORE LIKE THIS" could only ever return the same medium — the one
  // movement the browsing reader is worth designing for.
  const [related, adjacent] = await Promise.all([
    cachedFetch<Review[]>(
      RELATED_REVIEWS_QUERY,
      { itemType: review.reviewableItem?.itemType, slug: resolvedParams.slug },
    ),
    cachedFetch<Review[]>(
        ADJACENT_REVIEWS_QUERY,
        { itemType: review.reviewableItem?.itemType, slug: resolvedParams.slug },
      )
      .catch(() => [] as Review[]),
  ]);

  const item = review.reviewableItem;
  const portableTextComponents = makePortableTextComponents(
    item?.title ?? review.title,
  );
  const cat = itemTypeToCat(item.itemType);
  const tone = scoreTone(review.reviewScore);
  const band = scoreBand(review.reviewScore);
  // Two same-medium, one adjacent, so the exit is not always sideways into
  // more of the same thing.
  const onwards = [...related.slice(0, 2), ...adjacent.slice(0, 1)];
  const hasBreakdown =
    Array.isArray(review.scoreBreakdown) && review.scoreBreakdown.length > 0;
  const toneColor =
    tone === "low" ? "var(--heart)" : tone === "mid" ? "var(--neon-4)" : "var(--neon-3)";
  const itemImageUrl = item?.coverImage?.asset?.url ?? null;

  const structuredData = graph(
    reviewSchema({
      title: review.title,
      slug: review.slug,
      summary: review.summary,
      reviewScore: review.reviewScore,
      publishedAt: review.publishedAt,
      updatedAt: review.updatedAt,
      author: review.author,
      item: {
        title: item.title,
        itemType: item.itemType,
        description: item.description || review.summary,
      },
      itemImageUrl,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Reviews", path: "/reviews" },
      { name: item.title, path: `/reviews/${review.slug.current}` },
    ]),
  );

  return (
    <>
      <SiteHeader currentPage="reviews" />
      <JsonLd data={structuredData} />

      <main id="main-content" className="lmp-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <nav className="article-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">HOME</Link>
          <span className="sep">/</span>
          <Link href="/reviews">REVIEWS</Link>
          <span className="sep">/</span>
          <span>{item.title.toUpperCase()}</span>
        </nav>

        <div className="article-hero">
          {itemImageUrl && (
            <div className="article-hero__bg">
              <Image
                src={itemImageUrl}
                alt=""
                fill
                priority
                sizes="100vw"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="article-hero__overlay" aria-hidden="true" />
          <div className="article-hero__inner">
            <div className="article-cover">
              {itemImageUrl && (
                <Image
                  src={itemImageUrl}
                  alt={item.coverImage.alt || item.title}
                  fill
                  // `cover` on a landscape source makes height binding, so a width-only
                  // `sizes` under-served the 232x312 crop by 2.5x.
                  sizes="(max-width: 980px) 400px, 560px"
                />
              )}
            </div>
            <div className="article-meta">
              <div className="article-meta__cat">
                <CatBadge cat={cat} featured={review.featured} />
              </div>
              <h1 className="article-meta__title">{review.title}</h1>
              <div className="article-meta__sub">
                {item.title}
                {(item.publisher || item.creator) && (
                  <>
                    {" "}
                    <span className="by">· {item.publisher || item.creator}</span>
                  </>
                )}
              </div>
              {review.summary && (
                <p className="article-meta__lead">{review.summary}</p>
              )}
              <div className="article-meta__hpwrap">
                <span className="label">▶ SCORE</span>
                <span className="score" style={{ color: toneColor }}>
                  {review.reviewScore.toFixed(1)}/10
                </span>
                <HeartRow score={review.reviewScore} size={18} />
                {/* The band name sits with the number rather than in its own
                    chip: a second "how we score" link here duplicated the one
                    in the breakdown head ~100px below. */}
                <span className="article-meta__band" style={{ color: toneColor }}>
                  {band.label.toUpperCase()}
                </span>
              </div>

              <div className="article-byline">
                <AuthorChip
                  name={review.author.name}
                  accentColor={review.author.accentColor}
                />
                <time
                  dateTime={review.publishedAt}
                >
                  {formatPublishDate(review.publishedAt)}
                </time>
              </div>
              {review.tags && review.tags.length > 0 && (
                <div className="article-tag-row">
                  {review.tags.map((tag: Tag) => (
                    <span key={tag._id ?? tag.title} className="tag">
                      {tag.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The breakdown is the VERDICT, not metadata. In the sidebar it landed
            37px below the desktop fold and at 61% scroll depth on mobile — the
            footnote case PRODUCT.md names explicitly. It renders here at every
            width, and when a review has no breakdown it says so and links the
            scale rather than failing silently. */}
        <section className="score-breakdown">
          <div className="section-head">
            <div className="section-head__title">
              <span className="num">◆</span>
              <h2>HOW {review.reviewScore.toFixed(1)} BREAKS DOWN</h2>
            </div>
            <Link href="/about" className="section-head__action">
              HOW WE SCORE
            </Link>
          </div>
          {hasBreakdown ? (
            <div className="score-breakdown__rows">
              {review.scoreBreakdown!.map((row, i) => (
                <HPBar
                  key={row._key ?? `${row.label}-${i}`}
                  label={row.label.toUpperCase()}
                  score={row.score}
                />
              ))}
            </div>
          ) : (
            <p className="score-breakdown__missing">
              This review carries a single score rather than a per-criterion
              breakdown. <Link href="/about">See how we score</Link>.
            </p>
          )}
        </section>

        <div className="article-body">
          <article className="article-content">
            {review.verdict && (
              <blockquote className="tldr">
                <strong style={{ display: "block", fontFamily: "var(--font-press-start-2p)", fontSize: 11, color: "var(--neon-1)", marginBottom: 8 }}>
                  ▶ TL;DR
                </strong>
                {review.verdict}
              </blockquote>
            )}

            {Array.isArray(review.content) && review.content.length > 0 ? (
              (() => {
                const blocks = review.content;
                const hasProsCons = !!(review.pros?.length || review.cons?.length);
                if (!hasProsCons) {
                  return <PortableText value={blocks} components={portableTextComponents} />;
                }
                const splitAt = findProsConsSplit(blocks);
                const head = blocks.slice(0, splitAt);
                const tail = blocks.slice(splitAt);
                return (
                  <>
                    {head.length > 0 && (
                      <PortableText value={head} components={portableTextComponents} />
                    )}
                    <ProsConsBlock pros={review.pros} cons={review.cons} />
                    {tail.length > 0 && (
                      <PortableText value={tail} components={portableTextComponents} />
                    )}
                  </>
                );
              })()
            ) : (
              <ProsConsBlock pros={review.pros} cons={review.cons} />
            )}
          </article>

          <aside>
            <div className="stat-block">
              <h3>◆ QUICK STATS</h3>
              <div className="stat-row">
                <span className="lbl">Type</span>
                <span className="val">{CAT_LABELS[cat]}</span>
              </div>
              {item.creator && (
                <div className="stat-row">
                  <span className="lbl">{getCreatorLabel(item.itemType)}</span>
                  <span className="val">{item.creator}</span>
                </div>
              )}
              {item.publisher && item.publisher !== item.creator && (
                <div className="stat-row">
                  <span className="lbl">{getPublisherLabel(item.itemType)}</span>
                  <span className="val">{item.publisher}</span>
                </div>
              )}
              {item.releaseDate && (
                <div className="stat-row">
                  <span className="lbl">Released</span>
                  <span className="val">
                    {new Date(item.releaseDate)
                      .toISOString()
                      .slice(0, 10)
                      .replace(/-/g, "·")}
                  </span>
                </div>
              )}
              {item.itemType === "videogame" && item.esrbRating && (
                <div className="stat-row">
                  <span className="lbl">ESRB</span>
                  <span className="val">{item.esrbRating}</span>
                </div>
              )}
              {item.itemType === "boardgame" && item.playerCount && (
                <div className="stat-row">
                  <span className="lbl">Players</span>
                  <span className="val">{item.playerCount}</span>
                </div>
              )}
              {item.itemType === "boardgame" && item.playTime && (
                <div className="stat-row">
                  <span className="lbl">Play Time</span>
                  <span className="val">{item.playTime}</span>
                </div>
              )}
              {(item.itemType === "movie" || item.itemType === "anime") && item.runtime && (
                <div className="stat-row">
                  <span className="lbl">Runtime</span>
                  <span className="val">{item.runtime}</span>
                </div>
              )}
              {(item.itemType === "tvseries" || item.itemType === "anime") && item.seasons && (
                <div className="stat-row">
                  <span className="lbl">Seasons</span>
                  <span className="val">{item.seasons}</span>
                </div>
              )}
              {(item.itemType === "tvseries" || item.itemType === "anime") && item.episodes && (
                <div className="stat-row">
                  <span className="lbl">Episodes</span>
                  <span className="val">{item.episodes}</span>
                </div>
              )}
              {(item.itemType === "book" || item.itemType === "comic") && item.pageCount && (
                <div className="stat-row">
                  <span className="lbl">Pages</span>
                  <span className="val">{item.pageCount}</span>
                </div>
              )}
              {item.itemType === "book" && item.isbn && (
                <div className="stat-row">
                  <span className="lbl">ISBN</span>
                  <span className="val">{item.isbn}</span>
                </div>
              )}
            </div>

            {item.itemType === "videogame" && item.platforms?.length ? (
              <div className="stat-block">
                <h3>◆ PLATFORMS</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {item.platforms.map((platform: Platform) => (
                    <span key={platform._id ?? platform.title} className="tag">
                      {platform.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {item.genres?.length ? (
              <div className="stat-block">
                <h3>◆ GENRES</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {item.genres.map((genre: Genre) => (
                    <span key={genre._id ?? genre.title} className="tag">
                      {genre.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(item.officialWebsite || item.affiliateLink) && (
              <div className="stat-block">
                <h3>◆ PLAYER OPTIONS</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {item.affiliateLink && (
                    <a
                      href={item.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="retro-btn retro-btn--lime"
                      style={{ justifyContent: "center" }}
                    >
                      🛒{" "}
                      {item.itemType === "videogame" || item.itemType === "boardgame"
                        ? "BUY GAME"
                        : item.itemType === "gadget"
                          ? "BUY GEAR"
                          : "BUY NOW"}
                    </a>
                  )}
                  {item.officialWebsite && (
                    <a
                      href={item.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="retro-btn"
                      style={{ justifyContent: "center" }}
                    >
                      OFFICIAL SITE →
                    </a>
                  )}
                </div>
                {item.affiliateLink && (
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 10, textAlign: "center" }}>
                    {item.affiliatePartner === "gmg"
                      ? "via Green Man Gaming"
                      : item.affiliatePartner === "gearup"
                        ? "via Gear Up"
                        : "Affiliate link"}{" "}
                    ·{" "}
                    <Link href="/legal/affiliate-disclosure" style={{ color: "var(--neon-2)" }}>
                      Disclosure
                    </Link>
                  </p>
                )}
              </div>
            )}

            <div className="stat-block">
              <h3>◆ REVIEWED BY</h3>
              <Link
                href={`/author/${review.author.slug.current}`}
                className="reviewed-by"
              >
                {/* Through paletteAccent(), not raw. The stored hex was applied
                    directly here and rendered midnight's cyan on every palette —
                    1.05:1 on candy. Same No-CMS-Colour bug that AuthorChip had. */}
                <div
                  className="reviewed-by__avatar"
                  style={{
                    borderColor: paletteAccent(review.author.accentColor),
                    color: paletteAccent(review.author.accentColor),
                  }}
                >
                  {authorInitial(review.author.name)}
                </div>
                <div>
                  <div className="reviewed-by__name">
                    {review.author.name.toUpperCase()}
                  </div>
                  <div className="reviewed-by__lvl">
                    LV {authorLevel(review.author.reviewCount, review.author.newsCount)} · CRITIC
                  </div>
                </div>
              </Link>
              {review.author.bio && (
                <p className="reviewed-by__bio">{review.author.bio}</p>
              )}
            </div>
          </aside>
        </div>

        <AdBreak />

        {/* Related BEFORE comments. The read used to end on a zero-state and an
            auth gate — the last two beats a signed-out search arrival saw, on a
            site whose non-negotiable is free-site/paid-perks and whose success
            metric is another page read. */}
        {onwards.length > 0 && (
          <section className="lmp-section--tight">
            <div className="section-head">
              <div className="section-head__title">
                <span className="num">◆</span>
                <h2>SIDE QUESTS · WHAT TO READ NEXT</h2>
              </div>
              <Link href="/reviews" className="section-head__action">
                ALL REVIEWS
              </Link>
            </div>
            <div className="reviews-grid">
              {onwards.map((r) => (
                <ReviewCard key={r._id} review={r} />
              ))}
            </div>
            <div className="article-onwards">
              <Link href={`/author/${review.author.slug?.current ?? ""}`} className="retro-btn">
                ► MORE FROM {review.author.name.toUpperCase()}
              </Link>
              <Link href={`/reviews?type=${item.itemType}`} className="retro-btn retro-btn--lime">
                ► ALL {CAT_TYPE_HEADING[item.itemType].toUpperCase()} REVIEWS
              </Link>
            </div>
          </section>
        )}

        <Comments postId={review._id} />
      </main>
    </>
  );
}
