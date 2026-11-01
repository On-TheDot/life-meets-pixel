---
name: social-copy
description: Instagram and Facebook rules: keywords never hashtags, the CTA, and Telegram review before posting. Use when writing a caption or making a carousel or reel.
---

# Social copy: keywords, never hashtags

**Never put a hashtag in a caption. Not one, on any platform.** Instagram ranks captions on search keywords now, so a hashtag block does nothing but read as spam. Instead work the searchable terms into natural sentences and front-load the strongest keyword phrase in the first line:

- Bad: `Marvel dropped the slate. #LifeMeetsPixel #Marvel #MCU #ComicCon`
- Good: `The Avengers: Doomsday slate after San Diego Comic-Con 2026 is four Marvel movies in three years.`

Searchable terms worth weaving in: title, studio/publisher, platform, genre, year, event name. This applies to the `igCaption` and `fbMessage` in `lib/pipeline/social.ts`, and to the social pack in `.claude/commands/draft-news.md` and `draft-review.md`. Keep all four in sync.

The CTA in an Instagram caption is always "link in bio". Never a raw URL (not clickable, and IG demotes it). Facebook links are clickable, so the full URL goes there.

## Social assets

Any carousel or reel is **rendered and sent to Telegram for review** before it counts as done. Don't describe it, don't leave PNGs in a scratchpad. Render the real slides through `/social-template` (the same route the pipeline screenshots) so what Michael approves is what ships, then `sendMediaGroup` to the bot. Posting to Instagram/Facebook still needs his explicit go for that specific item.
