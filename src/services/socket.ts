// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import type { ChatMessageResponse, MessageType } from "../types/chat";
import { useSocketStore } from "../store/socketStore";
import { Platform } from "react-native";

/**
 * 🌐 WebSocket URL 생성 (최종 버전)
 *
 * - Web(브라우저):
 *    👉 항상 현재 도메인 기준 /ws 사용
 *    👉 ws(s)://zzaptalk.com/ws
 *    👉 NGINX 가 /ws → zzaptalk-backend:8080/ws 로 프록시
 *
 * - Native(App):
 *    👉 EXPO_PUBLIC_WS_BASE 있으면 우선 사용
 *    👉 없으면 ws://10.0.2.2:8080/ws 기본값
 */
const getWsUrl = () => {
  // ✅ 1. Web 환경: 환경변수와 관계 없이 /ws 강제
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host; // ex) zzaptalk.com or localhost:3000
    return `${protocol}//${host}/ws`;
  }

  // ✅ 2. Native 환경: .env 값이 있으면 사용
  const envUrl = process.env.EXPO_PUBLIC_WS_BASE;
  if (envUrl) {
    return envUrl;
  }

  // ✅ 3. Native 기본값 (로컬 개발용)
  return "ws://10.0.2.2:8080/ws";
};

// 주소 확정
const WS_URL = getWsUrl();
console.log(`[Socket] WS_URL: ${WS_URL}`);

// 내부 상태
let client: Client | null = null;
let connectionPromise: Promise<void> | null = null;

/* ===============================
 * 유틸: 날짜 → ISO 문자열
 * =============================== */
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

/* ===============================
 * 서버 → 클라이언트 메세지 정규화
 * =============================== */
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

/* ===============================
 * 1. STOMP 연결
 * =============================== */
export function connectStomp(token: string): Promise<void> {
  if (client?.connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
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

/* ===============================
 * 2. 채팅방 구독
 * =============================== */
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

/* ===============================
 * 3. 연결 해제
 * =============================== */
export function disconnectStomp() {
  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
    useSocketStore.getState().setConnected(false);
    console.log("🔴 STOMP Disconnected");
  }
}

/* ===============================
 * 4. 메시지 전송
 * =============================== */
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
