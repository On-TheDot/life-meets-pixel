/* eslint-disable no-console */
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { PUBLISH_TAGS } from '@/lib/content/cache-tags';

// Secret token to secure the webhook
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

/**
 * Sanity document types that render on the public site. A mutation to one of
 * them, or a payload with no `_type`, expires every route and `PUBLISH_TAGS`.
 * Any other type expires the homepage.
 */
const RENDERED_TYPES = new Set([
  "review",
  "newsPost",
  "author",
  "reviewableItem",
  "category",
  "tag",
  "genre",
  "platform",
]);

/**
 * Expires every page and route handler, including their fetch Data Cache
 * entries. A typed `revalidatePath` matches the route's file path with route
 * groups included, and `/` + `layout` is the one such path every route has.
 */
const expireAllRoutes = () => revalidatePath("/", "layout");

/**
 * Expires `use cache` entries by `cacheTag`. `max` serves the stale entry
 * while it refreshes; `updateTag` is Server-Action-only and throws here.
 */
const expire = (...tags: string[]) => tags.forEach((t) => revalidateTag(t, "max"));

export async function POST(request: NextRequest) {
  // Verify secret token
  const token = request.nextUrl.searchParams.get("secret");

  if (!REVALIDATE_SECRET || token !== REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const documentType = body?._type;
    const label = documentType ?? "untyped document";
    const slug = body?.slug?.current;

    if (typeof body?._id === "string" && body._id.startsWith("drafts.")) {
      return NextResponse.json({ revalidated: false, message: `Skipped draft ${label}` });
    }

    if (typeof documentType !== "string" || RENDERED_TYPES.has(documentType)) {
      expireAllRoutes();
      expire(...PUBLISH_TAGS);
    } else {
      revalidatePath("/");
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: `Revalidated ${label}${slug ? ` (${slug})` : ""}`,
    });
  } catch (err) {
    console.error("Error revalidating:", err);
    return NextResponse.json(
      { message: "Error revalidating", error: String(err) },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("secret");
  const path = request.nextUrl.searchParams.get("path");

  if (!REVALIDATE_SECRET || token !== REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    if (path) {
      revalidatePath(path);
    } else {
      expireAllRoutes();
      expire(...PUBLISH_TAGS);
    }
    return NextResponse.json({
      revalidated: true,
      path: path ?? "every route",
      now: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Error revalidating", error: String(err) },
      { status: 500 }
    );
  }
}
