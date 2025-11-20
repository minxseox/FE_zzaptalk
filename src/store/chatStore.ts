// src/store/chatStore.ts
import { create } from "zustand";
// 👇 여기가 핵심입니다. 임의의 Message 타입 대신 실제 타입을 가져오세요.
import { ChatMessageResponse } from "../types/chat";

interface ChatState {
  // messages 배열이 'ChatMessageResponse' 타입을 따르도록 수정
  messages: ChatMessageResponse[];
  addMessage: (msg: ChatMessageResponse) => void;
  setMessages: (msgs: ChatMessageResponse[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  // 새 메시지 추가
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  // 전체 메시지 교체 (초기 로딩 등)
  setMessages: (msgs) => set({ messages: msgs }),
}));
