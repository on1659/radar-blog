import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchContent } from "./SearchContent";

export const metadata: Metadata = { title: "검색" };

const SearchPage = () => {
  return (
    <Suspense fallback={<div className="mx-auto max-w-container px-5 sm:px-8 py-12 text-center text-text-tertiary">로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  );
};

export default SearchPage;
