import { BRAND_COOKIE, parseBrandView, type BrandId, type BrandView } from "@/lib/brands";

/** Active brand view read from document.cookie (client components only). */
export function getClientBrandView(): BrandView {
  if (typeof document === "undefined") return "group";
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${BRAND_COOKIE}=`));
  return parseBrandView(match?.split("=")[1]);
}

/** Brand to preselect in create forms — Group view falls back to Consulting. */
export function getClientDefaultBrand(): BrandId {
  const view = getClientBrandView();
  return view === "group" ? "consulting" : view;
}
