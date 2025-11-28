// src/services/socket.ts
import { Client, IMessage } from "@stomp/stompjs";
import type { ChatMessageResponse, MessageType } from "../types/chat";
import { useSocketStore } from "../store/socketStore";
import { Platform } from "react-native";

// ❌ SockJS는 제거합니다.
// import SockJS from "sockjs-client";

/**
 * 🌐 WebSocket URL 생성
 * http -> ws, https -> wss 로 자동 변환
 */
const getWsUrl = () => {
  // 1. 환경변수 우선 사용
  const envUrl = process.env.EXPO_PUBLIC_WS_BASE;
  if (envUrl) {
    return envUrl.replace(/^http/, "ws");
  }

  // 2. 웹 환경 (브라우저 주소 기반)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // Nginx 설정에 따라 /ws 경로가 맞는지 확인 필요 (보통 /ws)
    return `${protocol}//${host}/ws`;
  }

  // 3. 앱 환경 (기본 배포 주소)
  return "wss://api.zzaptalk.com/ws";
};

const WS_URL = getWsUrl();

// 내부 상태
let client: Client | null = null;
let connectionPromise: Promise<void> | null = null;

/* ============================
 * 날짜 변환 유틸 (유지)
 * ============================ */
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

/* ============================
 * 데이터 정규화 (유지)
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
 * 1. 소켓 연결 (수정됨)
 * ============================ */
export function connectStomp(token: string): Promise<void> {
  if (client?.connected) return Promise.resolve();
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    client = new Client({
      // ✅ [핵심] SockJS Factory 대신 brokerURL 사용
      brokerURL: WS_URL,

      // ✅ 연결 헤더
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // ✅ 타임아웃 방지 (Heartbeat)
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      // debug: (msg) => console.log("[STOMP]", msg),

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

/* ============================
 * 2. 채팅방 구독 (유지)
 * ============================ */
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

/* ============================
 * 3. 연결 해제 (유지)
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
 * 4. 메시지 전송 (유지)
 * ============================ */
export async function sendChatMessage(
  roomId: number,
  _senderId: number,
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

  client.publish({
    destination: "/app/chat/message",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
