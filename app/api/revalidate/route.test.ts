import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISH_TAGS } from "@/lib/content/cache-tags";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => cache);

/** Document types that never render on the public site, so a webhook for them needs no page refresh. */
const NOT_RENDERED = new Set(["storyCandidate"]);

const SCHEMA_DIR = join(__dirname, "../../../studio/schemaTypes");
const APP_DIR = join(__dirname, "../..");
const ROOT_DIR = join(APP_DIR, "..");

/** Every `type: 'document'` declared in the Studio schema, by name. */
function studioDocumentTypes(): string[] {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .flatMap((f) => {
      const source = readFileSync(join(SCHEMA_DIR, f), "utf8").replace(/\s+/g, " ");
      const m = source.match(/defineType\(\{\s*name:\s*['"](\w+)['"].*?type:\s*['"](\w+)['"]/);
      return m && m[2] === "document" ? [m[1]] : [];
    });
}

/** Every non-test TypeScript source file under `app`, `components` and `lib`. */
function sourceFiles(): string[] {
  return ["app", "components", "lib"].flatMap((dir) =>
    readdirSync(join(ROOT_DIR, dir), { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => join(dir, f)),
  );
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

function webhook(body: unknown, secret = "right") {
  return new NextRequest(`https://lifemeetspixel.com/api/revalidate?secret=${secret}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const tags = () => cache.revalidateTag.mock.calls.map(([t]) => t);
const expiredEveryRoute = () => cache.revalidatePath.mock.calls.some(([p, type]) => p === "/" && type === "layout");

/** True when a typed `revalidatePath` names a real route folder, route groups included. */
function namesRouteFolder(path: string, type: "page" | "layout"): boolean {
  const dir = join(APP_DIR, path);
  return type === "layout" ? existsSync(dir) : ["page.tsx", "page.ts", "route.ts"].some((f) => existsSync(join(dir, f)));
}

beforeEach(() => vi.stubEnv("REVALIDATE_SECRET", "right"));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("/api/revalidate", () => {
  it("rejects a missing or wrong secret without revalidating anything", async () => {
    const { POST, GET } = await loadRoute();
    expect((await POST(webhook({ _type: "review" }, "wrong"))).status).toBe(401);
    const get = new NextRequest("https://lifemeetspixel.com/api/revalidate?path=/");
    expect((await GET(get)).status).toBe(401);
    vi.stubEnv("REVALIDATE_SECRET", "");
    const unset = await loadRoute();
    expect((await unset.POST(webhook({ _type: "review" }, ""))).status).toBe(401);
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it.each(studioDocumentTypes().filter((t) => !NOT_RENDERED.has(t)))(
    "expires every route and every tag when a published %s changes",
    async (type) => {
      const { POST } = await loadRoute();
      await POST(webhook({ _id: "abc", _type: type, slug: { current: "x" } }));
      expect(expiredEveryRoute()).toBe(true);
      expect(tags()).toEqual(expect.arrayContaining([...PUBLISH_TAGS]));
    },
  );

  it("expires only the homepage for a type the site never renders", async () => {
    const { POST } = await loadRoute();
    await POST(webhook({ _id: "abc", _type: "storyCandidate" }));
    expect(expiredEveryRoute()).toBe(false);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it.each([[{ _id: "abc" }], [{ _id: "abc", _type: null }]])(
    "expires everything when a delete payload %j names no type",
    async (body) => {
      const { POST } = await loadRoute();
      await POST(webhook(body));
      expect(expiredEveryRoute()).toBe(true);
      expect(tags()).toEqual(PUBLISH_TAGS);
    },
  );

  it("refreshes only the named path, leaving other pages' tags alone", async () => {
    const { GET } = await loadRoute();
    await GET(new NextRequest("https://lifemeetspixel.com/api/revalidate?secret=right&path=/news"));
    expect(cache.revalidatePath).toHaveBeenCalledWith("/news");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("expires every route on a manual refresh with no path", async () => {
    const { GET } = await loadRoute();
    await GET(new NextRequest("https://lifemeetspixel.com/api/revalidate?secret=right"));
    expect(expiredEveryRoute()).toBe(true);
    expect(tags()).toEqual(PUBLISH_TAGS);
  });

  it("names an untyped draft in its response", async () => {
    const { POST } = await loadRoute();
    const res = await POST(webhook({ _id: "drafts.abc" }));
    expect((await res.json()).message).toBe("Skipped draft untyped document");
  });

  it("names a non-string type as untyped in its response", async () => {
    const { POST } = await loadRoute();
    const res = await POST(webhook({ _id: "drafts.abc", _type: { x: 1 } }));
    expect((await res.json()).message).toBe("Skipped draft untyped document");
  });

  it("expires everything when the payload is JSON null", async () => {
    const { POST } = await loadRoute();
    expect((await POST(webhook("null"))).status).toBe(200);
    expect(expiredEveryRoute()).toBe(true);
  });

  it("allows only the days and max cacheLife profiles and no fetch timer", () => {
    const shortLived = /cacheLife\((?!\s*["'](days|max)["'])|next:\s*\{\s*revalidate/;
    const offenders = sourceFiles().filter((f) => shortLived.test(readFileSync(join(ROOT_DIR, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("ignores draft mutations, which the tokenless read client never sees", async () => {
    const { POST } = await loadRoute();
    const res = await POST(webhook({ _id: "drafts.abc", _type: "review", slug: { current: "x" } }));
    expect(res.status).toBe(200);
    expect(cache.revalidatePath).not.toHaveBeenCalled();
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("only passes typed paths that name a real route folder under app/", async () => {
    const { POST } = await loadRoute();
    for (const type of [...studioDocumentTypes(), "unknownType"]) {
      await POST(webhook({ _id: "abc", _type: type, slug: { current: "x" } }));
    }
    const typed = cache.revalidatePath.mock.calls.filter(([, type]) => type);
    expect(typed.length).toBeGreaterThan(0);
    for (const [path, type] of typed) expect(namesRouteFolder(path, type), `${path} (${type})`).toBe(true);
  });

  it("recognises a typed path that misses a route group", () => {
    expect(namesRouteFolder("/reviews", "page")).toBe(false);
    expect(namesRouteFolder("/(site)/reviews/(listing)", "page")).toBe(true);
  });

  it("finds the Studio schema, so the check above is not vacuous", () => {
    expect(studioDocumentTypes()).toEqual(expect.arrayContaining(["review", "newsPost", "author", "storyCandidate"]));
  });

  it("answers 500 on a body that is not JSON", async () => {
    const { POST } = await loadRoute();
    expect((await POST(webhook("not json"))).status).toBe(500);
  });
});
