import Link from "next/link";

interface FooterDict {
  links: string;
  categories: string;
  copyright: string;
}

export const Footer = ({ dict }: { dict: FooterDict }) => {
  return (
    <footer className="border-t border-border py-10 px-5 sm:px-8">
      <div className="mx-auto flex max-w-container flex-col justify-between gap-8 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 text-base font-[800]">
            이더<span className="text-brand-primary">.</span>dev
          </div>
          <div className="text-meta text-text-muted">{dict.copyright}</div>
        </div>

        <div className="flex gap-6">
          <div>
            <div className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {dict.links}
            </div>
            <Link href="https://github.com/on1659" target="_blank" rel="noopener noreferrer" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              GitHub
            </Link>
            <Link href="/rss.xml" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              RSS Feed
            </Link>
            <Link href="mailto:on1659@naver.com" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              Email
            </Link>
          </div>
          <div>
            <div className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {dict.categories}
            </div>
            <Link href="/commits" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              Commits
            </Link>
            <Link href="/articles" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              Articles
            </Link>
            <Link href="/techlab" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              Tech Lab
            </Link>
            <Link href="/casual" className="mb-1.5 block text-meta text-text-tertiary transition-colors duration-base hover:text-brand-primary">
              Casual
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
