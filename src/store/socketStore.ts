// src/store/socketStore.ts
import { create } from "zustand";

interface SocketState {
  isConnected: boolean;
  setConnected: (status: boolean) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  setConnected: (status) => {
    // ✅ 같은 값이면 업데이트 안 해서 불필요한 렌더 방지
    if (get().isConnected === status) return;
    set({ isConnected: status });
  },
}));
