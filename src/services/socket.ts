// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ChatMessageResponse, MessageType } from "../types/chat";
// ✅ 스토어 임포트
import { useSocketStore } from "../store/socketStore";

/**
 * 🌐 WebSocket Base URL
 * .env 예)
 *   EXPO_PUBLIC_WS_BASE=http://backend:8080/ws        # Docker 내부
 *   EXPO_PUBLIC_WS_BASE=https://api.zzaptalk.com/ws   # 배포 서버
 */
const WS_BASE = (
  process.env.EXPO_PUBLIC_WS_BASE || "http://backend:8080/ws"
).replace(/\/+$/, "");

// 내부 상태
let client: Client | null = null;
// 연결 상태를 Promise로 관리 (연결 완료 대기용)
let connectionPromise: Promise<void> | null = null;

/* ============================
 *  날짜 변환 유틸
 * ============================ */
function toIso(v?: any): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v; // 초 단위 or ms 단위
    return new Date(ms).toISOString();
  }
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === String(v)) {
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  return new Date(v).toISOString();
}

/* ============================
 *  데이터 정규화
 * ============================ */
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
 *  1. 소켓 연결 (전역 1회)
 *     - 구독은 별도 함수에서
 * ============================ */
export function connectStomp(token: string): Promise<void> {
  // 이미 연결되어 있으면 바로 resolve
  if (client?.connected) return Promise.resolve();
  // 이미 연결 시도 중이면 기존 Promise 재사용
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      // ✅ 백엔드가 알려준 엔드포인트: /ws
      webSocketFactory: () => new SockJS(WS_BASE || "/ws"),

      // ✅ JWT 헤더
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // 디버깅 옵션 (필요시 주석 해제)
      // debug: (msg) => console.log("[STOMP]", msg),

      onConnect: () => {
        console.log("✅ STOMP Connected! (Global)");
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

      onWebSocketError: (event) => {
        console.error("⚠️ WebSocket Error:", event);
        useSocketStore.getState().setConnected(false);
        connectionPromise = null;
      },
    });

    client.activate();
  });

  return connectionPromise;
}

/* ============================
 *  2. 채팅방 구독
 *     - 방 나갈 때 반환된 함수로 unsubscribe
 * ============================ */
export function subscribeRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  if (!client || !client.connected) {
    console.warn("⚠️ 소켓이 연결되지 않아 구독할 수 없습니다.");
    return () => {};
  }

  /**
   * ✅ 백엔드 최종 구독 경로
   *  - Subscribe Prefix : /topic
   *  - 최종 경로        : /topic/chat/room/{roomId}
   */
  const destination = `/topic/chat/room/${roomId}`;

  const subscription = client.subscribe(destination, (frame: IMessage) => {
    try {
      const body = JSON.parse(frame.body);
      onMessage(normalize(body));
    } catch (e) {
      console.error("❌ JSON Parse Error:", e);
    }
  });

  // 구독 해제 함수 반환 → useEffect cleanup에서 사용
  return () => subscription.unsubscribe();
}

/* ============================
 *  3. 연결 해제
 * ============================ */
export function disconnectStomp() {
  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
    useSocketStore.getState().setConnected(false);
    console.log("🔴 STOMP Disconnected");
  }
}

/* ============================
 *  4. 메시지 전송
 * ============================ */
export async function sendChatMessage(
  roomId: number,
  _senderId: number, // 현재 백엔드 DTO에는 불필요하지만, 기존 시그니처 유지
  content: string,
  type: MessageType = "TEXT"
) {
  if (!client || !client.connected) {
    throw new Error("STOMP not connected");
  }

  const payload = {
    roomId,
    content,
    type,
  };

  /**
   * ✅ 백엔드 최종 Publish 정보
   *  - Publish Prefix : /app
   *  - 최종 경로      : /app/chat/message
   */
  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
