// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import type { ChatMessageResponse, MessageType } from "../types/chat";
import { useSocketStore } from "../store/socketStore";
import { Platform } from "react-native";

// ❌ SockJS 제거 유지

/**
 * 🌐 WebSocket URL 생성
 */
const getWsUrl = () => {
  // 1. .env에 정의된 값이 있으면 최우선 (ws://localhost:3000/ws 등)
  const envUrl = process.env.EXPO_PUBLIC_WS_BASE;
  if (envUrl) {
    return envUrl;
  }

  // 2. Web 환경: 브라우저 주소창 기반으로 자동 결정
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host; // localhost:3000
    // Nginx가 /ws 경로를 프록시한다고 가정
    return `${protocol}//${host}/ws`;
  }

  // 3. fallback (앱 등)
  return "ws://localhost:8080/ws";
};

// 주소 확정
const WS_URL = getWsUrl();
console.log(`[Socket] WS_URL: ${WS_URL}`);

// 내부 상태
let client: Client | null = null;
let connectionPromise: Promise<void> | null = null;

// ... (toIso, normalize 함수는 기존 코드 그대로 유지) ...
function toIso(v?: any): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === String(v)) {
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  return new Date(v).toISOString();
}

function normalize(body: any): ChatMessageResponse {
  const msgId =
    typeof body?.messageId === "number" || typeof body?.messageId === "string"
      ? body.messageId
      : typeof body?.id === "number" || typeof body?.id === "string"
      ? body.id
      : Date.now();

  const sent = body?.sentAt ?? body?.createdAt ?? body?.time ?? body?.timestamp;
  const created =
    body?.createdAt ?? body?.sentAt ?? body?.time ?? body?.timestamp;

  const typ: MessageType =
    (body?.type as MessageType) &&
    ["TEXT", "IMAGE", "ENTER", "LEAVE"].includes(body.type)
      ? (body.type as MessageType)
      : "TEXT";

  return {
    messageId: msgId,
    roomId: Number(body?.roomId ?? body?.room_id),
    senderId: Number(body?.senderId ?? body?.sender_id ?? body?.sender),
    senderName: String(
      body?.senderName ?? body?.senderNickname ?? body?.sender_name ?? ""
    ),
    content: String(body?.content ?? body?.message ?? ""),
    type: typ,
    sentAt: toIso(sent),
    createdAt: toIso(created),
  };
}

/* ============================
 * 1. 소켓 연결 (주소 적용 확인)
 * ============================ */
export function connectStomp(token: string): Promise<void> {
  if (client?.connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      // ✅ 위에서 결정한 WS_URL 사용
      brokerURL: WS_URL,

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log(`✅ STOMP Connected to ${WS_URL}`);
        useSocketStore.getState().setConnected(true);
        resolve();
      },

      onStompError: (frame) => {
        console.error("❌ STOMP Error:", frame.headers["message"]);
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;
        reject(new Error(frame.headers["message"]));
      },

      onWebSocketClose: () => {
        console.log("🔌 WebSocket Closed");
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;
      },
    });

    client.activate();
  });

  return connectionPromise;
}

// ... (subscribeRoom, disconnectStomp, sendChatMessage 등 나머지 함수는 기존 그대로 유지) ...
export function subscribeRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  if (!client || !client.connected) {
    console.warn("⚠️ 소켓이 연결되지 않아 구독할 수 없습니다.");
    return () => {};
  }
  const destination = `/topic/chat/room/${roomId}`;
  const subscription = client.subscribe(destination, (frame: IMessage) => {
    try {
      const body = JSON.parse(frame.body);
      onMessage(normalize(body));
    } catch (e) {
      console.error("❌ JSON Parse Error:", e);
    }
  });
  return () => subscription.unsubscribe();
}

export function disconnectStomp() {
  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
    useSocketStore.getState().setConnected(false);
    console.log("🔴 STOMP Disconnected");
  }
}

export async function sendChatMessage(
  roomId: number,
  _senderId: number,
  content: string,
  type: MessageType = "TEXT"
) {
  if (!client || !client.connected) {
    throw new Error("STOMP not connected");
  }
  const payload = { roomId, content, type };
  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
