// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import type { ChatMessageResponse, MessageType } from "../types/chat";
import { useSocketStore } from "../store/socketStore";

/* ==================================
 * WebSocket URL 계산
 * ================================== */
let WS_URL: string | null = null;

function resolveWsUrl(): string {
  if (WS_URL !== null) return WS_URL;

  if (typeof window === "undefined") {
    console.warn("[Socket] window undefined → SSR 환경. WS 생략");
    WS_URL = "";
    return WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  WS_URL = `${protocol}//${window.location.host}/ws`;
  console.log("[Socket] WS_URL:", WS_URL);
  return WS_URL;
}

// 내부 상태
let client: Client | null = null;
let connectionPromise: Promise<void> | null = null;

/* ==================================
 * 유틸: 날짜 → ISO 문자열
 * ================================== */
export function toIso(v?: any): string {
  if (!v) return new Date().toISOString();

  // Date 객체 그대로
  if (v instanceof Date) return v.toISOString();

  // 숫자인 경우
  if (typeof v === "number") {
    // 초 단위 → 밀리초 변환
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }

  // 문자열인 경우
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === String(v)) {
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }

  return new Date(v).toISOString();
}

/* ==================================
 * 서버 → 클라이언트 메세지 정규화
 * ================================== */
function normalize(body: any): ChatMessageResponse {
  const rawCreated =
    body?.createdAt ??
    body?.sentAt ??
    body?.created_at ??
    body?.sent_at ??
    body?.timestamp ??
    body?.time ??
    null;

  const rawSent =
    body?.sentAt ?? body?.createdAt ?? body?.timestamp ?? body?.time ?? null;

  const typ: MessageType = ["TEXT", "IMAGE", "ENTER", "LEAVE"].includes(
    body?.type
  )
    ? body.type
    : "TEXT";

  return {
    messageId: body?.messageId ?? body?.id ?? Date.now(),

    roomId: Number(body?.roomId ?? body?.room_id),

    senderId: Number(body?.senderId ?? body?.sender_id ?? body?.sender),

    senderName: String(
      body?.senderName ?? body?.senderNickname ?? body?.sender_name ?? ""
    ),

    content: String(body?.content ?? body?.message ?? ""),

    type: typ,

    createdAt: toIso(rawCreated),
    sentAt: toIso(rawSent),
  };
}

/* ==================================
 * STOMP CONNECT
 * ================================== */
export function connectStomp(token: string): Promise<void> {
  if (client?.connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  const url = resolveWsUrl();
  if (!url) return Promise.resolve();

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      brokerURL: url,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log("✅ STOMP Connected");
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
        console.log("🔌 Socket Closed");
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;
      },
    });

    client.activate();
  });

  return connectionPromise;
}

/* ==================================
 * 채팅방 구독
 * ================================== */
export function subscribeRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  if (!client || !client.connected) {
    console.warn("⚠️ STOMP 연결 안됨");
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

/* ==================================
 * STOMP DISCONNECT
 * ================================== */
export function disconnectStomp() {
  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
    useSocketStore.getState().setConnected(false);
    console.log("🔴 STOMP Disconnected");
  }
}

/* ==================================
 * 메시지 전송
 * ================================== */
export async function sendChatMessage(
  roomId: number,
  _senderId: number,
  content: string,
  type: MessageType = "TEXT"
) {
  if (!client || !client.connected) throw new Error("STOMP not connected");

  const payload = { roomId, content, type };

  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
