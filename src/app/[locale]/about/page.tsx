export const revalidate = 3600;

import { Github, Mail, Rss } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "About" };

const PAGE_SIZE = 8;

const getProjects = async (page = 1) => {
  try {
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.project.count({ where: { active: true } }),
    ]);
    return { items, totalPages: Math.ceil(total / PAGE_SIZE) };
  } catch {
    return { items: [], totalPages: 0 };
  }
};

const AboutPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) => {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { author, techStack } = siteConfig;
  const { items: dbProjects, totalPages } = await getProjects(page);

  // DB에 프로젝트가 있으면 DB 사용, 없으면 site.ts 폴백
  const projects = dbProjects.length > 0
    ? dbProjects.map((p) => ({
        name: p.name,
        description: p.description || "",
        icon: p.icon,
        gradient: p.gradient,
        tags: p.tags,
        githubUrl: p.githubUrl,
        deployUrl: p.deployUrl,
      }))
    : siteConfig.projects.map((p) => ({ ...p, githubUrl: null, deployUrl: null }));

  return (
    <>
      {/* Hero Section */}
      <section className="bg-[#1B1D1F] px-5 sm:px-8 py-[72px] text-center dark:bg-[#0F1012]">
        <div className="mx-auto mb-5 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] text-4xl font-[800] text-white">
          E
        </div>
        <h1 className="mb-1.5 text-[1.75rem] font-[800] text-white">
          {author.name}
        </h1>
        <p className="mb-1 text-base text-white/70">{author.role}</p>
        <p className="mb-7 text-[0.9375rem] text-white/50">{author.sub}</p>
        <div className="flex justify-center gap-2.5">
          <Link
            href={author.github}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-meta font-medium text-white/70 transition-all duration-base hover:border-white/50 hover:text-white"
          >
            <Github size={15} /> GitHub
          </Link>
          <Link
            href={`mailto:${author.email}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-meta font-medium text-white/70 transition-all duration-base hover:border-white/50 hover:text-white"
          >
            <Mail size={15} /> Email
          </Link>
          <Link
            href="/rss.xml"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-meta font-medium text-white/70 transition-all duration-base hover:border-white/50 hover:text-white"
          >
            <Rss size={15} /> RSS
          </Link>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-content px-5 sm:px-8 pb-20 pt-12">
        {/* 소개 */}
        <h2 className="mb-4 text-sub-heading tracking-[-0.01em]">소개</h2>
        <div className="mb-12 space-y-4 text-body text-text-secondary">
          {author.bio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* 프로젝트 */}
        <h2 id="projects" className="mb-4 text-sub-heading tracking-[-0.01em]">
          프로젝트
        </h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((proj) => {
            const Wrapper = proj.githubUrl ? "a" : "div";
            const wrapperProps = proj.githubUrl
              ? { href: proj.githubUrl, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper
                key={proj.name}
                {...wrapperProps}
                className="block rounded-xl border border-border p-5 transition-all duration-base hover:-translate-y-0.5 hover:border-brand-primary"
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-base text-white ${proj.gradient}`}
                >
                  {proj.icon}
                </div>
                <div className="mb-1 text-[0.9375rem] font-semibold">
                  {proj.name}
                </div>
                <div className="mb-2.5 text-meta leading-[1.5] text-text-tertiary">
                  {proj.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-bg-secondary px-[7px] py-0.5 text-[0.6875rem] font-medium text-text-tertiary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Wrapper>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="mb-12 flex justify-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/about?page=${p}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-text-primary text-bg-primary"
                    : "text-text-tertiary hover:bg-card-hover hover:text-text-primary"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}

        {/* 기술 스택 */}
        <h2 className="mb-4 text-sub-heading tracking-[-0.01em]">기술 스택</h2>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="cursor-default rounded-md border border-border px-3.5 py-[7px] text-meta font-medium text-text-secondary transition-all duration-base hover:border-brand-primary hover:text-brand-primary"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default AboutPage;
