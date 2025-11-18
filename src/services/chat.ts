// src/services/chat.ts
import { get, post } from "../lib/api";
import type {
  ChatRoomUserListItem,
  ChatRoomResponse,
  ChatMessageResponse,
} from "../types/chat";

// ---- Paths (오타/변경에 대비)
const PATH = {
  LIST: "/api/chat/rooms/list",
  SINGLE: "/api/chat/rooms/single",
  GROUP: "/api/chat/rooms/group",
  MESSAGES: (roomId: number) => `/api/chat/rooms/${roomId}/messages`,
} as const;

// 그룹 생성 응답 (명세 반영)
export type GroupChatRoomResponse = {
  roomId: number;
  roomName: string | null;
  memberNicknames: string[];
};

/** 채팅방 목록 조회 */
export async function getChatRoomList(
  signal?: AbortSignal
): Promise<ChatRoomUserListItem[]> {
  return await get<ChatRoomUserListItem[]>(PATH.LIST, undefined, { signal });
}

/** 1:1 채팅방 생성/조회 */
export async function createOrGetSingleChatRoom(
  targetUserId: number,
  signal?: AbortSignal
): Promise<ChatRoomResponse> {
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    throw new Error("targetUserId는 양의 정수여야 합니다.");
  }
  return await post<ChatRoomResponse>(
    PATH.SINGLE,
    { targetUserId },
    { signal }
  );
}

/** 그룹 채팅방 생성 */
export async function createGroupChatRoom(
  roomName: string | null,
  invitedUserIds: number[],
  signal?: AbortSignal
): Promise<GroupChatRoomResponse> {
  // 중복/음수 제거(서버가 해주더라도 클라에서 한 번 정리)
  const uniqIds = Array.from(new Set(invitedUserIds)).filter(
    (id) => Number.isFinite(id) && id > 0
  );
  return await post<GroupChatRoomResponse>(
    PATH.GROUP,
    { roomName, invitedUserIds: uniqIds },
    { signal }
  );
}

/** 채팅 메시지 내역 조회 (옵션: cursor/size 등) */
export async function getChatMessages(
  roomId: number,
  opts?: { cursor?: string | number; size?: number; signal?: AbortSignal }
): Promise<ChatMessageResponse[]> {
  if (!Number.isFinite(roomId) || roomId <= 0) {
    throw new Error("roomId는 양의 정수여야 합니다.");
  }
  const { cursor, size, signal } = opts ?? {};
  return await get<ChatMessageResponse[]>(
    PATH.MESSAGES(roomId),
    { cursor, size },
    { signal }
  );
}
