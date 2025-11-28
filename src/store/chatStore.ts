// src/store/chatStore.ts
import { create } from "zustand";
import type { ChatMessageResponse } from "../types/chat";

interface ChatState {
  // ✅ 방별로 메시지 저장
  messagesByRoom: Record<number, ChatMessageResponse[]>;
  setMessages: (roomId: number, msgs: ChatMessageResponse[]) => void;
  addMessage: (roomId: number, msg: ChatMessageResponse) => void;
  clearRoom: (roomId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByRoom: {},

  setMessages: (roomId, msgs) =>
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: msgs,
      },
    })),

  // ✅ 중복 방지 추가
  addMessage: (roomId, msg) =>
    set((state) => {
      const prev = state.messagesByRoom[roomId] ?? [];

      // ✅ 이미 존재하는 메시지인지 확인 (messageId 기준)
      const exists = prev.some((m) => m.messageId === msg.messageId);
      if (exists) {
        console.log(`[ChatStore] 중복 메시지 무시: ${msg.messageId}`);
        return state; // 상태 변경 없음
      }

      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: [...prev, msg],
        },
      };
    }),

  clearRoom: (roomId) =>
    set((state) => {
      const copy = { ...state.messagesByRoom };
      delete copy[roomId];
      return { messagesByRoom: copy };
    }),
}));
