interface HeroDict {
  title: string;
  subtitle: string;
  description: string;
}

export const HeroBanner = ({ dict }: { dict: HeroDict }) => {
  // Split title for gradient styling - detect Korean or English
  const isKo = dict.title.includes("글이 된다");
  const titleParts = isKo
    ? { before: "코드를 쓰면, ", highlight: "글이 된다." }
    : { before: "Code becomes ", highlight: "content." };

  return (
    <section className="relative overflow-hidden bg-[#1B1D1F] px-5 sm:px-8 py-20 text-center dark:bg-[#0F1012]">
      <div
        className="pointer-events-none absolute -left-[20%] -top-[50%] h-[200%] w-[140%]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(49,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.06) 0%, transparent 50%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-[640px]">
        <h1 className="mb-4 text-[2rem] font-[800] leading-[1.35] tracking-[-0.03em] text-white">
          {titleParts.before}
          <em className="bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] bg-clip-text not-italic text-transparent">
            {titleParts.highlight}
          </em>
        </h1>
        <p className="text-[1.0625rem] leading-[1.7] text-white/70">
          {dict.subtitle}
          <br />
          {dict.description}
        </p>
      </div>
    </section>
  );
};
