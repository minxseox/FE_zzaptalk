// src/store/chatListStore.ts
import { create } from "zustand";
import type { ChatRoomUserListItem } from "../types/chat";

// 💡 API에서 내려오는 기본 타입에 lastMessage/lastMessageAt/unreadCount를
//   클라이언트에서 추가로 얹어서 써도 되도록 확장
type RoomItem = ChatRoomUserListItem & {
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

interface ChatListState {
  rooms: RoomItem[];
  setRooms: (rooms: ChatRoomUserListItem[]) => void;

  // 메시지 갱신 + 안 읽은 개수 처리 (isRead: 이 메시지를 읽은 상태로 둘지 여부)
  updateRoomLastMessage: (
    roomId: number,
    message: string,
    time: string,
    isRead?: boolean
  ) => void;

  // 뱃지 초기화 함수 (채팅방 들어갈 때 호출)
  resetUnreadCount: (roomId: number) => void;
}

export const useChatListStore = create<ChatListState>((set) => ({
  rooms: [],

  // 📌 목록 초기화 (API에서 받은 원본 리스트를 그대로 세팅)
  setRooms: (rooms) => set({ rooms: rooms as RoomItem[] }),

  // ✅ 실시간 갱신 로직 (마지막 메시지 + 시간 + 뱃지 + 정렬)
  updateRoomLastMessage: (roomId, message, time, isRead = false) =>
    set((state) => {
      const idx = state.rooms.findIndex((r) => r.roomId === roomId);

      // 목록에 없는 방이면 그대로 반환
      if (idx === -1) return { rooms: state.rooms };

      const targetRoom: RoomItem = { ...state.rooms[idx] };

      // 1. 마지막 메시지 내용 & 시간 업데이트
      targetRoom.lastMessage = message;
      targetRoom.lastMessageAt = time;

      // 2. 뱃지 카운트 로직
      if (!isRead) {
        // 읽지 않은 상태라면 기존 카운트 + 1
        const current = targetRoom.unreadCount ?? 0;
        targetRoom.unreadCount = current + 1;
      } else {
        // 내가 보낸 메시지이거나, 방 안에서 바로 읽은 메시지이면 0으로
        targetRoom.unreadCount = 0;
      }

      // 3. 방을 맨 위로 이동 (카톡처럼 정렬)
      const otherRooms = state.rooms.filter((r) => r.roomId !== roomId);

      return { rooms: [targetRoom, ...otherRooms] };
    }),

  // ✅ 뱃지 초기화 (채팅방 들어갈 때 사용)
  resetUnreadCount: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.roomId === roomId ? { ...r, unreadCount: 0 } : r
      ),
    })),
}));
