// src/store/chatListStore.ts
import { create } from "zustand";
import type { ChatRoomUserListItem } from "../types/chat";

export type ChatRoomItemWithMeta = ChatRoomUserListItem & {
  unreadCount: number;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
};

interface ChatListState {
  rooms: ChatRoomItemWithMeta[];
  setRoomsFromServer: (rooms: ChatRoomUserListItem[]) => void;
  updateRoomLastMessage: (
    roomId: number,
    message: string,
    time: string,
    isRead?: boolean
  ) => void;
  resetUnreadCount: (roomId: number) => void;
}

export const useChatListStore = create<ChatListState>((set) => ({
  rooms: [],

  setRoomsFromServer: (serverRooms) =>
    set((state) => {
      const prevMap = new Map(state.rooms.map((r) => [r.roomId, r] as const));

      const merged: ChatRoomItemWithMeta[] = serverRooms.map((r) => {
        const prev = prevMap.get(r.roomId);

        if (!prev) {
          return {
            ...r,
            unreadCount: (r as any).unreadCount ?? 0,
            lastMessage: (r as any).lastMessage ?? null,
            lastMessageTime: (r as any).lastMessageTime ?? null,
          };
        }

        return {
          ...r,
          unreadCount: prev.unreadCount,
          lastMessage: prev.lastMessage ?? (r as any).lastMessage ?? null,
          lastMessageTime:
            prev.lastMessageTime ?? (r as any).lastMessageTime ?? null,
        };
      });

      merged.sort((a, b) => {
        const tA = a.lastMessageTime ? Date.parse(a.lastMessageTime) : 0;
        const tB = b.lastMessageTime ? Date.parse(b.lastMessageTime) : 0;
        const timeA = Number.isNaN(tA) ? 0 : tA;
        const timeB = Number.isNaN(tB) ? 0 : tB;
        return timeB - timeA;
      });

      return { rooms: merged };
    }),

  updateRoomLastMessage: (roomId, message, time, isRead = false) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r.roomId === roomId);
      if (index === -1) {
        console.warn(`[ChatListStore] Room ${roomId} not found`);
        return state; // ✅ {} 말고 state 반환
      }

      const target = state.rooms[index];
      const nextUnread = isRead ? 0 : (target.unreadCount || 0) + 1;

      // ✅ 값이 동일하면 업데이트 스킵
      if (
        target.lastMessage === message &&
        target.lastMessageTime === time &&
        target.unreadCount === nextUnread
      ) {
        return state;
      }

      const updated: ChatRoomItemWithMeta = {
        ...target,
        lastMessage: message,
        lastMessageTime: time,
        unreadCount: nextUnread,
      };

      const others = state.rooms.filter((r) => r.roomId !== roomId);
      return { rooms: [updated, ...others] };
    }),

  resetUnreadCount: (roomId) =>
    set((state) => {
      let changed = false;
      const next = state.rooms.map((r) => {
        if (r.roomId !== roomId) return r;
        if (r.unreadCount === 0) return r;
        changed = true;
        return { ...r, unreadCount: 0 };
      });
      return changed ? { rooms: next } : state;
    }),
}));
