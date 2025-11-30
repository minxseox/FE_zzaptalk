import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Text,
  Pressable,
  TextInput,
  View,
  Modal,
  Image,
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

// ✅ 스타일
import {
  chatRoomStyles,
  chatRoomModalStyles,
} from "../../src/styles/chat/ChatRoom.module";

// ✅ 컴포넌트
import ChatHeader from "../../src/components/chat/ChatHeader";
import MessageBubble from "../../src/components/chat/MessageBubble";
import MessageInput from "../../src/components/chat/MessageInput";

// ✅ Zustand Store
import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";

// ✅ API
import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

// ✅ Auth
import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

// ✅ 친구 프로필 조회
import { fetchFriendProfile } from "../../src/services/profile";

// 소켓 모듈 (SSR 방지용 require)
let sendChatMessageRaw: any;
let subscribeRoom: any;
try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch {}

/* ===============================
 * 유틸
 * =============================== */
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
      hour12: true, // ✅ 오전/오후
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function normalizeRestMessage(m: ChatMessageResponse): ChatMessageResponse {
  const senderIdNum = toNumberSafe((m as any).senderId) ?? 0;
  const roomIdNum = toNumberSafe((m as any).roomId) ?? (m as any).roomId ?? 0;

  return {
    ...m,
    roomId: roomIdNum,
    senderId: senderIdNum,
    createdAt: toIsoSafe((m as any).createdAt),
    sentAt: toIsoSafe((m as any).sentAt ?? (m as any).createdAt),
  };
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

async function sendCompat(roomId: number, myId: number, content: string) {
  if (!sendChatMessageRaw) return;
  if (sendChatMessageRaw.length === 2)
    return sendChatMessageRaw(roomId, content);
  return sendChatMessageRaw(roomId, myId, content);
}

const EMPTY: ChatMessageResponse[] = [];

type SendState = "sending" | "failed";
type SendStatusMap = Record<string, SendState>;

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();

  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();
  const roomId = Number(id);

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : "채팅";

  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const messages = useChatStore((s) => s.messagesByRoom[roomId] ?? EMPTY);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (s) => s.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((s) => s.resetUnreadCount);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  const flatRef = useRef<FlatList<ChatMessageResponse> | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const lastRedirectRef = useRef<Href | null>(null);
  const [inputBarH, setInputBarH] = useState(0);

  // ✅ 전송 상태(실패/전송중) 맵: messageId 기준
  const [sendStatus, setSendStatus] = useState<SendStatusMap>({});

  const prevLenRef = useRef(0);
  const scrollingRef = useRef(false);
  const safeScrollToBottom = useCallback((animated = true) => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    requestAnimationFrame(() => {
      flatRef.current?.scrollToEnd?.({ animated });
      scrollingRef.current = false;
    });
  }, []);

  // ✅ 프로필 모달
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => setMounted(true), []);

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
    try {
      try {
        await getChatRoomList();
      } catch (e: any) {
        if (e?.status === 401) return redirectOnce("/login" as Href);
      }

      const data = await getChatMessages(roomId);
      const sorted = data
        .map(normalizeRestMessage)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      setMessages(roomId, sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
      Alert.alert("오류", e?.message || "불러오기 실패");
    } finally {
      setInitialLoading(false);
    }
  }, [roomId, redirectOnce, setMessages, updateRoomLastMessage]);

  const syncMessages = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await getChatMessages(roomId);
      const sorted = data
        .map(normalizeRestMessage)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      setMessages(roomId, sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
    } finally {
      setSyncing(false);
    }
  }, [roomId, redirectOnce, setMessages, updateRoomLastMessage]);

  useEffect(() => {
    if (!navReady) return;
    initialLoad();
    resetUnreadCount(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navReady, roomId]);

  useEffect(() => {
    if (!mounted) return;
    if (messages.length > prevLenRef.current) {
      requestAnimationFrame(() => safeScrollToBottom(true));
    }
    prevLenRef.current = messages.length;
  }, [messages.length, mounted, safeScrollToBottom]);

  // ✅ 메시지 목록 기준으로 status map 정리(남아있는 키 정리)
  useEffect(() => {
    const ids = new Set(messages.map((m) => String(m.messageId)));
    setSendStatus((prev) => {
      let changed = false;
      const next: SendStatusMap = {};
      for (const [k, v] of Object.entries(prev)) {
        if (ids.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [messages]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  useEffect(() => {
    if (!subscribeRoom) return;

    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      const normalized = normalizeRestMessage(m);
      addMsg(roomId, normalized);
      updateLast(roomId, normalized.content, normalized.createdAt, true);
    });

    return () => unsub?.();
  }, [roomId]);

  const markStatus = useCallback((msgId: number, s?: SendState) => {
    const key = String(msgId);
    setSendStatus((prev) => {
      const next = { ...prev };
      if (!s) delete next[key];
      else next[key] = s;
      return next;
    });
  }, []);

  const sendContent = useCallback(
    async (msgId: number, content: string) => {
      if (!myId) return;

      markStatus(msgId, "sending");
      try {
        if (sendChatMessageRaw) await sendCompat(roomId, myId, content);
        markStatus(msgId, undefined); // ✅ 성공 → 실패 UI 제거
        await syncMessages();
      } catch {
        markStatus(msgId, "failed");
      }
    },
    [myId, markStatus, roomId, syncMessages]
  );

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !myId) return;

    const nowIso = new Date().toISOString();
    const optimisticId = Date.now();

    const optimistic: ChatMessageResponse = {
      messageId: optimisticId,
      roomId,
      senderId: myId,
      content: t,
      createdAt: nowIso,
      sentAt: nowIso,
      senderName: "Me",
      type: "TEXT",
    };

    addMessage(roomId, optimistic);
    updateRoomLastMessage(roomId, t, nowIso, true);
    setText("");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => safeScrollToBottom(true));
    });

    // ✅ 실제 전송 + 실패 처리
    await sendContent(optimisticId, t);

    inputRef.current?.focus();
  }, [
    text,
    myId,
    roomId,
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

      const failed = mine && sendStatus[String(item.messageId)] === "failed";

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
            failed={failed}
            onRetry={() => sendContent(item.messageId as any, item.content)}
          />
        </View>
      );
    },
    [myId, mounted, messages, handlePressAvatar, sendStatus, sendContent]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
      <ChatHeader title={headerTitle} syncing={syncing} onBack={onBack} />

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
          }}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
          extraData={mounted}
        />
      )}

      <MessageInput
        text={text}
        setText={setText}
        onSend={onSend}
        inputRef={inputRef}
        onHeight={setInputBarH}
      />

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
                            source={{ uri: selectedProfile.backgroundPhotoUrl }}
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
                              source={{ uri: selectedProfile.profilePhotoUrl }}
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
