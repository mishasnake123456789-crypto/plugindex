import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/wordpress";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/stats", "/stats/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/stats", "/stats/"],
      },
      {
        userAgent: "bingbot",
        allow: "/",
        disallow: ["/api/", "/stats", "/stats/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
