export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function urlEntry(opts: {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}): string {
  const parts = [`<url><loc>${escapeXml(opts.loc)}</loc>`];
  if (opts.lastmod) parts.push(`<lastmod>${escapeXml(opts.lastmod)}</lastmod>`);
  if (opts.changefreq) parts.push(`<changefreq>${opts.changefreq}</changefreq>`);
  if (opts.priority) parts.push(`<priority>${opts.priority}</priority>`);
  parts.push(`</url>`);
  return parts.join("");
}

export function urlset(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapIndex(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
