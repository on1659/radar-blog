"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// 서버 컴포넌트(모니터 페이지)를 주기적으로 다시 불러온다.
const AutoRefresh = ({ seconds = 30 }: { seconds?: number }) => {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [enabled, seconds, router]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.refresh()}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary"
      >
        <RefreshCw size={13} />
        새로고침
      </button>
      <label className="flex items-center gap-1.5 text-meta text-text-tertiary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-cat-signal"
        />
        {seconds}초 자동
      </label>
    </div>
  );
};

export default AutoRefresh;
