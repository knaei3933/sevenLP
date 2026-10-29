import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  return [
    { url: new URL("/", siteUrl).toString(), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/lab", siteUrl).toString(), lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: new URL("/privacy", siteUrl).toString(), lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/legal", siteUrl).toString(), lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
