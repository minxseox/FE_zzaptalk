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

  addMessage: (roomId, msg) =>
    set((state) => {
      const prev = state.messagesByRoom[roomId] ?? [];
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
