# Life Meets Pixel

Public-facing geek-culture review site (games, movies, books, anime, board games, tech). Next.js 15 (App Router) + React 19 + Sanity CMS. Retro-gaming aesthetic: Press Start 2P / JetBrains Mono / VT323 fonts with Fraunces for prose, 3 switchable palettes (midnight, amber, candy as the light mode), scanline overlay, CRT hero frame, HP-bar score breakdown. Deployed on Vercel.

## Read this first

Durable project knowledge lives in the Obsidian vault at `~/Documents/ObsidianVault`, organised under the wiki schema. Start at the entry-point pages and follow `[[wikilinks]]`:

- [`wiki/entities/life-meets-pixel.md`](~/Documents/ObsidianVault/wiki/entities/life-meets-pixel.md): project entry point, links to everything else.
- [`wiki/concepts/life-meets-pixel-architecture.md`](~/Documents/ObsidianVault/wiki/concepts/life-meets-pixel-architecture.md), `life-meets-pixel-sanity-schema.md`, `life-meets-pixel-affiliate-integration.md`: topic-specific concepts.
- [`wiki/synthesis/life-meets-pixel-decisions.md`](~/Documents/ObsidianVault/wiki/synthesis/life-meets-pixel-decisions.md), `life-meets-pixel-backlog.md`, `life-meets-pixel-redesign-plan.md`: decision log, open work, redesign history.
- [`wiki/entities/life-meets-pixel-stack.md`](~/Documents/ObsidianVault/wiki/entities/life-meets-pixel-stack.md): versions + env vars.

Cross-project conventions:
- [`wiki/concepts/nextjs-patterns.md`](~/Documents/ObsidianVault/wiki/concepts/nextjs-patterns.md): App Router patterns (note: this repo invalidates from the Sanity webhook, not from `after()` in server actions).

The vault's operating manual is at [`WIKI-SCHEMA.md`](~/Documents/ObsidianVault/WIKI-SCHEMA.md). Master catalogue at [`wiki/index.md`](~/Documents/ObsidianVault/wiki/index.md).

## Write back to the vault

Any decision, convention, performance finding, or gotcha discovered during a session should be documented in the vault before the session ends, not just when asked. Update existing pages before creating new ones. Always update `wiki/index.md` and append to `wiki/log.md` when you create a page. Tags must come from the canonical taxonomy in `WIKI-SCHEMA.md`.

## Non-negotiable rules

- **All GROQ lives in `lib/content/queries.ts`.** Don't inline GROQ in components/pages (sitemap + one-off scripts excepted).
- **`components/retro/review-card.tsx` renders all 8 item types.** Don't fork per-type cards: extend `lib/content/mappings.ts` + `components/retro/sprites.tsx`.
- **`/api/revalidate` is gated on `REVALIDATE_SECRET`.** If you add a Sanity `_type` that renders on the site, add it to `RENDERED_TYPES` in `app/api/revalidate/route.ts`, or its edits only refresh the homepage until the 30-day `cacheLife("max")` window lapses.
- **Every affiliate surface links to `/legal/affiliate-disclosure`.** FTC + ACL requirement.
- **Studio (`studio/`) is React 18 + Sanity 3.99.** Frontend is React 19. Don't try to unify.
- **The webhook expires everything, on purpose.** A published mutation calls `revalidatePath("/", "layout")` plus `revalidateTag` for every tag in `lib/content/cache-tags.ts`. Never add per-page typed calls like `revalidatePath("/reviews", "page")`: a typed path has to include route groups (`/(site)/reviews/(listing)`), and a path without them silently matches nothing.
- **A text-only draft is not a deliverable.** Use the `article-media` skill for any `newsPost` or `review`.
- **Never put a hashtag in a caption, and a carousel or reel goes to Telegram for review before it counts as done.** Use the `social-copy` skill. Posting still needs Michael's explicit go for that item.

## Pointers

- Browser work: the `browser-automation` skill.
- Sanity MCP, env vars and every command: [`docs/setup.md`](docs/setup.md).
- This is a pnpm workspace, and `pnpm build` runs the tests first, so a failing test fails the Vercel build.
- `pnpm lint` isn't part of the build, so run it before a push.
- `pnpm test:e2e` uses dev-instance Clerk keys only and is never part of the Vercel build.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
