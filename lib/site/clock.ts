import { format } from "date-fns";
import { cacheLife } from "next/cache";

/** The copyright year in the footer, computed once per `cacheLife("max")` entry. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("max");
  return new Date().getFullYear();
}

/** `iso` as "5 Aug 2026", in the server's time zone. */
export const formatPublishDate = (iso: string) => format(new Date(iso), "d MMM yyyy");
