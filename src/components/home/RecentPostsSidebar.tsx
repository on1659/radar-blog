import Link from "next/link";
import type { PostMeta, Category } from "@/types";

const categoryDot: Record<Category, string> = {
  commits: "bg-cat-commits",
  articles: "bg-cat-articles",
  casual: "bg-cat-casual",
  signal: "bg-cat-signal",
};

interface RecentPostsSidebarProps {
  posts: PostMeta[];
  title: string;
}

export const RecentPostsSidebar = ({ posts, title }: RecentPostsSidebarProps) => {
  if (posts.length === 0) return null;

  return (
    <aside className="w-full lg:w-[260px] lg:flex-shrink-0">
      <div className="sticky top-24 rounded-xl border border-border-light bg-bg-secondary p-4">
        <h3 className="mb-3 text-[0.9375rem] font-bold tracking-[-0.01em]">
          {title}
        </h3>
        <ul className="flex flex-col gap-1">
          {posts.slice(0, 10).map((post) => (
            <li key={post.id}>
              <Link
                href={`/post/${post.slug}`}
                className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors duration-base hover:bg-card-hover"
              >
                <span
                  className={`mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${categoryDot[post.category]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[0.8125rem] leading-[1.4] text-text-secondary transition-colors duration-base group-hover:text-text-primary">
                    {post.title}
                  </p>
                  <span className="mt-0.5 block text-[0.6875rem] text-text-muted">
                    {new Date(post.createdAt)
                      .toLocaleDateString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        timeZone: "Asia/Seoul",
                      })
                      .replace(/\. /g, ".")
                      .replace(/\.$/, "")}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
