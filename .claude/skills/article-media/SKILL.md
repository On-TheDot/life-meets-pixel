---
name: article-media
description: Media rules for a newsPost or review: featured image, inline images, official trailer, sourcing and upload. Use when drafting an article, adding images or video to one, or checking a draft is ready.
---

# Article media, non-negotiable

**A text-only draft is not a deliverable.** Never hand over a `newsPost` or `review` draft without all three:

1. **Featured image**: real promo art, press-kit still, key art or Steam capsule. Download it and actually *look* at it (`Read` the file) before attaching. Outlet `og:image` tags are sometimes memes or collages.
2. **At least 2 inline body images**, spread through the sections, each with a required `alt` *and* a `caption` crediting the source ("Screenshot via Steam / BioWare", "Still via Sony Pictures").
3. **A `videoEmbed` of the official trailer** under a closing `h2` ("Watch the trailer"), whenever one exists.

**Verify the video's channel before embedding.** `curl -sL "https://www.youtube.com/watch?v=<id>" | grep -oE '"author":"[^"]*"'` and confirm it is the studio/publisher's own account. Fan reuploads and outlet reuploads (IGN, Entertainment Tonight) don't go on the site.

**No AI-generated images, ever.** Real existing art only.

**Never reuse an image across articles**, and **the photo must depict what its section is actually about**. A Spider-Man still under a heading called "The X-Men question" is not acceptable, however well the body text connects them: find Cyclops, a Sentinel, the mutant teaser. Same per carousel slide, four content slides need four distinct on-topic images, not two alternating. Reject anything with another outlet's watermark burned in (io9/Gizmodo badges, IGN bugs). Check `file <img>` for embedded EXIF, press stills often carry a "Photo courtesy of Marvel" description that confirms provenance.

Useful sources: the primary source article's `og:image`; publisher newsrooms (`cdn.marvel.com`, `blog.playstation.com`); Steam official screenshots via `https://store.steampowered.com/api/appdetails?appids=<id>`; Steam art at `https://cdn.cloudflare.steamstatic.com/steam/apps/<id>/library_hero.jpg`.

Upload with `@sanity/client` `assets.upload('image', stream, {filename})`, then patch `featuredImage` / splice the image block into `content`.
