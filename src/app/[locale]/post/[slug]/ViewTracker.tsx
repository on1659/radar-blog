"use client";

import { useEffect } from "react";

export const ViewTracker = ({ postId, isAdmin = false }: { postId: string; isAdmin?: boolean }) => {
  useEffect(() => {
    if (isAdmin) return;

    const key = `viewed:${postId}`;
    if (sessionStorage.getItem(key)) return;

    const track = async () => {
      try {
        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
        sessionStorage.setItem(key, "1");
      } catch { /* silent */ }
    };
    track();
  }, [postId, isAdmin]);

  return null;
};
