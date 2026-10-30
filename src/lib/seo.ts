import { absoluteUrl } from "./wordpress";

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(item.path),
      name: item.name,
    })),
  };
}

export function parseWpDate(input: string | undefined): Date | undefined {
  if (!input) return undefined;
  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) return direct;
  const normalized = input.replace(/(\d{1,2}):(\d{2})(am|pm)/i, (_, h, m, ap) => {
    let hour = Number(h);
    const isPm = String(ap).toLowerCase() === "pm";
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${m}:00`;
  });
  const retry = new Date(normalized);
  return Number.isNaN(retry.getTime()) ? undefined : retry;
}
