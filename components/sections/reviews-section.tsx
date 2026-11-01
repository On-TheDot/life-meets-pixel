import Link from "next/link";

import { MarqueeWords } from "@/components/retro/arcade-art";
import { ReviewCard } from "@/components/retro/review-card";
import { getHeroFeatureId } from "@/lib/content/hero-pool";
import { REVIEWS_QUERY, cachedFetch } from "@/lib/content/queries";
import type { Review } from "@/lib/content/types";

const GRID_SIZE = 6;

export default async function ReviewsSection() {
  const [reviews, heroFeatureId] = await Promise.all([
    cachedFetch<Review[]>(REVIEWS_QUERY),
    getHeroFeatureId(),
  ]);

  const items = reviews.filter((r) => r._id !== heroFeatureId).slice(0, GRID_SIZE);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="lmp-section">
      <div className="section-head">
        <div className="section-head__title">
          <h2 className="extruded-title extruded-title--pink section-title">
            <MarqueeWords text="LATEST REVIEWS" />
          </h2>
        </div>
        <Link href="/reviews" className="section-head__action">
          VIEW ALL
        </Link>
      </div>
      <div className="reviews-grid">
        {items.map((r) => (
          <ReviewCard key={r._id} review={r} />
        ))}
      </div>
    </section>
  );
}
