# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary reader is a **fellow geek-culture enthusiast, browsing without purchase intent** — here for the culture the way you'd read a magazine: what's out, what's good, what the scene is talking about. They are not arriving mid-transaction with a wallet open, and design should not treat "convert to a buy" as the success state of a page.

They read across mediums rather than living in one vertical, so a session can plausibly move from an anime review to a games news post to a board game. Discovery is weighted toward organic search and social, so most readers meet the site on a single article page rather than the homepage — an article is an entry point, not an interior.

## Product Purpose

Life Meets Pixel publishes reviews and news across eight geek-culture mediums — video games, board games, movies, TV series, anime, books, comics/manga and tech — written by named humans and scored on a published, transparent scale.

It exists so that a reader can get an honest verdict from someone whose taste they can audit, instead of a scoreboard from an outlet whose incentives they can't see.

**Success over the next 12 months is audience size** — growing organic search and social reach. Reach is the metric this period; monetisation surfaces exist and are live, but they are not what the next year is optimised for. Design investment should follow that: surfaces that acquire, retain and get shared beat surfaces that convert.

## Positioning

**Unbought verdicts with transparent scoring.** No sponsors, no PR fluff, self-funded. Every review carries one number out of 10 *plus* the three-to-five components that number is made of, against a scale published at `/about` where each band has a stated meaning ("Drop what you are doing", "For the curious only", "Avoid"). Review copies and press keys are disclosed in plain text at the top of the review. Time spent before scoring is stated. Live-service and early-access reviews are dated on purpose, describing the thing as it was on that date.

This is the claim the owner would defend hardest, and it is the one a neighbouring site cannot truthfully copy without actually changing how it operates. Everything that makes the score more legible, more auditable, or more obviously un-negotiated strengthens the product; anything that makes a score look decorative or arbitrary weakens it.

## Operating Context

- **Reader:** arrives from search or social onto a single article, usually on mobile. Reads, may bounce sideways into an adjacent article or medium, may return later for the taste rather than the title.
- **Author/owner:** Michael, a programmer and lifelong gamer in Sydney. Writes and publishes through Sanity Studio; drafts are researched and assembled with a semi-automated pipeline (news radar → draft → Telegram approval → publish → social).
- **Publishing loop:** Sanity document edit → webhook → `revalidatePath` plus `revalidateTag`, so published edits surface on the live site within seconds. Content is authored once and rendered across the site, RSS, and social templates.
- **Social:** Instagram and Facebook carousels/reels rendered from an in-repo template route and reviewed before posting. Captions are keyword-led prose, never hashtag blocks.
- **Editorial rituals that are product facts, not preferences:** corrections are made visibly with a note on what changed rather than silently edited; where an article builds on another outlet's reporting, that outlet is linked in the text; every article links to its author's page.

## Capabilities and Constraints

**Confirmed capabilities**

- Reviews across eight item types (`videogame`, `boardgame`, `movie`, `tvseries`, `anime`, `book`, `comic`, `gadget`), each with type-specific fields, all rendered through one card component.
- News posts, including a `breaking` flag and category tabs.
- Author profile pages; site-wide stats (total reviews, total news, average score, publishing since 2025).
- Membership via Clerk — one "Player 2" plan holding four *features*: `ad_free`, `comments`, `full_rss`, `member_posts`. Gating is always feature-based, never plan-based, so tiers and pricing stay a dashboard decision.
- Comments (Neon Postgres), member RSS tokens, contact form (Resend), display advertising (AdSense), affiliate storefront links.
- Three switchable colour palettes (default, `amber`, and `candy`, the light mode) selected via `data-palette` on `<html>`, plus a tweaks panel, sound effects and a Konami code easter egg.

**Non-negotiable product facts**

1. **Articles are never paywalled.** Membership buys perks — ad-free reading, comments, full RSS, member posts — never access to a review or news post. Free site, paid perks. Any design that gates editorial content behind sign-in is wrong.
2. **The 10-point score plus its 3–5 component breakdown is the core editorial artifact.** It must stay legible and prominent on every surface that carries a review. The breakdown matters more than the headline figure and should never be demoted to a footnote or hidden behind interaction.
3. **The retro-arcade identity is binding.** Press Start 2P / JetBrains Mono / VT323, Fraunces for running prose, scanline overlay, CRT hero frame, pixel sprites, HP-bar score meters, three switchable palettes. This is not up for replacement — only for being executed better. See Brand Commitments.

**Technical constraints**

- Next.js 16 App Router + React 19; Sanity Studio is a separate React 18 workspace and is not to be unified with the frontend.
- All GROQ lives in `lib/content/queries.ts`. One card component renders all eight item types; per-type forks are prohibited — extend `lib/content/mappings.ts` and `components/retro/sprites.tsx` instead.
- Freshness comes from the Sanity webhook, which calls `revalidatePath` and `revalidateTag`. Timers are only a fallback, 30 days for content and 1 day for the homepage hero. A new Sanity `_type` must be added to `RENDERED_TYPES` in `app/api/revalidate/route.ts`.
- Every optional integration degrades to *absent*, not broken: without Clerk keys, membership is disabled and no auth UI renders; without AdSense keys, no ad slots render; without `DATABASE_URL`, comments and member RSS hide. Designs must hold up in the degraded state.
- pnpm workspace. Vercel build is the only CI gate, and it runs the Vitest suite first.

**Explicitly undecided**

- **Ad placement inside article bodies is an open product decision**, not a fixed constraint. `AdBreak` slots exist and members never load the AdSense script at all, but the owner did not mark "ads stay out of the article body" as non-negotiable. Treat in-body ad placement as a live tradeoff to be argued on the merits, not as settled either way.
- Whether the browsing enthusiast should be actively converted into a returning regular (newsletter, follow, account) is not established as a goal for this period; audience size is the stated metric.

## Brand Commitments

- **Name:** Life Meets Pixel. **Domain:** lifemeetspixel.com. **Voice:** first-person plural editorial, plain-spoken, Australian English, no marketing register. Representative lines already shipped: "We do not round up to be kind. If a review lands at 5, that is the review." / "► TELL US WE ARE WRONG".
- **Retro-arcade visual world is a binding brand commitment**, confirmed by the owner. Fonts, scanlines, CRT framing, sprites, HP bars and the three palettes are identity, not decoration.
- **Real imagery only.** Every image is official key art, press-kit material, storefront screenshots or publisher stills, credited in the caption. **No AI-generated images, ever.** No lifting another outlet's screenshots, and nothing with another outlet's watermark. Trailers embed only from the publisher's own channel, never a reupload. This is stated publicly at `/about`, so it is a promise to readers, not an internal preference.
- **No image is reused across articles**, and an image must depict what its section is actually about.
- **Social copy uses search keywords woven into natural sentences — never hashtags**, on any platform. Instagram CTA is always "link in bio", never a raw URL.
- **Every affiliate surface links to `/legal/affiliate-disclosure`** — an FTC and Australian Consumer Law requirement, not a style choice. Affiliate commissions never affect a score, and no review is commissioned by a retailer.

## Evidence on Hand

- **Real published content** in the production Sanity dataset: reviews across the eight item types and news posts, with real featured images, inline images and publisher trailer embeds.
- **Real site statistics** rendered live on `/about` from `SITE_STATS_QUERY` — total reviews, total news, average score, publishing since 2025. These are queried, never hardcoded.
- **A published editorial standards page** at `/about` covering the scoring scale, how a review gets made, image and video sourcing, affiliate and ad policy, corrections, and who writes here. This is the site's proof asset and it is already written; future surfaces should link to it rather than restating claims.
- **Real legal pages** at `/legal/affiliate-disclosure`, `/legal/privacy`, `/legal/terms`.
- **Real social presence:** Instagram `@life_meets_pixel`, a Facebook page, and a Discord invite, all in `lib/site/constants.ts`.
- **Absences future work must not fabricate:** there are no testimonials, no reader quotes, no press mentions, no traffic or subscriber numbers, no awards, no partner or publisher logos, and no member count. The site launched in 2025 and is self-funded by one person. Do not invent social proof, and do not design a surface whose structure requires it.

## Product Principles

1. **The verdict is the product.** The score, its breakdown, and the honesty around it are what the reader came for and what nobody else can copy. Every surface should make that artifact more legible, more auditable, and more obviously unbought.
2. **Design for the enthusiast who is browsing, not the buyer who is deciding.** The reward for a good page is another page read, not a click-out. Sideways movement across mediums is the behaviour worth designing for.
3. **Every article is a front door.** Most readers land on a single post from search or social, on mobile. An article page must establish who we are, why the score can be trusted, and where to go next — without assuming the homepage was ever seen.
4. **The arcade is the identity, and identity is not an excuse.** Retro styling is binding, but it must never cost legibility, contrast, or reading comfort. When the effect and the reader conflict, the reader wins, and the effect gets re-solved rather than removed.
5. **Free site, paid perks.** Membership adds comfort for supporters; it never subtracts from the reader. No design may gate editorial content, and every surface must hold up for a signed-out visitor with every optional integration switched off.

## Accessibility & Inclusion

WCAG AA contrast is treated as a hard requirement in this codebase, not an aspiration: `app/globals.css` carries per-token contrast-ratio annotations and documented remediations (for example the `candy` palette's `--neon-1` is `#c8005a` rather than Midnight's `#ff3d8b`, to clear 4.5:1 on `--bg-0`, and a note that a token used as both foreground and background must clear the bar in both roles). A skip link targets `#main-content`, and decorative sprites are `aria-hidden`.

This matters more than usual here because the identity is a high-contrast neon-on-dark arcade aesthetic with a scanline overlay and three swappable palettes — every palette must independently clear AA for both text and non-text roles. `prefers-reduced-motion: reduce` is already honoured in `app/globals.css` and in the sound engine, and any new motion or CRT effect is expected to honour it too. Recorded from code evidence; no additional user-specific accessibility requirement was established in interview.
