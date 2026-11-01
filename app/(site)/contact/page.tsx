import { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/retro/contact-form";
import { SocialTiles } from "@/components/sections/social-section";
import { SiteHeader } from "@/components/site-header";
import { SITE_CONFIG, OG_IMAGE } from "@/lib/site/constants";
import { authorAccent, authorInitial, authorLevel } from "@/lib/content/mappings";
import { ALL_AUTHORS_QUERY, cachedFetch } from "@/lib/content/queries";
import type { Author } from "@/lib/content/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lifemeetspixel.com";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Drop us a line with review requests, news tips, collabs, or just to say g'day.",
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: {
    // Next.js REPLACES a parent openGraph object rather than merging it,
    // so the locale has to be restated on every page that defines its own.
    locale: "en_AU",
    title: "Contact | Life Meets Pixel",
    description: "Drop us a line with review requests, news tips and collabs.",
    url: `${siteUrl}/contact`,
    type: "website",
    images: [OG_IMAGE],
  },
};

export default async function ContactPage() {
  const authors = await cachedFetch<Author[]>(ALL_AUTHORS_QUERY);

  return (
    <>
      <SiteHeader currentPage="contact" />
      <main id="main-content" className="lmp-container" style={{ paddingTop: 48, paddingBottom: 32 }}>
        <section className="contact-hero">
          <div className="contact-hero__grid">
            <div>
              <h1 className="contact-hero__title">DROP US A LINE</h1>
              <p className="contact-hero__sub">
                Review requests, news tips, collab pitches, or just a friendly g&apos;day. We read{" "}
                <strong>every</strong> message. No PR fluff, please.
              </p>
            </div>
            <div className="contact-hero__badge" aria-hidden="true">
              ✉
            </div>
          </div>
        </section>

        <div className="contact-grid">
          <ContactForm />

          <aside className="contact-side">
            {authors.slice(0, 4).map((a) => (
              <div key={a._id} className="staff-card" style={{ color: authorAccent(a.accentColor) }}>
                <div className="staff-card__avatar" aria-hidden="true">
                  {authorInitial(a.name)}
                </div>
                <div>
                  <div className="staff-card__name">
                    <Link href={`/author/${a.slug.current}`} className="staff-card__link">
                      {a.name}
                    </Link>
                    <span className="staff-card__lvl">
                      LV {authorLevel(a.reviewCount, a.newsCount)} · CRITIC
                    </span>
                  </div>
                  <div className="staff-card__role">Reviewer</div>
                  {a.bio && <p className="staff-card__bio">{a.bio}</p>}
                  {a.email && (
                    <p className="staff-card__email">
                      <a href={`mailto:${a.email}`}>{a.email}</a>
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="inbox-card">
              <h2>◆ INBOX STATUS</h2>
              <div className="inbox-row">
                <span className="lbl">RESPONSE TIME</span>
                <span className="val good">&lt; 48H</span>
              </div>
              <div className="inbox-row">
                <span className="lbl">REVIEW QUEUE</span>
                <span className="val">OPEN</span>
              </div>
              <div className="inbox-row">
                <span className="lbl">COLLAB SLOTS</span>
                <span className="val good">AVAILABLE</span>
              </div>
              <div className="inbox-row">
                <span className="lbl">GENERAL EMAIL</span>
                <span className="val">
                  <a
                    href={`mailto:${SITE_CONFIG.contact.email}`}
                    style={{ color: "var(--neon-2)", fontFamily: "var(--font-press-start-2p)", display: "inline-block", paddingBlock: 6 }}
                  >
                    {SITE_CONFIG.contact.email}
                  </a>
                </span>
              </div>
            </div>
          </aside>
        </div>

        <section className="lmp-section--tight">
          <div className="section-head">
            <div className="section-head__title">
              <span className="num">◆</span>
              <h2>OR CATCH US ON THE GRID</h2>
            </div>
          </div>
          <SocialTiles />
          <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 16, textAlign: "center" }}>
            Want to buy us a coffee instead?{" "}
            <Link href="/" style={{ color: "var(--neon-2)" }}>
              See support options on the homepage →
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
