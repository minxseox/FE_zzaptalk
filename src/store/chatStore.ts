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

function validRoomId(roomId: number) {
  return Number.isFinite(roomId) && roomId >= 0;
}

function sameMessageList(a: ChatMessageResponse[], b: ChatMessageResponse[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i].messageId) !== String(b[i].messageId)) return false;
  }
  return true;
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByRoom: {},

  setMessages: (roomId, msgs) =>
    set((state) => {
      if (!validRoomId(roomId)) {
        console.warn(
          "[ChatStore] setMessages ignored. invalid roomId:",
          roomId
        );
        return state;
      }

      const prev = state.messagesByRoom[roomId] ?? EMPTY;
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
      if (!validRoomId(roomId)) {
        console.warn("[ChatStore] addMessage ignored. invalid roomId:", roomId);
        return state;
      }

      const prev = state.messagesByRoom[roomId] ?? EMPTY;

      const msgKey = String((msg as any).messageId);
      const exists = prev.some((m) => String((m as any).messageId) === msgKey);
      if (exists) {
        // 중복이면 그대로
        return state;
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
      if (!validRoomId(roomId)) return state;
      if (!(roomId in state.messagesByRoom)) return state;

      const copy = { ...state.messagesByRoom };
      delete copy[roomId];
      return { messagesByRoom: copy };
    }),
}));
