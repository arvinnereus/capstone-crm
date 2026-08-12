import { cookies } from "next/headers";

import { BRAND_COOKIE, parseBrandView, type BrandView } from "@/lib/brands";

/** Active brand view for the current request (server components / route handlers). */
export async function getActiveBrandView(): Promise<BrandView> {
  const store = await cookies();
  return parseBrandView(store.get(BRAND_COOKIE)?.value);
}
