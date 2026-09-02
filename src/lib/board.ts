import type { BoardCategory } from "@prisma/client";

export const BOARD_CATEGORIES = ["showcase", "chat", "question"] as const;

export const isBoardCategory = (value: string): value is BoardCategory =>
  (BOARD_CATEGORIES as readonly string[]).includes(value);

/** 리액션 이모지 서버 화이트리스트 */
export const BOARD_EMOJIS = ["👍", "❤️", "😂", "🔥"] as const;

export const isBoardEmoji = (value: string): boolean =>
  (BOARD_EMOJIS as readonly string[]).includes(value);

export const BOARD_PAGE_SIZE = 12;
export const BOARD_TITLE_MAX = 100;
export const BOARD_BODY_MAX = 5000;
export const BOARD_COMMENT_MAX = 1000;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
/** 글에 연결되지 않은(고아) 이미지의 유저당 상한 */
export const MAX_PENDING_IMAGES = 5;

/** C0 제어문자(개행·탭 제외)와 DEL — 본문 서식은 유지하고 눈에 안 보이는 문자만 제거 */
const CONTROL_CHARS = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "g");

/** 제어문자 제거 + trim */
export const sanitizeBoardText = (input: string): string =>
  input.replace(CONTROL_CHARS, "").trim();

/**
 * 매직바이트로 실제 이미지 타입 판정. 클라이언트가 보낸 Content-Type은 신뢰하지 않는다.
 * SVG/GIF는 의도적으로 거부 — SVG는 inline 서빙 시 XSS 벡터.
 */
export const sniffImageMime = (
  buf: Uint8Array
): "image/png" | "image/jpeg" | "image/webp" | null => {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
};
