import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Text,
  TextInput,
  View,
  Modal,
  Image,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";

import {
  Redirect,
  type Href,
  useLocalSearchParams,
  useRouter,
  useRootNavigationState,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  chatRoomStyles,
  chatRoomModalStyles,
} from "../../src/styles/chat/ChatRoom.module";

import ChatHeader from "../../src/components/chat/ChatHeader";
import MessageBubble from "../../src/components/chat/MessageBubble";
import MessageInput from "../../src/components/chat/MessageInput";

import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";

import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

import { fetchFriendProfile } from "../../src/services/profile";

/** ✅ socket 모듈 로드 */
let sendChatMessageRaw: any;
let subscribeRoom: any;
try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch (e) {
  console.warn("[chat] failed to load socket module:", e);
}

function toNumberSafe(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIsoSafe(v: any): string {
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

function formatDateSafe(isoString: string): string {
  if (typeof window === "undefined") return isoString;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatTimeSafe(isoString: string): string {
  if (typeof window === "undefined") return "";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function normalizeRestMessage(m: ChatMessageResponse): ChatMessageResponse {
  const senderIdNum = toNumberSafe((m as any).senderId) ?? 0;
  const roomIdNum = toNumberSafe((m as any).roomId) ?? (m as any).roomId ?? 0;
  const messageIdNum =
    toNumberSafe((m as any).messageId) ??
    (m as any).messageId ??
    Date.now() + Math.floor(Math.random() * 1000);

  return {
    ...m,
    messageId: messageIdNum as any,
    roomId: roomIdNum,
    senderId: senderIdNum,
    createdAt: toIsoSafe((m as any).createdAt),
    sentAt: toIsoSafe((m as any).sentAt ?? (m as any).createdAt),
  };
}

function mergeDedupeSort(
  a: ChatMessageResponse[],
  b: ChatMessageResponse[]
): ChatMessageResponse[] {
  const map = new Map<string, ChatMessageResponse>();
  for (const m of [...a, ...b]) {
    map.set(String((m as any).messageId), m);
  }
  return Array.from(map.values()).sort(
    (x, y) =>
      Date.parse(x.sentAt || x.createdAt) - Date.parse(y.sentAt || y.createdAt)
  );
}

function sameDay(aIso?: string | null, bIso?: string | null) {
  if (!aIso || !bIso) return false;
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function getMyId(): Promise<number | null> {
  try {
    const saved = await loadTokenWithExpiry();
    if (!saved?.token) return null;
    const p = parseJwt(saved.token);
    const sub = p?.sub;
    return sub ? Number(sub) : null;
  } catch {
    return null;
  }
}

// 🚨 [핵심 수정 1] sendCompat 함수 시그니처 변경: clientTempId를 받도록 수정
async function sendCompat(
  roomId: number,
  myId: number,
  content: string,
  clientTempId: number // 💡 클라이언트 임시 ID 추가
): Promise<void> {
  if (!sendChatMessageRaw) return;

  // 🚨 [핵심 수정 1-1] sendChatMessageRaw 호출 시 clientTempId를 포함하여 전송
  return sendChatMessageRaw({
    roomId,
    content,
    clientTempId,
    senderId: myId,
    type: "TEXT", // 백엔드 DTO에 맞게 설정
  });
}

const EMPTY: ChatMessageResponse[] = [];

type SendState = "sending" | "failed";
type SendStatusMap = Record<string, SendState>;

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();

  const { id, title, targetName } = useLocalSearchParams<{
    id?: string;
    title?: string;
    targetName?: string;
  }>();

  const roomIdOrNull = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);
  const roomKey = roomIdOrNull ?? -1;

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const roomList = useChatListStore((s) => s.rooms);

  const headerTitle = useMemo(() => {
    if (typeof targetName === "string" && targetName.trim().length > 0) {
      return targetName;
    }
    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }
    const found = roomList.find((r) => r.roomId === roomIdOrNull);
    if (found && (found as any).name) return (found as any).name;
    if (found && (found as any).roomName) return (found as any).roomName;

    return "채팅";
  }, [targetName, title, roomList, roomIdOrNull]);

  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const messages = useChatStore((s) => s.messagesByRoom[roomKey] ?? EMPTY);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (s) => s.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((s) => s.resetUnreadCount);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    console.log("=== [ChatRoomScreen] 상태 확인 ===");
    console.log("roomId:", roomIdOrNull);
    console.log("myId:", myId);
    console.log("messages 개수:", messages.length);
    console.log("initialLoading:", initialLoading);
  }, [roomIdOrNull, myId, messages.length, initialLoading]);

  const flatRef = useRef<FlatList<ChatMessageResponse> | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const lastRedirectRef = useRef<Href | null>(null);
  const [inputBarH, setInputBarH] = useState(0);

  const [sendStatus, setSendStatus] = useState<SendStatusMap>({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput | null>(null);

  const prevLenRef = useRef(0);
  const scrollingRef = useRef(false);

  // ⭐️ 1. [추가] 초기 로딩 상태를 추적하는 Ref
  const initialLoadRef = useRef(false);

  const idSetRef = useRef<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    idSetRef.current = new Set(messages.map((m) => String(m.messageId)));
  }, [messages]);

  const safeScrollToBottom = useCallback((animated = true) => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    requestAnimationFrame(() => {
      flatRef.current?.scrollToEnd?.({ animated });
      scrollingRef.current = false;
    });
  }, []);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const redirectOnce = useCallback(
    (to: Href) => {
      if (!navReady) return;
      if (lastRedirectRef.current === to) return;
      lastRedirectRef.current = to;
      router.replace(to);
    },
    [router, navReady]
  );

  useEffect(() => {
    (async () => setMyId(await getMyId()))();
  }, []);

  const onBack = useCallback(() => {
    try {
      const canGoBack = (router as any).canGoBack?.();
      if (canGoBack) router.back();
      else router.replace("/chatlist" as any);
    } catch {
      router.replace("/chatlist" as any);
    }
  }, [router]);

  const initialLoad = useCallback(async () => {
    if (roomIdOrNull == null) return;

    try {
      try {
        await getChatRoomList();
      } catch (e: any) {
        if (e?.status === 401) return redirectOnce("/login" as Href);
      }

      const data = await getChatMessages(roomIdOrNull);
      const sorted = data
        .map(normalizeRestMessage)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      const cur = useChatStore.getState().messagesByRoom[roomIdOrNull] ?? EMPTY;
      const merged = mergeDedupeSort(cur, sorted);

      setMessages(roomIdOrNull, merged);

      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        updateRoomLastMessage(roomIdOrNull, last.content, last.createdAt, true);
      }
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
      Alert.alert("오류", e?.message || "불러오기 실패");
    } finally {
      setInitialLoading(false);
    }
  }, [roomIdOrNull, redirectOnce, setMessages, updateRoomLastMessage]);

  const syncMessages = useCallback(async () => {
    if (roomIdOrNull == null) return;

    setSyncing(true);
    try {
      const data = await getChatMessages(roomIdOrNull);
      const sorted = data
        .map(normalizeRestMessage)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      const cur = useChatStore.getState().messagesByRoom[roomIdOrNull] ?? EMPTY;
      const merged = mergeDedupeSort(cur, sorted);

      setMessages(roomIdOrNull, merged);

      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        updateRoomLastMessage(roomIdOrNull, last.content, last.createdAt, true);
      }
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
    } finally {
      setSyncing(false);
    }
  }, [roomIdOrNull, redirectOnce, setMessages, updateRoomLastMessage]);

  // ⭐️ 2. [수정] initialLoad 호출을 단 한번으로 제한
  useEffect(() => {
    if (!navReady) return;
    if (roomIdOrNull == null) return;

    // 💡 핵심 수정: 이미 로딩되었는지 확인하여 Strict Mode의 2차 호출을 막습니다.
    if (initialLoadRef.current) {
      resetUnreadCount(roomIdOrNull); // 언로드 카운트는 리셋
      return;
    }

    initialLoadRef.current = true; // 로딩 시작 플래그 설정

    initialLoad();
    resetUnreadCount(roomIdOrNull);

    // 💡 클린업: 채팅방 ID가 바뀌면 (다른 채팅방으로 이동 시) 플래그를 재설정하여 새 방의 로딩을 허용
    return () => {
      initialLoadRef.current = false;
    };
  }, [navReady, roomIdOrNull, initialLoad, resetUnreadCount]);

  // ✅ [중요] 메시지 길이가 달라지면 바닥으로 스크롤 (useLayoutEffect + onContentSizeChange 이중 안전장치)
  useLayoutEffect(() => {
    if (!mounted) return;
    if (messages.length > prevLenRef.current) {
      requestAnimationFrame(() => safeScrollToBottom(false)); // 초기 로딩 시 애니메이션 없이
    }
    prevLenRef.current = messages.length;
  }, [messages.length, mounted, safeScrollToBottom]);

  useEffect(() => {
    if (!initialLoading && Platform.OS === "web") {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [initialLoading]);

  useEffect(() => {
    const ids = new Set(messages.map((m) => String(m.messageId)));
    setSendStatus((prev) => {
      const next: SendStatusMap = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (ids.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [messages]);

  const removeMessageByIdNow = useCallback(
    (msgId: number) => {
      if (roomIdOrNull == null) return;

      const st = useChatStore.getState();
      const cur = st.messagesByRoom[roomIdOrNull] ?? EMPTY;
      st.setMessages(
        roomIdOrNull,
        cur.filter((m) => String(m.messageId) !== String(msgId))
      );

      setSendStatus((prev) => {
        const next = { ...prev };
        delete next[String(msgId)];
        return next;
      });

      idSetRef.current.delete(String(msgId));
    },
    [roomIdOrNull]
  );

  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!subscribeRoom) return;
    if (roomIdOrNull == null) return;

    // 이미 구독 중이면 리턴하여 중복 구독을 원천 차단
    if (subscribedRef.current) {
      console.log("🚫 [Socket] 이미 구독 중이므로 재구독 방지.");
      return;
    }

    subscribedRef.current = true; // 구독 시작 플래그 설정
    console.log(`✅ [Socket] 구독 시작: /topic/chat/room/${roomIdOrNull}`);

    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;
    const removeMsg = removeMessageByIdNow; // 교체 시 삭제 함수 사용

    const unsub = subscribeRoom(
      roomIdOrNull,
      myId ?? 0,
      (m: ChatMessageResponse & { clientTempId?: number }) => {
        console.log("📩 소켓 메시지 수신:", m);

        const normalized = normalizeRestMessage(m);
        const permanentKey = String(normalized.messageId);

        if (normalized.senderId === myId) {
          // A. 내가 보낸 메시지이며, clientTempId를 가지고 있을 때 (낙관적 메시지 교체 대상)
          if (m.clientTempId) {
            const tempId = m.clientTempId;

            console.log(
              `⚡️ 교체 감지: 임시 ID ${tempId} -> 영구 ID ${permanentKey}`
            );

            // 1. 낙관적 메시지(임시 ID) 삭제
            removeMsg(tempId);

            // 2. 영구 ID를 set에 추가
            if (!idSetRef.current.has(permanentKey)) {
              idSetRef.current.add(permanentKey);
              // 3. 영구 메시지 객체로 로컬 목록에 추가 (교체)
              addMsg(roomIdOrNull, normalized);
            }

            // 4. 교체 완료. 이 경우는 무조건 여기서 종료.
            return;
          }

          console.log(
            `🚫 [Socket] 내가 보낸 메시지 (교체 아님) 무시:`,
            normalized
          );
          return;
        }

        // 이미 로컬에 있는 영구 ID인지 확인하여 무시
        if (idSetRef.current.has(permanentKey)) {
          console.log(
            `🚫 [Socket] 중복 메시지 (ID:${permanentKey}) 무시:`,
            normalized
          );
          return;
        }

        // 타인 메시지 추가
        idSetRef.current.add(permanentKey);
        addMsg(roomIdOrNull, normalized);
        updateLast(
          roomIdOrNull,
          normalized.content,
          normalized.createdAt,
          true
        );
      }
    );

    return () => {
      console.log(`❌ [Socket] 구독 해제: /topic/chat/room/${roomIdOrNull}`);
      unsub?.();
      subscribedRef.current = false;
    };
  }, [roomIdOrNull, myId, removeMessageByIdNow, subscribeRoom]);

  if (!navReady) return null;
  if (roomIdOrNull == null) return <Redirect href={"/chatlist" as Href} />;

  const markStatus = useCallback((msgId: number, s?: SendState) => {
    const key = String(msgId);
    setSendStatus((prev) => {
      const next = { ...prev };
      if (!s) delete next[key];
      else next[key] = s;
      return next;
    });
  }, []);

  const deleteLocalMessage = useCallback(
    (msgId: number) => {
      removeMessageByIdNow(msgId);
    },
    [removeMessageByIdNow]
  );

  // 🚨 [핵심 수정 2] sendContent 함수 시그니처 변경: clientTempId를 받도록 수정
  const sendContent = useCallback(
    async (msgId: number, content: string, clientTempId: number) => {
      if (!myId) return;

      markStatus(msgId, "sending");
      try {
        if (sendChatMessageRaw) {
          // 🚨 [핵심 수정 2-1] sendCompat에 clientTempId 전달
          await sendCompat(roomIdOrNull, myId, content, clientTempId);
        }
        console.log("✅ 소켓 전송 API 호출 성공");

        // 이 로직은 소켓 리스너로 이동했으므로 여기서 제거 (성공해도 상태를 바로 지우지 않음)
        // markStatus(msgId, undefined);
      } catch {
        console.error("❌ 소켓 전송 실패");
        markStatus(msgId, "failed");
      }
    },
    [myId, markStatus, roomIdOrNull]
  );

  useEffect(() => {
    console.log("[UI] messages length =", messages.length);
  }, [messages.length]);

  const openFailActionSheet = useCallback(
    (msgId: number, content: string) => {
      // 🚨 [수정 3] 재전송 시에도 clientTempId(msgId)를 사용해야 함
      const doResend = () => sendContent(msgId, content, msgId);
      const doDelete = () => deleteLocalMessage(msgId);

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["재전송", "삭제", "취소"],
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
            title: "전송 실패",
            message: "어떤 작업을 할까요?",
          },
          (buttonIndex) => {
            if (buttonIndex === 0) doResend();
            if (buttonIndex === 1) doDelete();
          }
        );
        return;
      }

      Alert.alert("전송 실패", "어떤 작업을 할까요?", [
        { text: "재전송", onPress: doResend },
        { text: "삭제", style: "destructive", onPress: doDelete },
        { text: "취소", style: "cancel" },
      ]);
    },
    [deleteLocalMessage, sendContent]
  );

  const [isSending, setIsSending] = useState(false);

  // 🚨 [핵심 수정 3] onSend 함수 수정: tempId 생성 후 sendContent에 전달
  const onSend = useCallback(async () => {
    if (isSending) return;
    if (initialLoading || isSending) return;

    const t = text.trim();
    if (!t) return;
    if (!myId) return;

    setIsSending(true);

    // 🚨 [핵심 수정 3-1] 임시 ID 생성 및 사용
    const tempId = Date.now() + Math.floor(Math.random() * 1000);
    const nowIso = new Date().toISOString();

    const optimisticMsg: ChatMessageResponse = {
      messageId: tempId as any,
      roomId: roomIdOrNull,
      senderId: myId,
      content: t,
      createdAt: nowIso,
      sentAt: nowIso,
      senderName: "Me",
      type: "TEXT",
    };

    idSetRef.current.add(String(tempId));
    addMessage(roomIdOrNull, optimisticMsg);
    updateRoomLastMessage(roomIdOrNull, t, nowIso, true);

    requestAnimationFrame(() => {
      setText("");
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => safeScrollToBottom(true));
    });

    try {
      // 🚨 [핵심 수정 3-2] sendContent에 임시 ID를 전달
      await sendContent(tempId, t, tempId);
    } finally {
      setTimeout(() => setIsSending(false), 300);
    }

    inputRef.current?.focus();
  }, [
    isSending,
    initialLoading,
    text,
    myId,
    roomIdOrNull,
    addMessage,
    updateRoomLastMessage,
    safeScrollToBottom,
    sendContent,
  ]);

  const handlePressAvatar = useCallback(
    async (senderId: number) => {
      if (senderId === myId) return;

      setProfileLoading(true);
      setProfileModalVisible(true);

      try {
        const data = await fetchFriendProfile(senderId);
        setSelectedProfile(data);
      } catch (e) {
        console.error(e);
        Alert.alert("알림", "프로필 정보를 불러올 수 없습니다.");
        setProfileModalVisible(false);
      } finally {
        setProfileLoading(false);
      }
    },
    [myId]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: { index: number; msg: ChatMessageResponse }[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const c = (m.content || "").toLowerCase();
      if (c.includes(q)) out.push({ index: i, msg: m });
    }
    return out;
  }, [messages, searchQuery]);

  const scrollToMessageIndex = useCallback((index: number) => {
    try {
      flatRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    } catch {}
  }, []);

  const onScrollToIndexFailed = useCallback((info: any) => {
    const wait = 80;
    flatRef.current?.scrollToOffset({
      offset: Math.max(0, info.averageItemLength * info.index),
      animated: true,
    });
    setTimeout(() => {
      flatRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5,
      });
    }, wait);
  }, []);

  const onPressSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageResponse; index: number }) => {
      const mine = myId != null && item.senderId === myId;

      const prev = messages[index - 1];
      const next = messages[index + 1];

      const showDateSeparator =
        index === 0 || !sameDay(prev?.createdAt, item.createdAt);

      const isFirstOfRun = !prev || prev.senderId !== item.senderId;
      const isLastOfRun = !next || next.senderId !== item.senderId;

      const showAvatar = !mine && isFirstOfRun;
      const showName = !mine && isFirstOfRun;
      const showTime = isLastOfRun;

      const dateText = mounted ? formatDateSafe(item.createdAt) : "";
      const timeText = mounted ? formatTimeSafe(item.createdAt) : "";

      const local = sendStatus[String(item.messageId)];
      const status = mine ? local ?? "sent" : "sent";

      return (
        <View>
          {showDateSeparator && mounted && (
            <View style={chatRoomStyles.dateSeparator}>
              <Text style={chatRoomStyles.dateSeparatorText}>{dateText}</Text>
            </View>
          )}

          <MessageBubble
            mine={mine}
            content={item.content}
            senderName={item.senderName}
            showName={showName}
            showAvatar={showAvatar}
            onPressAvatar={() => {
              const sid = toNumberSafe((item as any).senderId);
              if (sid != null) handlePressAvatar(sid);
            }}
            timeLabel={timeText}
            showTime={showTime}
            status={status}
            onPressFail={() =>
              openFailActionSheet(Number(item.messageId), item.content)
            }
          />
        </View>
      );
    },
    [
      myId,
      mounted,
      messages,
      handlePressAvatar,
      sendStatus,
      openFailActionSheet,
    ]
  );

  return (
    <KeyboardAvoidingView
      style={
        {
          flex: 1,
          backgroundColor: "#fafafa",
          ...(Platform.OS === "web" ? { height: "100vh" } : {}),
        } as any
      }
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
      enabled={Platform.OS !== "web"}
    >
      <ChatHeader
        title={headerTitle}
        syncing={syncing}
        onBack={onBack}
        onPressSearch={onPressSearch}
      />

      {initialLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatRef as any}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => String(m.messageId)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: inputBarH + insets.bottom + 12,
            flexGrow: 1,
            justifyContent: "flex-end",
          }}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
          onScrollToIndexFailed={onScrollToIndexFailed}
          extraData={[mounted, sendStatus, myId]}
          // ✅ [추가] 리스트 사이즈가 변하면(데이터 로드 시) 즉시 바닥으로 이동
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatRef.current?.scrollToEnd({ animated: false });
            }
          }}
          // ✅ [추가] 초기 레이아웃 잡힐 때도 바닥으로 이동
          onLayout={() => {
            if (messages.length > 0) {
              flatRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />
      )}

      <MessageInput
        text={text}
        setText={setText}
        onSend={onSend}
        inputRef={inputRef}
        onHeight={setInputBarH}
      />

      {/* 검색 모달 */}
      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSearch}
      >
        <TouchableWithoutFeedback onPress={closeSearch}>
          <View style={chatRoomStyles.searchOverlay}>
            <TouchableWithoutFeedback>
              <View style={{ paddingTop: insets.top }}>
                <View style={chatRoomStyles.searchPanel}>
                  <View style={chatRoomStyles.searchBarRow}>
                    <Pressable
                      onPress={closeSearch}
                      style={chatRoomStyles.headerBtn}
                    >
                      <Ionicons name="close" size={22} color="#111" />
                    </Pressable>

                    <View style={chatRoomStyles.searchInputWrap}>
                      <TextInput
                        ref={searchInputRef}
                        placeholder="채팅 내용 검색"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={chatRoomStyles.searchInput}
                        returnKeyType="search"
                      />
                    </View>
                  </View>
                </View>

                <View style={chatRoomStyles.searchResultWrap}>
                  <Text style={chatRoomStyles.searchResultTitle}>
                    {searchQuery.trim()
                      ? `검색 결과 ${searchResults.length}개`
                      : "검색어를 입력하세요"}
                  </Text>

                  {searchQuery.trim() && searchResults.length === 0 ? (
                    <Text style={chatRoomStyles.searchEmpty}>
                      결과가 없습니다.
                    </Text>
                  ) : (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(x) => String(x.msg.messageId)}
                      renderItem={({ item }) => {
                        const who =
                          item.msg.senderName ||
                          (item.msg.senderId === myId ? "Me" : "상대");
                        const t = formatTimeSafe(item.msg.createdAt);
                        return (
                          <Pressable
                            style={chatRoomStyles.searchRow}
                            onPress={() => {
                              closeSearch();
                              requestAnimationFrame(() =>
                                scrollToMessageIndex(item.index)
                              );
                            }}
                          >
                            <View style={chatRoomStyles.searchRowTop}>
                              <Text style={chatRoomStyles.searchRowName}>
                                {who}
                              </Text>
                              <Text style={chatRoomStyles.searchRowTime}>
                                {t}
                              </Text>
                            </View>
                            <Text
                              style={chatRoomStyles.searchRowMsg}
                              numberOfLines={2}
                            >
                              {item.msg.content}
                            </Text>
                          </Pressable>
                        );
                      }}
                      keyboardShouldPersistTaps="handled"
                    />
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 프로필 모달 */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setProfileModalVisible(false)}>
          <View style={chatRoomModalStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={chatRoomModalStyles.card}>
                {profileLoading ? (
                  <ActivityIndicator size="large" color="#7C73FF" />
                ) : (
                  selectedProfile && (
                    <>
                      <View style={chatRoomModalStyles.bgContainer}>
                        {selectedProfile.backgroundPhotoUrl ? (
                          <Image
                            source={{
                              uri: selectedProfile.backgroundPhotoUrl,
                            }}
                            style={chatRoomModalStyles.bgImage}
                          />
                        ) : (
                          <View
                            style={[
                              chatRoomModalStyles.bgImage,
                              { backgroundColor: "#eee" },
                            ]}
                          />
                        )}

                        <Pressable
                          style={chatRoomModalStyles.closeBtn}
                          onPress={() => setProfileModalVisible(false)}
                        >
                          <Ionicons name="close" size={20} color="#333" />
                        </Pressable>
                      </View>

                      <View style={chatRoomModalStyles.infoContainer}>
                        <View style={chatRoomModalStyles.avatarContainer}>
                          {selectedProfile.profilePhotoUrl ? (
                            <Image
                              source={{
                                uri: selectedProfile.profilePhotoUrl,
                              }}
                              style={chatRoomModalStyles.avatar}
                            />
                          ) : (
                            <View
                              style={[
                                chatRoomModalStyles.avatar,
                                {
                                  backgroundColor: "#ccc",
                                  justifyContent: "center",
                                  alignItems: "center",
                                },
                              ]}
                            >
                              <Ionicons name="person" size={40} color="#fff" />
                            </View>
                          )}
                        </View>

                        <Text style={chatRoomModalStyles.name}>
                          {selectedProfile.nickname ||
                            selectedProfile.name ||
                            "이름 없음"}
                        </Text>

                        <Text style={chatRoomModalStyles.status}>
                          {selectedProfile.statusMessage || ""}
                        </Text>
                      </View>

                      <View style={chatRoomModalStyles.actionRow}>
                        <View style={chatRoomModalStyles.actionItem}>
                          <Ionicons name="chatbubble" size={20} color="#fff" />
                          <Text style={chatRoomModalStyles.actionText}>
                            1:1 채팅
                          </Text>
                        </View>
                      </View>
                    </>
                  )
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}
