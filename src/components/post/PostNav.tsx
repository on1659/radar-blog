import Link from "next/link";

interface NavPost {
  slug: string;
  title: string;
}

export const PostNav = ({
  prev,
  next,
}: {
  prev?: NavPost | null;
  next?: NavPost | null;
}) => {
  if (!prev && !next) return null;

  return (
    <div className="mx-auto grid max-w-[1000px] grid-cols-2 gap-3 px-8 pb-12">
      {prev ? (
        <Link
          href={`/post/${prev.slug}`}
          className="rounded-xl border border-border p-5 transition-all duration-base hover:border-brand-primary"
        >
          <div className="mb-1 text-xs text-text-muted">← 이전 글</div>
          <div className="text-card-desc font-semibold leading-[1.4]">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/post/${next.slug}`}
          className="rounded-xl border border-border p-5 text-right transition-all duration-base hover:border-brand-primary"
        >
          <div className="mb-1 text-xs text-text-muted">다음 글 →</div>
          <div className="text-card-desc font-semibold leading-[1.4]">
            {next.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};
