import { Suspense } from "react";

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/retro/news-card";
import { ReviewCard } from "@/components/retro/review-card";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteHeader } from "@/components/site-header";
import { OG_IMAGE } from "@/lib/site/constants";
import { authorInitial } from "@/lib/content/mappings";
import { breadcrumbSchema, graph, profilePageSchema } from "@/lib/content/schema";
import { AUTHOR_SLUGS_QUERY, cachedFetch, HIDDEN_AUTHOR_IDS } from "@/lib/content/queries";
import type { Author, NewsPost, Review } from "@/lib/content/types";
import { client } from "@/sanity/client";

type Props = {
  params: Promise<{ slug: string }>;
};

const AUTHOR_BY_SLUG_QUERY = `*[_type == "author" && slug.current == $slug][0]{
  _id,
  name,
  slug,
  bio,
  email,
  "accentColor": accentColor.hex,
  avatar{ asset->{ url }, alt },
  socialLinks
}`;

const AUTHOR_REVIEWS_QUERY = `*[_type == "review" && author._ref == $authorId && defined(slug.current)]|order(publishedAt desc)[0...6]{
  _id,
  title,
  slug,
  reviewScore,
  summary,
  publishedAt,
  featured,
  reviewableItem->{
    title,
    slug,
    itemType,
    coverImage{ asset->{ url }, alt },
    creator,
    publisher,
    releaseDate,
    genres[]->{ title, slug, "color": color.hex }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{ asset->{ url }, alt }
  },
  categories[]->{ title, slug, "color": color.hex },
  tags[]->{ _id, title, slug }
}`;

const AUTHOR_NEWS_QUERY = `*[_type == "newsPost" && author._ref == $authorId && defined(slug.current)]|order(publishedAt desc)[0...6]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  featuredImage{ asset->{ url }, alt },
  author->{ name, slug, "accentColor": accentColor.hex, avatar{ asset->{ url }, alt } },
  categories[]->{ title, slug, "color": color.hex }
}`;

// Prerender profiles so the route is served from the full route cache instead of
// rendering per request. Authors published after a build still resolve, because
// dynamicParams defaults to true, and the Sanity webhook revalidates the path.
export async function generateStaticParams() {
  const authors = await client.fetch<Array<{ slug: string }>>(AUTHOR_SLUGS_QUERY);
  return authors.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";
  const author = await cachedFetch<Author>(AUTHOR_BY_SLUG_QUERY, { slug });
  if (!author) return { title: "Author Not Found" };
  const canonicalUrl = `${siteUrl}/author/${slug}`;
  return {
    title: `${author.name} - Author`,
    description: author.bio || `Meet ${author.name}, a writer at Life Meets Pixel.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      // Next.js REPLACES a parent openGraph object rather than merging it,
      // so the locale has to be restated on every page that defines its own.
      locale: "en_AU",
      title: `${author.name} - Author | Life Meets Pixel`,
      description: author.bio || `Meet ${author.name}, a writer at Life Meets Pixel.`,
      url: canonicalUrl,
      type: "profile",
      images: [OG_IMAGE],
    },
  };
}

// Receives an already-resolved author: the existence check has to happen above
// the Suspense boundary in AuthorPage, not here. See the note there.
async function AuthorContent({ author }: { author: Author }) {
  const [reviews, newsPosts, reviewCount, newsCount] = await Promise.all([
    cachedFetch<Review[]>(AUTHOR_REVIEWS_QUERY, { authorId: author._id }),
    cachedFetch<NewsPost[]>(AUTHOR_NEWS_QUERY, { authorId: author._id }),
    cachedFetch<number>(`count(*[_type == "review" && author._ref == $authorId])`, { authorId: author._id }),
    cachedFetch<number>(`count(*[_type == "newsPost" && author._ref == $authorId])`, { authorId: author._id }),
  ]);

  const accent = author.accentColor || "var(--neon-2)";
  const avatarUrl = author.avatar?.asset?.url;

  return (
    <>
      <section className="contact-hero">
        <div className="contact-hero__grid" style={{ gridTemplateColumns: "auto 1fr" }}>
          <div
            className="contact-hero__badge"
            style={{ borderColor: accent, overflow: "hidden" }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={author.avatar?.alt || author.name}
                width={140}
                height={140}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            ) : (
              <span style={{ color: accent, fontFamily: "var(--font-press-start-2p)", fontSize: 36 }}>
                {authorInitial(author.name)}
              </span>
            )}
          </div>
          <div>
            <h1 className="contact-hero__title">{author.name.toUpperCase()}</h1>
            {author.bio && <p className="contact-hero__sub">{author.bio}</p>}
            <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
              <div>
                <div
                  style={{ fontFamily: "var(--font-press-start-2p)", fontSize: 28, color: "var(--neon-3)" }}
                >
                  {reviewCount}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", letterSpacing: "0.1em" }}>REVIEWS</div>
              </div>
              <div>
                <div
                  style={{ fontFamily: "var(--font-press-start-2p)", fontSize: 28, color: "var(--neon-1)" }}
                >
                  {newsCount}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", letterSpacing: "0.1em" }}>NEWS POSTS</div>
              </div>
            </div>
            {(author.email || author.socialLinks) && (
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                {author.email && (
                  <a className="retro-btn" href={`mailto:${author.email}`}>
                    ✉ EMAIL
                  </a>
                )}
                {author.socialLinks?.x && (
                  <a className="retro-btn" href={author.socialLinks.x} target="_blank" rel="noopener noreferrer">
                    𝕏 X
                  </a>
                )}
                {author.socialLinks?.youtube && (
                  <a
                    className="retro-btn"
                    href={author.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ▶ YOUTUBE
                  </a>
                )}
                {author.socialLinks?.instagram && (
                  <a
                    className="retro-btn"
                    href={author.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ◆ INSTAGRAM
                  </a>
                )}
                {author.socialLinks?.website && (
                  <a
                    className="retro-btn"
                    href={author.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ⌘ WEBSITE
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="lmp-section--tight">
          <div className="section-head">
            <div className="section-head__title">
              <span className="num">★</span>
              <h2>LATEST REVIEWS</h2>
            </div>
            {reviewCount > 6 && (
              <Link href="/reviews" className="section-head__action">
                VIEW ALL
              </Link>
            )}
          </div>
          <div className="reviews-grid">
            {reviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        </section>
      )}

      {newsPosts.length > 0 && (
        <section className="lmp-section--tight">
          <div className="section-head">
            <div className="section-head__title">
              <span className="num">▤</span>
              <h2>LATEST NEWS</h2>
            </div>
            {newsCount > 6 && (
              <Link href="/news" className="section-head__action">
                VIEW ALL
              </Link>
            )}
          </div>
          <div className="news-grid">
            {newsPosts.map((p, i) => (
              <NewsCard key={p._id} post={p} lead={i === 0} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function AuthorSkeleton() {
  return (
    <div className="contact-hero" style={{ minHeight: 200 }}>
      <div className="contact-hero__grid">
        <div className="contact-hero__badge" aria-hidden="true">
          ◆
        </div>
        <div />
      </div>
    </div>
  );
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;

  // Resolve existence BEFORE anything streams. Once the shell below is flushed,
  // the 200 status is committed and a later notFound() can no longer change it,
  // which turned every bogus /author/* URL into a soft 404. The Suspense
  // boundary stays for the slow secondary fetches, which cannot 404.
  const author = await cachedFetch<Author>(AUTHOR_BY_SLUG_QUERY, { slug });
  if (!author || HIDDEN_AUTHOR_IDS.includes(author._id)) notFound();

  return (
    <>
      <SiteHeader currentPage="author" />
      <JsonLd
        data={graph(
          profilePageSchema({
            name: author.name,
            slug: author.slug,
            bio: author.bio,
            avatarUrl: author.avatar?.asset?.url,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: author.name, path: `/author/${author.slug.current}` },
          ]),
        )}
      />
      <main id="main-content" className="lmp-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <Suspense fallback={<AuthorSkeleton />}>
          <AuthorContent author={author} />
        </Suspense>
      </main>
    </>
  );
}
