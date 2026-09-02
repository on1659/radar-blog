"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types";

/** 글 삭제 버튼 — 확인 후 DELETE, 성공 시 목록으로 이동 */
export const DeleteButton = ({
  endpoint,
  redirectTo,
  label,
  confirmText,
}: {
  endpoint: string;
  redirectTo: string;
  label: string;
  confirmText: string;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy || !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        router.push(redirectTo);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void remove()}
      className="text-meta text-text-muted transition-colors duration-base hover:text-[#EF4444] disabled:opacity-50"
    >
      {label}
    </button>
  );
};
