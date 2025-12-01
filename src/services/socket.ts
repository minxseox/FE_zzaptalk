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
  WS_URL = `${protocol}//${window.location.host}/ws/websocket`;
  console.log("[Socket] WS_URL:", WS_URL);
  return WS_URL;
}

/* ==================================
 * 내부 상태
 * ================================== */
// ✅ (선택) HMR/dev에서 모듈이 재로딩돼도 중복 클라이언트 안 생기게 글로벌에 저장
const GLOBAL_KEY = "__ZZAPTALK_STOMP_SINGLETON__";
type GlobalStompState = {
  client: Client | null;
  connectionPromise: Promise<void> | null;
  currentToken: string | null;
};

const g = globalThis as any;
const globalState: GlobalStompState =
  g[GLOBAL_KEY] ??
  (g[GLOBAL_KEY] = {
    client: null,
    connectionPromise: null,
    currentToken: null,
  });

let client: Client | null = globalState.client;
let connectionPromise: Promise<void> | null = globalState.connectionPromise;
let currentToken: string | null = globalState.currentToken;

function syncGlobal() {
  globalState.client = client;
  globalState.connectionPromise = connectionPromise;
  globalState.currentToken = currentToken;
}

/* ==================================
 * ✅ 재연결 설정
 * ================================== */
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  delayMs: 3000,
  currentAttempt: 0,
  reconnectTimer: null as ReturnType<typeof setTimeout> | null,
};

function clearReconnectTimer() {
  if (RECONNECT_CONFIG.reconnectTimer) {
    clearTimeout(RECONNECT_CONFIG.reconnectTimer);
    RECONNECT_CONFIG.reconnectTimer = null;
  }
}

async function hardResetClient() {
  try {
    if (client) {
      // ✅ 이벤트 남아있는 activate 클라이언트를 확실히 종료
      await client.deactivate();
    }
  } catch {}
  client = null;
  connectionPromise = null;
  syncGlobal();
}

/* ==================================
 * 유틸: 날짜 → ISO 문자열
 * ================================== */
export function toIso(v?: any): string {
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

  // ✅ messageId가 없을 때 Date.now()만 쓰면 중복 가능 → 조금 더 유니크하게
  const fallbackId = Date.now() + Math.floor(Math.random() * 1000);

  return {
    messageId: body?.messageId ?? body?.id ?? fallbackId,
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
  if (RECONNECT_CONFIG.reconnectTimer) return;

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

    if (!currentToken) return;

    // ✅ 재연결 전에 클라이언트 정리(쌓임 방지)
    hardResetClient().finally(() => {
      connectStomp(currentToken!).catch((err) => {
        console.error("❌ [Socket] 재연결 실패:", err);
        scheduleReconnect();
      });
    });
  }, RECONNECT_CONFIG.delayMs);
}

/* ==================================
 * STOMP CONNECT
 * ================================== */
export function connectStomp(token: string): Promise<void> {
  currentToken = token;
  syncGlobal();

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

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // ✅ 남아있는 client가 있으면 정리
      if (client && !client.connected) {
        await hardResetClient();
      }

      client = new Client({
        brokerURL: url,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        reconnectDelay: 0, // ✅ 우리가 직접 재연결 관리

        onConnect: () => {
          console.log("✅ [Socket] STOMP Connected");
          useSocketStore.getState().setConnected(true);

          RECONNECT_CONFIG.currentAttempt = 0;
          clearReconnectTimer();

          // ✅ 연결 성공하면 promise 정리
          connectionPromise = null;
          syncGlobal();

          resolve();
        },

        onStompError: (frame) => {
          const msg = frame.headers["message"] || "";
          console.error("❌ [Socket] STOMP Error:", msg);

          useSocketStore.getState().setConnected(false);

          connectionPromise = null;
          syncGlobal();

          if (!msg.includes("401") && !msg.includes("Unauthorized")) {
            scheduleReconnect();
          }

          reject(new Error(msg));
        },

        onWebSocketClose: (evt) => {
          console.log("🔌 [Socket] WebSocket Closed", evt?.code, evt?.reason);
          useSocketStore.getState().setConnected(false);

          connectionPromise = null;
          syncGlobal();

          if (evt?.code !== 1000) {
            scheduleReconnect();
          }
        },

        onWebSocketError: (evt) => {
          console.error("❌ [Socket] WebSocket Error:", evt);
          useSocketStore.getState().setConnected(false);

          // ✅ 에러났는데 close가 안 올 수도 있으니 promise 정리
          connectionPromise = null;
          syncGlobal();

          scheduleReconnect();
        },
      });

      syncGlobal();
      client.activate();
    } catch (e) {
      connectionPromise = null;
      syncGlobal();
      reject(e);
    }
  });

  syncGlobal();
  return connectionPromise;
}

/* ==================================
 * ✅ 토큰 업데이트 (재연결)
 * ================================== */
export async function updateSocketToken(newToken: string): Promise<void> {
  console.log("🔄 [Socket] 토큰 업데이트 및 재연결");
  currentToken = newToken;
  syncGlobal();

  await hardResetClient();
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
    try {
      console.log(`📡 [Socket] 구독 해제: ${destination}`);
      subscription.unsubscribe();
    } catch (e) {
      console.warn("⚠️ [Socket] unsubscribe 실패(무시):", e);
    }
  };
}

/* ==================================
 * STOMP DISCONNECT
 * ================================== */
export async function disconnectStomp() {
  console.log("🔴 [Socket] 연결 종료 요청");

  clearReconnectTimer();
  RECONNECT_CONFIG.currentAttempt = 0;

  currentToken = null;
  useSocketStore.getState().setConnected(false);

  await hardResetClient();
  console.log("🔴 [Socket] STOMP Disconnected");
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

  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("📤 [Socket] 메시지 전송:", payload);
}

/* ==================================
 * ✅ 연결 상태 확인
 * ================================== */
export function isSocketConnected(): boolean {
  return client?.connected ?? false;
}
