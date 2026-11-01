# Project setup

## Sanity MCP

Register the hosted Sanity MCP server once per machine (OAuth: no token needed):

```
claude mcp add Sanity -t http https://mcp.sanity.io --scope user
```

After first use it'll prompt an OAuth browser flow. Use the MCP for schema introspection, data queries, and content patches: faster than maintaining one-off scripts in `scripts/`. The `SANITY_API_TOKEN` in `.env.local` is still needed for the local seed/delete scripts, but **not** for the MCP.

## Env vars (`.env.local`)

```
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=1ir3sv5r
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=sk_...              # Editor/Admin: seed scripts, delete-alex, MCP

# Site
NEXT_PUBLIC_SITE_URL=https://lifemeetspixel.com
REVALIDATE_SECRET=...                # gates /api/revalidate webhook

# Clerk (membership: auth + billing: optional; without keys the site runs
# with membership disabled and no auth UI renders)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...  # gates /api/clerk; without it that route 404s
                                        # Clerk dashboard > Webhooks > Add Endpoint
                                        # https://lifemeetspixel.com/api/clerk
                                        # events: user.created, user.deleted,
                                        # subscriptionItem.active/.canceled/.pastDue/
                                        # .freeTrialEnding  → pings Telegram

# Google AdSense (optional: without these no ad slots render; ad_free members
# never load the AdSense script at all)
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...
NEXT_PUBLIC_ADSENSE_SLOT=...         # a responsive display unit's slot id

# Comments + member RSS (optional: Neon Postgres; without it those features hide)
DATABASE_URL=postgres://...          # Neon connection string
# Admin access (all member features comped + delete any comment): set the Clerk
# user's PUBLIC metadata to {"role": "admin"} in the Clerk dashboard (per instance)

# Resend (contact form)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Life Meets Pixel <noreply@onthedot.dev>"
CONTACT_TO_EMAIL=michael@lifemeetspixel.com   # optional

# Telegram approval bot (content pipeline)
TELEGRAM_BOT_TOKEN=...               # from @BotFather
TELEGRAM_CHAT_ID=...                 # pnpm telegram:setup -- --updates
TELEGRAM_WEBHOOK_SECRET=...          # openssl rand -hex 24; gates /api/telegram

# Radar cron (content pipeline)
CRON_SECRET=...                      # openssl rand -hex 24; gates /api/radar, /api/draft, /api/social
ANTHROPIC_API_KEY=sk-ant-...         # radar ranking + drafting agent + social copy

# Meta / Instagram + Facebook posting (optional: without these, /api/social
# delivers the rendered template + captions to Telegram for manual posting)
META_PAGE_ID=...                     # Facebook Page ID
META_IG_USER_ID=...                  # Instagram business account ID linked to the Page
META_PAGE_ACCESS_TOKEN=...           # long-lived Page token: pages_manage_posts + instagram_content_publish

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-...
```

## Commands

```bash
# Frontend (pnpm: this is a pnpm workspace, not npm)
pnpm dev                # Next dev server
pnpm build              # runs `vitest run` first; a failing test fails the Vercel build
pnpm start
pnpm lint               # not part of the build; run it locally before push
pnpm test               # Vitest unit tests (*.test.ts next to the code they test)
pnpm test:e2e           # Playwright: admin access with real Clerk dev-instance test users, and layout
                        # rules at 390/820/1440px, on a fresh production build (E2E_BASE_URL=http://localhost:3000
                        # reuses the dev server instead). Dev-instance keys only; never part of the Vercel build

# Sanity Studio
pnpm studio             # http://localhost:3333
pnpm studio:build
pnpm studio:deploy

# Data scripts (needs SANITY_API_TOKEN in .env.local)
pnpm seed:dry-run
pnpm seed
pnpm delete:alex:dry-run
pnpm delete:alex        # add --force to also delete referencing docs
```

<!-- BEGIN:nextjs-agent-rules -->
