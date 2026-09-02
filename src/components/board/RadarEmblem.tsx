/**
 * memradar 레이더 엠블럼 — 커뮤니티 섹션의 시그니처.
 * memradar 아이콘 사양(viewBox 24, stroke 1.75, currentColor)을 따른다.
 * animated면 스윕 라인이 7s 주기로 회전한다 (globals.css .board-radar-sweep,
 * prefers-reduced-motion 시 전역 룰이 자동 정지).
 */
export const RadarEmblem = ({
  size = 40,
  animated = true,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" opacity="0.45" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" opacity="0.7" />
    <g className={animated ? "board-radar-sweep" : undefined}>
      <line x1="12" y1="12" x2="12" y2="3" />
    </g>
  </svg>
);
