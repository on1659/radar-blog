const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

/**
 * 게시판 본문 렌더러 — plain text + URL 자동 링크.
 * 사용자 입력이므로 HTML/마크다운 렌더 금지, dangerouslySetInnerHTML 절대 사용 금지.
 * React 엘리먼트 조립만으로 XSS를 원천 차단한다.
 */
export const PlainTextBody = ({ text }: { text: string }) => {
  const parts = text.split(URL_PATTERN);
  return (
    <div className="whitespace-pre-wrap break-words text-body text-text-primary">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all text-board-accent underline underline-offset-[3px]"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
};
