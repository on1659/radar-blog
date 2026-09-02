export const getRelativeTime = (dateStr: string, locale: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const isKo = locale !== "en";

  if (diffMin < 1) return isKo ? "방금 전" : "just now";
  if (diffMin < 60) return isKo ? `${diffMin}분 전` : `${diffMin}m ago`;
  if (diffHour < 24) return isKo ? `${diffHour}시간 전` : `${diffHour}h ago`;
  if (diffDay < 7) return isKo ? `${diffDay}일 전` : `${diffDay}d ago`;
  if (diffWeek < 5) return isKo ? `${diffWeek}주 전` : `${diffWeek}w ago`;
  if (diffMonth < 12) return isKo ? `${diffMonth}개월 전` : `${diffMonth}mo ago`;
  return isKo ? `${diffYear}년 전` : `${diffYear}y ago`;
};
