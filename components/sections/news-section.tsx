import Link from "next/link";

import { MarqueeWords, SmilingCloud, SmilingHill } from "@/components/retro/arcade-art";
import { NewsCard } from "@/components/retro/news-card";
import { NEWS_QUERY, cachedFetch } from "@/lib/content/queries";
import type { NewsPost } from "@/lib/content/types";

/** Winding route across the hills, in the 1440x520 scenery viewBox. */
const ROAD_PATH = "M-20 470 C160 450 250 380 420 390 S720 330 900 300 S1180 190 1460 150";

/**
 * Hills backdrop behind the news grid: two rolling hill bands, a dotted
 * road, a cloud in the sky and the smiling hill, full-bleed and pinned to the
 * section's bottom edge. Decorative (`aria-hidden`).
 */
function HillsScenery() {
  return (
    <div className="scenery" aria-hidden="true">
      <SmilingCloud className="scenery__cloud" />
      <svg className="scenery__hills" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" focusable="false">
        <path className="scenery__hill scenery__hill--back" d="M-20 190 C220 70 420 80 640 170 S1060 270 1460 120 V540 H-20 Z" />
        <path className="scenery__hill scenery__hill--front" d="M-20 350 C260 270 520 280 780 350 S1200 420 1460 320 V540 H-20 Z" />
        <path className="scenery__road" d={ROAD_PATH} />
        <path className="scenery__dots" d={ROAD_PATH} />
      </svg>
      <SmilingHill className="scenery__blob" />
    </div>
  );
}

export default async function NewsSection() {
  const posts = await cachedFetch<NewsPost[]>(NEWS_QUERY);
  const items = posts.slice(0, 3);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="lmp-section scenery-section">
      <HillsScenery />
      <div className="lmp-container">
        <div className="section-head">
          <div className="section-head__title">
            <h2 className="extruded-title extruded-title--pink section-title">
              <MarqueeWords text="NEWS & PREVIEWS" />
            </h2>
            <SmilingCloud className="section-head__cloud" />
          </div>
          <Link href="/news" className="section-head__action">
            VIEW ALL
          </Link>
        </div>
        <div className="news-grid">
          {items.map((p, i) => (
            <NewsCard key={p._id} post={p} lead={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
