import Image from "next/image";
import Link from "next/link";

import { itemTypeToCat } from "@/lib/content/mappings";
import type { Review } from "@/lib/content/types";

import { AuthorChip } from "./author-chip";
import { CatBadge } from "./cat-badge";
import { HeartRow } from "./heart-row";
import { RelativeDate } from "./relative-date";
import { ScoreBox } from "./score-box";

export function ReviewCard({
  review,
  priority = false,
}: {
  review: Review;
  priority?: boolean;
}) {
  const item = review.reviewableItem;
  const cat = itemTypeToCat(item.itemType);
  const studio = item.publisher || item.creator || "";

  return (
    <Link
      href={`/reviews/${review.slug.current}`}
      className={`review-card ${review.featured ? "is-featured" : ""}`}
    >
      <div className="review-card__media">
        {item.coverImage?.asset?.url && (
          <Image
            src={item.coverImage.asset.url}
            alt={item.coverImage.alt || item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />
        )}
        <div className="review-card__badges">
          <CatBadge cat={cat} featured={review.featured} />
        </div>
        <ScoreBox score={review.reviewScore} />
      </div>
      <div className="review-card__body">
        <div className="review-card__date">
          {review.publishedAt && <RelativeDate iso={review.publishedAt} />}
        </div>
        <h3 className="review-card__title">{review.title}</h3>
        <div className="review-card__subject">
          {item.title}
          {studio && (
            <>
              {" "}
              <span className="by">· {studio}</span>
            </>
          )}
        </div>
        <p className="review-card__excerpt">{review.summary}</p>
        <div className="review-card__hearts">
          <HeartRow score={review.reviewScore} />
        </div>
        <div className="review-card__footer">
          <div className="review-card__tags">
            {(review.tags ?? []).slice(0, 3).map((t) => (
              <span key={t._id ?? t.title} className="tag">
                {t.title}
              </span>
            ))}
          </div>
          <AuthorChip name={review.author.name} accentColor={review.author.accentColor} />
        </div>
      </div>
    </Link>
  );
}
