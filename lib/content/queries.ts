import { cacheLife, cacheTag } from "next/cache";
import type { QueryParams } from "next-sanity";

import { PUBLISH_TAGS } from "@/lib/content/cache-tags";
import { client } from "@/sanity/client";

// Empty — kept as a mechanism for future soft-hiding of authors without a CMS delete.
// Add an _id to the array to hide that author from listings + 404 their profile page.
export const HIDDEN_AUTHOR_IDS: string[] = [];

const HIDDEN_AUTHORS_GROQ = `!(_id in ${JSON.stringify(HIDDEN_AUTHOR_IDS)})`;

// Universal Reviews Query (for homepage - limited)
export const REVIEWS_QUERY = `*[
  _type == "review"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    releaseDate,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Paginated Reviews Query
export const REVIEWS_PAGINATED_QUERY = `*[
  _type == "review"
  && defined(slug.current)
]|order(publishedAt desc)[$start...$end]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    releaseDate,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

export const REVIEWS_PAGINATED_BY_SCORE_QUERY = `*[
  _type == "review"
  && defined(slug.current)
]|order(reviewScore desc, publishedAt desc)[$start...$end]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    releaseDate,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

/** Fields the homepage hero renders for its feature and its TOP 10 rows. */
const HERO_PROJECTION = `
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  }`;

/**
 * Homepage hero data. `recent`: best-scored reviews published on or after
 * `$cutoff` (ISO date, rounded to midnight UTC so the cache key is stable).
 * `allTime`: the ten best-scored reviews overall, which fill the hero's TOP 10
 * and stand in for `recent` when the window is thin.
 */
export const HERO_TOP_RATED_QUERY = `{
  "recent": *[
    _type == "review"
    && defined(slug.current)
    && publishedAt >= $cutoff
  ]|order(reviewScore desc, publishedAt desc)[0...6]{${HERO_PROJECTION}
  },
  "allTime": *[
    _type == "review"
    && defined(slug.current)
  ]|order(reviewScore desc, publishedAt desc)[0...10]{${HERO_PROJECTION}
  }
}`;

// Featured Reviews Query
export const FEATURED_REVIEWS_QUERY = `*[
  _type == "review"
  && featured == true
  && defined(slug.current)
]|order(publishedAt desc)[0...3]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Reviews by Type Query (for homepage - limited)
export const REVIEWS_BY_TYPE_QUERY = `*[
  _type == "review"
  && reviewableItem->itemType == $itemType
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Paginated Reviews by Type Query
export const REVIEWS_BY_TYPE_PAGINATED_QUERY = `*[
  _type == "review"
  && reviewableItem->itemType == $itemType
  && defined(slug.current)
]|order(publishedAt desc)[$start...$end]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

export const REVIEWS_BY_TYPE_PAGINATED_BY_SCORE_QUERY = `*[
  _type == "review"
  && reviewableItem->itemType == $itemType
  && defined(slug.current)
]|order(reviewScore desc, publishedAt desc)[$start...$end]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Total Reviews Count Query (all types)
export const REVIEWS_COUNT_QUERY = `count(*[
  _type == "review"
  && defined(slug.current)
])`;

// Total Reviews Count Query (by type)
export const REVIEWS_COUNT_BY_TYPE_QUERY = `count(*[
  _type == "review"
  && reviewableItem->itemType == $itemType
  && defined(slug.current)
])`;

// Single Review Query
export const REVIEW_QUERY = `*[
  _type == "review"
  && slug.current == $slug
][0]{
  _id,
  "updatedAt": _updatedAt,
  title,
  slug,
  reviewScore,
  summary,
  content[]{
    ...,
    _type == "image" => {
      ...,
      asset->
    }
  },
  pros,
  cons,
  verdict,
  scoreBreakdown,
  publishedAt,
  featured,
  reviewableItem->{
    _id,
    title,
    slug,
    itemType,
    coverImage{
      asset->{
        url
      },
      alt
    },
    description,
    creator,
    publisher,
    releaseDate,
    platforms[]->{
      title,
      slug
    },
    genres[]->{
      title,
      slug,
      "color": color.hex
    },
    esrbRating,
    playerCount,
    playTime,
    runtime,
    seasons,
    episodes,
    pageCount,
    isbn,
    officialWebsite,
    affiliateLink,
    affiliatePartner
  },
  author->{
    name,
    slug,
    bio,
    "accentColor": accentColor.hex,
    "reviewCount": count(*[_type == "review" && author._ref == ^._id && defined(slug.current)]),
    "newsCount": count(*[_type == "newsPost" && author._ref == ^._id && defined(slug.current)]),
    avatar{
      asset->{
        url
      },
      alt
    },
    socialLinks
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  },
  seo
}`;

// News Query (for homepage - limited)
export const NEWS_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
]|order(publishedAt desc)[0...20]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  featuredImage{
    asset->{
      url
    },
    alt
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Paginated News Query
export const NEWS_PAGINATED_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
]|order(publishedAt desc)[$start...$end]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  featuredImage{
    asset->{
      url
    },
    alt
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Total News Count Query
export const NEWS_COUNT_QUERY = `count(*[
  _type == "newsPost"
  && defined(slug.current)
])`;

// News category filter bar.
//
// Only categories that actually hold a post are returned. 35 of 57 news posts
// currently carry no category at all, and of the 20 categories in the dataset
// only 5 are used by news, so listing them all would render a row of chips that
// lead to an empty page. That is the same dead-filter trap as the `COMIC 0` chip
// on /reviews, and it reads as a broken page rather than an empty category.
export const NEWS_CATEGORY_COUNTS_QUERY = `{
  "all": count(*[_type == "newsPost" && defined(slug.current)]),
  "categories": *[
    _type == "category"
    && count(*[_type == "newsPost" && defined(slug.current) && references(^._id)]) > 0
  ]{
    title,
    "slug": slug.current,
    "color": color.hex,
    "count": count(*[_type == "newsPost" && defined(slug.current) && references(^._id)])
  }|order(count desc)
}`;

export const NEWS_BY_CATEGORY_PAGINATED_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
  && $category in categories[]->slug.current
]|order(publishedAt desc)[$start...$end]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  featuredImage{
    asset->{
      url
    },
    alt
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  }
}`;

export const NEWS_COUNT_BY_CATEGORY_QUERY = `count(*[
  _type == "newsPost"
  && defined(slug.current)
  && $category in categories[]->slug.current
])`;

// Single News Post Query
export const NEWS_POST_QUERY = `*[
  _type == "newsPost"
  && slug.current == $slug
][0]{
  _id,
  "updatedAt": _updatedAt,
  title,
  slug,
  excerpt,
  "wordCount": length(string::split(pt::text(content), " ")),
  content[]{
    ...,
    _type == "image" => {
      ...,
      asset->
    }
  },
  publishedAt,
  breaking,
  featuredImage{
    asset->{
      url
    },
    alt
  },
  author->{
    name,
    slug,
    bio,
    "accentColor": accentColor.hex,
    "reviewCount": count(*[_type == "review" && author._ref == ^._id && defined(slug.current)]),
    "newsCount": count(*[_type == "newsPost" && author._ref == ^._id && defined(slug.current)]),
    avatar{
      asset->{
        url
      },
      alt
    },
    socialLinks
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  seo
}`;

// Related news (latest 3 other news posts, excluding current slug)
export const RELATED_NEWS_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
  && slug.current != $slug
]|order(publishedAt desc)[0...3]{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  breaking,
  featuredImage{
    asset->{
      url
    },
    alt
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  }
}`;

// Stats Query
export const SITE_STATS_QUERY = `{
  "totalReviews": count(*[_type == "review" && defined(slug.current)]),
  "featuredReviews": count(*[_type == "review" && featured == true && defined(slug.current)]),
  "averageScore": math::avg(*[_type == "review" && defined(reviewScore)].reviewScore),
  "totalNews": count(*[_type == "newsPost" && defined(slug.current)]),
  "reviewsByType": {
    "videogames": count(*[_type == "review" && reviewableItem->itemType == "videogame"]),
    "boardgames": count(*[_type == "review" && reviewableItem->itemType == "boardgame"]),
    "movies": count(*[_type == "review" && reviewableItem->itemType == "movie"]),
    "tvseries": count(*[_type == "review" && reviewableItem->itemType == "tvseries"]),
    "anime": count(*[_type == "review" && reviewableItem->itemType == "anime"]),
    "books": count(*[_type == "review" && reviewableItem->itemType == "book"]),
    "comics": count(*[_type == "review" && reviewableItem->itemType == "comic"]),
    "gadgets": count(*[_type == "review" && reviewableItem->itemType == "gadget"])
  }
}`;

// Related Reviews Query (by item type, excluding current slug)
// Same-medium related. Kept, but the article now pairs it with the ADJACENT
// query below: filtering on itemType alone meant "MORE LIKE THIS" could only
// ever return the same medium, which is the one movement PRODUCT.md says the
// browsing reader is worth designing for.
export const RELATED_REVIEWS_QUERY = `*[
  _type == "review"
  && defined(slug.current)
  && reviewableItem->itemType == $itemType
  && slug.current != $slug
]|order(publishedAt desc)[0...3]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// Deliberately a DIFFERENT medium, so the article can offer a sideways exit.
export const ADJACENT_REVIEWS_QUERY = `*[
  _type == "review"
  && defined(slug.current)
  && reviewableItem->itemType != $itemType
  && slug.current != $slug
]|order(publishedAt desc)[0...2]{
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
    coverImage{
      asset->{
        url
      },
      alt
    },
    creator,
    publisher,
    genres[]->{
      title,
      slug,
      "color": color.hex
    }
  },
  author->{
    name,
    slug,
    "accentColor": accentColor.hex,
    avatar{
      asset->{
        url
      },
      alt
    }
  },
  categories[]->{
    title,
    slug,
    "color": color.hex
  },
  tags[]->{
    _id,
    title,
    slug
  }
}`;

// All authors (for contact page staff cards) — with per-author post counts for level derivation
export const ALL_AUTHORS_QUERY = `*[
  _type == "author"
  && defined(slug.current)
  && ${HIDDEN_AUTHORS_GROQ}
]|order(name asc){
  _id,
  name,
  slug,
  bio,
  email,
  "accentColor": accentColor.hex,
  "reviewCount": count(*[_type == "review" && author._ref == ^._id && defined(slug.current)]),
  "newsCount": count(*[_type == "newsPost" && author._ref == ^._id && defined(slug.current)]),
  avatar{
    asset->{
      url
    },
    alt
  },
  socialLinks
}`;

// Review counts per itemType (for reviews listing filter pills)
export const REVIEW_COUNTS_BY_TYPE_QUERY = `{
  "all": count(*[_type == "review" && defined(slug.current)]),
  "videogame": count(*[_type == "review" && reviewableItem->itemType == "videogame" && defined(slug.current)]),
  "boardgame": count(*[_type == "review" && reviewableItem->itemType == "boardgame" && defined(slug.current)]),
  "movie": count(*[_type == "review" && reviewableItem->itemType == "movie" && defined(slug.current)]),
  "tvseries": count(*[_type == "review" && reviewableItem->itemType == "tvseries" && defined(slug.current)]),
  "anime": count(*[_type == "review" && reviewableItem->itemType == "anime" && defined(slug.current)]),
  "book": count(*[_type == "review" && reviewableItem->itemType == "book" && defined(slug.current)]),
  "comic": count(*[_type == "review" && reviewableItem->itemType == "comic" && defined(slug.current)]),
  "gadget": count(*[_type == "review" && reviewableItem->itemType == "gadget" && defined(slug.current)])
}`;

// Top Picks for hero sidebar — all reviews flagged as featured, newest first.
// Hero takes index 0; sidebar renders the next few.
export const TOP_PICKS_QUERY = `*[
  _type == "review"
  && featured == true
  && defined(slug.current)
]|order(publishedAt desc)[0...8]{
  _id,
  title,
  slug,
  reviewScore
}`;

// Resolve a commented-on document to a title + link, so the Telegram
// moderation ping can point straight at the thread. $id is the Sanity _id
// that components/comments passes through as postId.
export const COMMENT_TARGET_QUERY = `*[_id == $id][0]{
  _type,
  title,
  "slug": slug.current
}`;

// Slug lists for generateStaticParams. Without these, every article renders on
// demand and Next serves `Cache-Control: no-store`, which disqualifies the page
// from the browser's back/forward cache: hitting Back re-fetches and re-renders
// instead of restoring instantly. Prerendering the articles fixes that and lets
// the full route cache do its job. New slugs published after a build are still
// served (dynamicParams defaults to true) and picked up by the Sanity webhook.
export const REVIEW_SLUGS_QUERY = `*[_type == "review" && defined(slug.current)]{
  "slug": slug.current
}`;

export const NEWS_SLUGS_QUERY = `*[_type == "newsPost" && defined(slug.current)]{
  "slug": slug.current
}`;

// Author profiles were the one [slug] route without a prerender list, so unlike
// articles they rendered on demand for every request and never cached. Hidden
// authors are excluded here for the same reason the sitemap excludes them: their
// profile 404s, so there is nothing to prerender.
export const AUTHOR_SLUGS_QUERY = `*[_type == "author" && defined(slug.current) && ${HIDDEN_AUTHORS_GROQ}]{
  "slug": slug.current
}`;

/**
 * `client.fetch` under `cacheLife("max")`, tagged with every `PUBLISH_TAGS` tag.
 *
 * `query` and `params` key the entry. `/api/revalidate` expires it on publish.
 */
export async function cachedFetch<T>(query: string, params: QueryParams = {}): Promise<T> {
  "use cache";
  cacheLife("max");
  cacheTag(...PUBLISH_TAGS);
  return client.fetch<T>(query, params);
}

// AdSense flagged the site "Low value content" on 2026-07-29. The likely driver
// is the mix rather than the volume: 57 of 98 published pages are news posts,
// and they summarise what other outlets reported first, so the shortest ones
// carry no added value for a reader who could just read the source.
//
// Posts under this many words are kept out of the index and out of the sitemap.
// They still render and are still linked, so readers and crawlers can reach
// them, they just stop counting as indexable thin pages. Raise the word count
// on a post and it returns to the index on the next revalidate.
export const THIN_POST_WORDS = 300;

// Word count for the thin-content check above. `pt::text` flattens Portable Text
// to a plain string, so this counts prose only and ignores images and embeds.
export const NEWS_WORD_COUNT_GROQ = `"wordCount": length(string::split(pt::text(content), " "))`;

// Slugs of news posts substantial enough to index. Used by the sitemap.
export const INDEXABLE_NEWS_SLUGS_QUERY = `*[
  _type == "newsPost"
  && defined(slug.current)
  && length(string::split(pt::text(content), " ")) >= ${THIN_POST_WORDS}
]{
  "slug": slug,
  publishedAt,
  _updatedAt
}`;

// Headline ticker. Lived inline in components/retro/ticker.tsx until 2026-08-07;
// moved here because all GROQ belongs in this file.
export const TICKER_QUERY = `*[
  _type == "review"
  && defined(slug.current)
]|order(publishedAt desc)[0...10]{
  _id,
  title,
  reviewScore,
  "slug": slug.current
}`;
