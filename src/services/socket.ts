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
let currentToken: string | null = null;

// ✅ 재연결 설정
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  delayMs: 3000,
  currentAttempt: 0,
  reconnectTimer: null as ReturnType<typeof setTimeout> | null,
};

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
 * ✅ 재연결 로직
 * ================================== */
function scheduleReconnect() {
  // 이미 재연결 타이머가 있으면 무시
  if (RECONNECT_CONFIG.reconnectTimer) return;

  // 최대 시도 횟수 초과
  if (RECONNECT_CONFIG.currentAttempt >= RECONNECT_CONFIG.maxAttempts) {
    console.error("❌ [Socket] 재연결 최대 시도 횟수 초과");
    useSocketStore.getState().setConnected(false);
    return;
  }

  RECONNECT_CONFIG.currentAttempt++;
  console.log(
    `🔄 [Socket] 재연결 시도 ${RECONNECT_CONFIG.currentAttempt}/${RECONNECT_CONFIG.maxAttempts} (${RECONNECT_CONFIG.delayMs}ms 후)`
  );

  RECONNECT_CONFIG.reconnectTimer = setTimeout(() => {
    RECONNECT_CONFIG.reconnectTimer = null;

    if (currentToken) {
      connectStomp(currentToken).catch((err) => {
        console.error("❌ [Socket] 재연결 실패:", err);
        // 실패 시 다시 재연결 시도
        scheduleReconnect();
      });
    }
  }, RECONNECT_CONFIG.delayMs);
}

/* ==================================
 * STOMP CONNECT
 * ================================== */
export function connectStomp(token: string): Promise<void> {
  // ✅ 토큰 저장 (재연결 시 사용)
  currentToken = token;

  if (client?.connected) {
    console.log("✅ [Socket] 이미 연결됨");
    return Promise.resolve();
  }

  if (connectionPromise) {
    console.log("⏳ [Socket] 연결 중...");
    return connectionPromise;
  }

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
        console.log("✅ [Socket] STOMP Connected");
        useSocketStore.getState().setConnected(true);

        // ✅ 재연결 성공 시 카운터 리셋
        RECONNECT_CONFIG.currentAttempt = 0;
        if (RECONNECT_CONFIG.reconnectTimer) {
          clearTimeout(RECONNECT_CONFIG.reconnectTimer);
          RECONNECT_CONFIG.reconnectTimer = null;
        }

        resolve();
      },

      onStompError: (frame) => {
        console.error("❌ [Socket] STOMP Error:", frame.headers["message"]);
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;

        // ✅ 401 에러가 아니면 재연결 시도
        const errorMsg = frame.headers["message"] || "";
        if (!errorMsg.includes("401") && !errorMsg.includes("Unauthorized")) {
          scheduleReconnect();
        }

        reject(new Error(frame.headers["message"]));
      },

      onWebSocketClose: (evt) => {
        console.log("🔌 [Socket] WebSocket Closed", evt?.code, evt?.reason);
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;

        // ✅ 정상 종료(1000)가 아니면 재연결 시도
        if (evt?.code !== 1000) {
          scheduleReconnect();
        }
      },

      onWebSocketError: (evt) => {
        console.error("❌ [Socket] WebSocket Error:", evt);
        useSocketStore.getState().setConnected(false);
      },
    });

    client.activate();
  });

  return connectionPromise;
}

/* ==================================
 * ✅ 토큰 업데이트 (재연결)
 * ================================== */
export async function updateSocketToken(newToken: string): Promise<void> {
  console.log("🔄 [Socket] 토큰 업데이트 및 재연결");

  // 기존 연결 종료
  if (client?.connected) {
    client.deactivate();
  }

  client = null;
  connectionPromise = null;
  currentToken = newToken;

  // 새 토큰으로 재연결
  return connectStomp(newToken);
}

/* ==================================
 * 채팅방 구독
 * ================================== */
export function subscribeRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  if (!client || !client.connected) {
    console.warn("⚠️ [Socket] STOMP 연결 안됨");
    return () => {};
  }

  const destination = `/topic/chat/room/${roomId}`;
  console.log(`📡 [Socket] 구독 시작: ${destination}`);

  const subscription = client.subscribe(destination, (frame: IMessage) => {
    try {
      const body = JSON.parse(frame.body);
      const normalized = normalize(body);
      console.log(`📩 [Socket] 메시지 수신:`, normalized);
      onMessage(normalized);
    } catch (e) {
      console.error("❌ [Socket] JSON Parse Error:", e);
    }
  });

  return () => {
    console.log(`📡 [Socket] 구독 해제: ${destination}`);
    subscription.unsubscribe();
  };
}

/* ==================================
 * STOMP DISCONNECT
 * ================================== */
export function disconnectStomp() {
  console.log("🔴 [Socket] 연결 종료 요청");

  // ✅ 재연결 타이머 정리
  if (RECONNECT_CONFIG.reconnectTimer) {
    clearTimeout(RECONNECT_CONFIG.reconnectTimer);
    RECONNECT_CONFIG.reconnectTimer = null;
  }
  RECONNECT_CONFIG.currentAttempt = 0;

  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
    currentToken = null;
    useSocketStore.getState().setConnected(false);
    console.log("🔴 [Socket] STOMP Disconnected");
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
  if (!client || !client.connected) {
    throw new Error("STOMP 연결이 필요합니다");
  }

  const payload = { roomId, content, type };

  try {
    client.publish({
      destination: "/app/chat/message",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("📤 [Socket] 메시지 전송:", payload);
  } catch (err) {
    console.error("❌ [Socket] 메시지 전송 실패:", err);
    throw err;
  }
}

/* ==================================
 * ✅ 연결 상태 확인
 * ================================== */
export function isSocketConnected(): boolean {
  return client?.connected ?? false;
}
