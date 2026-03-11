export const revalidate = 3600;

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const postUrls = posts.map((post) => ({
    url: `${siteConfig.url}/post/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/commits`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/techlab`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/casual`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...postUrls,
  ];
};

export default sitemap;
