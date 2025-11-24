import { create } from "zustand";
import type { ChatRoomUserListItem } from "../types/chat";

interface ChatListState {
  rooms: ChatRoomUserListItem[];
  setRooms: (rooms: ChatRoomUserListItem[]) => void;

  // 메시지 갱신 + 안 읽은 개수 처리 (isRead 추가)
  updateRoomLastMessage: (
    roomId: number,
    message: string,
    time: string,
    isRead?: boolean
  ) => void;

  // 뱃지 초기화 함수
  resetUnreadCount: (roomId: number) => void;
}

export const useChatListStore = create<ChatListState>((set) => ({
  rooms: [],

  // 목록 초기화
  setRooms: (rooms) => set({ rooms }),

  // ✅ 실시간 갱신 로직 (뱃지 카운트 로직 추가됨)
  updateRoomLastMessage: (roomId, message, time, isRead = false) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r.roomId === roomId);

      // 목록에 없는 방이면 갱신 안 함
      if (index === -1) return { rooms: state.rooms };

      const targetRoom = { ...state.rooms[index] };

      // 1. 메시지 내용 & 시간 업데이트
      (targetRoom as any).lastMessage = message;
      (targetRoom as any).lastMessageAt = time;

      // 2. 🔴 뱃지 카운트 로직
      if (!isRead) {
        // 읽지 않은 상태라면 기존 카운트 + 1
        const currentCount = (targetRoom as any).unreadCount || 0;
        (targetRoom as any).unreadCount = currentCount + 1;
      } else {
        // 읽은 상태(내가 보냈거나, 방에 들어와 있음)라면 0으로 초기화
        (targetRoom as any).unreadCount = 0;
      }

      // 3. 방을 맨 위로 이동
      const otherRooms = state.rooms.filter((r) => r.roomId !== roomId);

      return { rooms: [targetRoom, ...otherRooms] };
    }),

  // ✅ 뱃지 초기화 구현 (방 들어갈 때 사용)
  resetUnreadCount: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.roomId === roomId ? { ...r, unreadCount: 0 } : r
      ),
    })),
}));
