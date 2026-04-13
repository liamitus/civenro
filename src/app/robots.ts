import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/account/"],
    },
    sitemap: "https://www.govroll.com/sitemap.xml",
  };
}
