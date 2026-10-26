import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/lab", "/lab/"],
        disallow: [
          "/api/",
          "/admin/",
          "/quote",
          "/history",
          "/checklists",
          "/login",
        ],
      },
    ],
  };
}
