// src/store/socketStore.ts
import { create } from "zustand";

interface SocketState {
  isConnected: boolean; // 연결 상태 (true/false)
  setConnected: (status: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  setConnected: (status) => set({ isConnected: status }),
}));
