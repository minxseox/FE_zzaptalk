// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import type { ChatMessageResponse, MessageType } from "../types/chat";
import { useSocketStore } from "../store/socketStore";

/* ==================================
 * WebSocket URL 계산 (브라우저 전용)
 * - 정적 빌드/SSR(Node) 에서는 window 없음 → 빈 문자열 반환
 * ================================== */
let WS_URL: string | null = null;

function resolveWsUrl(): string {
  if (WS_URL !== null) return WS_URL;

  if (typeof window === "undefined") {
    console.warn("[Socket] window is undefined (SSR/Node), skip WS URL.");
    WS_URL = "";
    return WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  WS_URL = `${protocol}//${window.location.host}/ws`;
  console.log(`[Socket] WS_URL: ${WS_URL}`);
  return WS_URL;
}

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

  const url = resolveWsUrl();

  // SSR/빌드 환경에서는 그냥 스킵
  if (!url) {
    console.warn("[Socket] No WS URL (probably SSR), skip connectStomp.");
    return Promise.resolve();
  }

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      brokerURL: url,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log(`✅ STOMP Connected to ${url}`);
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
