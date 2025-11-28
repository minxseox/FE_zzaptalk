// src/store/chatListStore.ts
import { create } from "zustand";
import type { ChatRoomUserListItem } from "../types/chat";

/** 서버에서 온 방 정보 + 프론트에서 관리하는 메타 정보 */
export type ChatRoomItemWithMeta = ChatRoomUserListItem & {
  /** 안 읽은 개수 */
  unreadCount: number;
  /** 마지막 메시지 내용 (서버가 null 줄 수 있어서 null 포함) */
  lastMessage?: string | null;
  /** 마지막 메시지 시간 (ISO 문자열, 없을 수도 있음) */
  lastMessageTime?: string | null;
};

interface ChatListState {
  rooms: ChatRoomItemWithMeta[];

  /** 서버에서 새로 받은 방 목록으로 갱신(기존 메타랑 merge) */
  setRoomsFromServer: (rooms: ChatRoomUserListItem[]) => void;

  /** 실시간 / 전송 시 마지막 메시지 + 읽음/안읽음 업데이트 */
  updateRoomLastMessage: (
    roomId: number,
    message: string,
    time: string,
    isRead?: boolean
  ) => void;

  /** 특정 방의 뱃지 0으로 리셋 */
  resetUnreadCount: (roomId: number) => void;
}

export const useChatListStore = create<ChatListState>((set) => ({
  rooms: [],

  // ✅ 서버에서 가져온 목록 + 기존 메타 정리해서 머지
  setRoomsFromServer: (serverRooms) =>
    set((state) => {
      // 기존 방들을 roomId 기준으로 Map에 저장해두고
      const prevMap = new Map(state.rooms.map((r) => [r.roomId, r] as const));

      // 서버 목록을 기준으로 새 배열 생성
      const merged: ChatRoomItemWithMeta[] = serverRooms.map((r) => {
        const prev = prevMap.get(r.roomId);

        // 처음 보는 방이면 서버 값 + 기본 메타
        if (!prev) {
          return {
            ...r,
            unreadCount: (r as any).unreadCount ?? 0,
            // 서버에서 lastMessage / lastMessageTime 안 줄 수도 있으니까 안전하게 처리
            lastMessage: (r as any).lastMessage ?? null,
            lastMessageTime: (r as any).lastMessageTime ?? null,
          };
        }

        // 기존에 있던 방이면 메타 유지 + 서버 값 덮어쓰기
        return {
          ...r,
          unreadCount: prev.unreadCount,
          lastMessage: prev.lastMessage ?? (r as any).lastMessage ?? null,
          lastMessageTime:
            prev.lastMessageTime ?? (r as any).lastMessageTime ?? null,
        };
      });

      // (선택) 마지막 메시지 시간 기준으로 정렬 – 최신 대화가 위로 오도록
      merged.sort((a, b) => {
        const tA = a.lastMessageTime ? Date.parse(a.lastMessageTime) : 0;
        const tB = b.lastMessageTime ? Date.parse(b.lastMessageTime) : 0;
        return tB - tA;
      });

      return { rooms: merged };
    }),

  // ✅ 실시간/전송 시 마지막 메시지 & 뱃지 갱신
  updateRoomLastMessage: (roomId, message, time, isRead = false) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r.roomId === roomId);
      if (index === -1) return { rooms: state.rooms };

      const target = state.rooms[index];

      const updated: ChatRoomItemWithMeta = {
        ...target,
        lastMessage: message,
        lastMessageTime: time,
        unreadCount: isRead ? 0 : (target.unreadCount || 0) + 1,
      };

      // 최근 대화한 방을 맨 위로 올리기
      const others = state.rooms.filter((r) => r.roomId !== roomId);
      return { rooms: [updated, ...others] };
    }),

  // ✅ 방 들어갈 때 뱃지만 0으로
  resetUnreadCount: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.roomId === roomId ? { ...r, unreadCount: 0 } : r
      ),
    })),
}));
