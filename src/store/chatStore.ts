// src/store/chatStore.ts
import { create } from "zustand";
import type { ChatMessageResponse } from "../types/chat";

interface ChatState {
  messagesByRoom: Record<number, ChatMessageResponse[]>;
  setMessages: (roomId: number, msgs: ChatMessageResponse[]) => void;
  addMessage: (roomId: number, msg: ChatMessageResponse) => void;
  clearRoom: (roomId: number) => void;
}

const EMPTY: ChatMessageResponse[] = [];

function sameMessageList(a: ChatMessageResponse[], b: ChatMessageResponse[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].messageId !== b[i].messageId) return false;
  }
  return true;
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByRoom: {},

  setMessages: (roomId, msgs) =>
    set((state) => {
      const prev = state.messagesByRoom[roomId] ?? EMPTY;

      // ✅ 같은 리스트면 상태 업데이트 스킵 (렌더/루프 방지에 도움)
      if (sameMessageList(prev, msgs)) return state;

      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: msgs,
        },
      };
    }),

  addMessage: (roomId, msg) =>
    set((state) => {
      const prev = state.messagesByRoom[roomId] ?? EMPTY;

      // ✅ messageId 기준 중복 방지
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
      if (!(roomId in state.messagesByRoom)) return state;

      const copy = { ...state.messagesByRoom };
      delete copy[roomId];
      return { messagesByRoom: copy };
    }),
}));
