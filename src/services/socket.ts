// src/services/socket.ts
import { Client, IMessage, StompHeaders } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ChatMessageResponse, MessageType } from "../types/chat";

// .env 예) EXPO_PUBLIC_WS_BASE=https://api.zzaptalk.com/ws-stomp
const WS_BASE = (
  process.env.EXPO_PUBLIC_WS_BASE || "https://api.zzaptalk.com/ws"
).replace(/\/+$/, "");

// 내부 상태
let client: Client | null = null;
// 연결 상태를 Promise로 관리 (연결 완료 대기용)
let connectionPromise: Promise<void> | null = null;

// 날짜 변환 유틸
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

// 데이터 정규화
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

// ✅ 1. 소켓 연결 (구독 X, 연결만 O)
export function connectStomp(token: string): Promise<void> {
  // 이미 연결되어 있거나 연결 중이면 기존 Promise 반환
  if (client?.connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE || "/ws-stomp"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      // 디버그 보고 싶으면 아래 주석 해제
      // debug: (str) => console.log("[STOMP Debug]", str),

      onConnect: () => {
        console.log("✅ STOMP Connected!");
        resolve();
      },
      onStompError: (frame) => {
        console.error("❌ STOMP Error", frame.headers["message"]);
        reject(new Error(frame.headers["message"]));
        connectionPromise = null; // 에러 나면 초기화
      },
      onWebSocketClose: () => {
        console.log("🔌 WebSocket Closed");
        connectionPromise = null; // 닫히면 초기화
      },
    });

    client.activate();
  });

  return connectionPromise;
}

// ✅ 2. 채팅방 구독 (이게 분리되어야 함!)
export function subscribeRoom(
  roomId: number,
  onMessage: (msg: ChatMessageResponse) => void
) {
  if (!client || !client.connected) {
    console.warn("⚠️ 소켓이 연결되지 않아 구독할 수 없습니다.");
    return () => {};
  }

  // 백엔드가 알려준 구독 경로: /topic/chatlist.{roomId}
  const subscription = client.subscribe(
    `/topic/chatlist.${roomId}`,
    (frame: IMessage) => {
      try {
        const body = JSON.parse(frame.body);
        onMessage(normalize(body));
      } catch (e) {
        console.error("Json Parse Error:", e);
      }
    }
  );

  // 구독 취소 함수 반환 (useEffect의 return에서 사용됨)
  return () => subscription.unsubscribe();
}

// ✅ 3. 연결 해제
export function disconnectStomp() {
  if (client) {
    client.deactivate();
    client = null;
    connectionPromise = null;
  }
}

// ✅ 4. 메시지 전송
export async function sendChatMessage(
  roomId: number,
  senderId: number, // 백엔드 DTO엔 없지만 호환성 위해 받음
  content: string,
  type: MessageType = "TEXT"
) {
  if (!client || !client.connected) throw new Error("STOMP not connected");

  const payload = {
    roomId,
    content,
    type,
  };

  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
