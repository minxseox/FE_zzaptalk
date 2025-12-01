// src/services/chat.ts
import { get, post } from "../lib/api";
import type {
  ChatRoomUserListItem,
  ChatRoomResponse,
  ChatMessageResponse,
} from "../types/chat";

// ---- Paths (오타/변경에 대비)
const PATH = {
  LIST: "api/chat/rooms/list",
  SINGLE: "api/chat/rooms/single",
  GROUP: "api/chat/rooms/group",
  MESSAGES: (roomId: number) => `api/chat/rooms/${roomId}/messages`,
} as const;

// 그룹 생성 응답 (명세 반영)
export type GroupChatRoomResponse = {
  roomId: number;
  roomName: string | null;
  memberNicknames: string[];
};

/* ==================================
 * ✅ 에러 래핑 유틸
 * ================================== */
class ChatServiceError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "ChatServiceError";
  }
}

function wrapError(err: unknown, context: string): ChatServiceError {
  if (err instanceof ChatServiceError) return err;

  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ChatService] ${context}:`, err);

  return new ChatServiceError(`${context}: ${message}`, err);
}

/* ==================================
 * 채팅방 목록 조회
 * ================================== */
export async function getChatRoomList(
  signal?: AbortSignal
): Promise<ChatRoomUserListItem[]> {
  try {
    return await get<ChatRoomUserListItem[]>(PATH.LIST, undefined, { signal });
  } catch (err) {
    throw wrapError(err, "채팅방 목록 조회 실패");
  }
}

/* ==================================
 * 1:1 채팅방 생성/조회
 * ================================== */
export async function createOrGetSingleChatRoom(
  targetUserId: number,
  signal?: AbortSignal
): Promise<ChatRoomResponse> {
  // ✅ 입력 검증
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    throw new ChatServiceError("유효하지 않은 사용자 ID입니다");
  }

  try {
    return await post<ChatRoomResponse>(
      PATH.SINGLE,
      { targetUserId },
      { signal }
    );
  } catch (err) {
    throw wrapError(err, "1:1 채팅방 생성 실패");
  }
}

/* ==================================
 * 그룹 채팅방 생성
 * ================================== */
export async function createGroupChatRoom(
  roomName: string | null,
  invitedUserIds: number[],
  signal?: AbortSignal
): Promise<GroupChatRoomResponse> {
  // ✅ 입력 검증
  if (!Array.isArray(invitedUserIds) || invitedUserIds.length === 0) {
    throw new ChatServiceError("초대할 사용자를 선택해주세요");
  }

  // 중복/음수 제거
  const uniqIds = Array.from(new Set(invitedUserIds)).filter(
    (id) => Number.isFinite(id) && id > 0
  );

  if (uniqIds.length === 0) {
    throw new ChatServiceError("유효한 사용자 ID가 없습니다");
  }

  try {
    return await post<GroupChatRoomResponse>(
      PATH.GROUP,
      { roomName, invitedUserIds: uniqIds },
      { signal }
    );
  } catch (err) {
    throw wrapError(err, "그룹 채팅방 생성 실패");
  }
}

/* ==================================
 * 채팅 메시지 내역 조회
 * ================================== */
export async function getChatMessages(
  roomId: number,
  opts?: {
    cursor?: string | number;
    size?: number;
    signal?: AbortSignal;
  }
): Promise<ChatMessageResponse[]> {
  // ✅ 입력 검증
  if (!Number.isFinite(roomId) || roomId <= 0) {
    throw new ChatServiceError("유효하지 않은 채팅방 ID입니다");
  }

  const { cursor, size, signal } = opts ?? {};

  try {
    return await get<ChatMessageResponse[]>(
      PATH.MESSAGES(roomId),
      { cursor, size },
      { signal }
    );
  } catch (err) {
    throw wrapError(err, "채팅 메시지 조회 실패");
  }
}

/* ==================================
 * ✅ 페이지네이션 지원 (옵션)
 * ================================== */
export async function getChatMessagesWithPagination(
  roomId: number,
  opts?: {
    cursor?: string | number;
    size?: number;
    signal?: AbortSignal;
  }
): Promise<{
  messages: ChatMessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const messages = await getChatMessages(roomId, opts);

  // ✅ 서버가 hasMore, nextCursor 안 주면 클라이언트에서 추정
  const size = opts?.size ?? 50;
  const hasMore = messages.length >= size;
  const nextCursor =
    hasMore && messages.length > 0
      ? String(messages[messages.length - 1].messageId)
      : null;

  return {
    messages,
    nextCursor,
    hasMore,
  };
}

/* ==================================
 * ✅ 타임아웃 지원 래퍼
 * ================================== */
export async function getChatMessagesWithTimeout(
  roomId: number,
  timeoutMs: number = 10000,
  opts?: { cursor?: string | number; size?: number }
): Promise<ChatMessageResponse[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await getChatMessages(roomId, {
      ...opts,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      throw new ChatServiceError("요청 시간이 초과되었습니다");
    }

    throw err;
  }
}
