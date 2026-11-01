import { cacheLife } from "next/cache";

/** The copyright year in the footer, computed once per `cacheLife("max")` entry. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("max");
  return new Date().getFullYear();
}
