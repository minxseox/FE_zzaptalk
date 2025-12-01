// app/chat/[id].tsx (ChatRoomScreen)
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

/** ✅ socket 모듈 로드(실패를 숨기지 않음) */
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
    (x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt)
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

/** ✅ 항상 (roomId, myId, content)로 호출 */
async function sendCompat(roomId: number, myId: number, content: string) {
  if (!sendChatMessageRaw) return;
  return sendChatMessageRaw(roomId, myId, content);
}

const EMPTY: ChatMessageResponse[] = [];

type SendState = "sending" | "failed";
type SendStatusMap = Record<string, SendState>;

export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();

  // ✅ 핵심: roomId가 NaN일 때 store/구독/전송을 절대 하지 않게 만들기
  const roomIdOrNull = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);
  const roomKey = roomIdOrNull ?? -1; // 훅 호출용 안전 키(쓰기 금지)

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : "채팅";

  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // ✅ selector는 roomKey로 (roomIdOrNull일 땐 곧 Redirect 되니 여기서는 안전키로만)
  const messages = useChatStore((s) => s.messagesByRoom[roomKey] ?? EMPTY);
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

  const [sendStatus, setSendStatus] = useState<SendStatusMap>({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput | null>(null);

  const prevLenRef = useRef(0);
  const scrollingRef = useRef(false);

  const idSetRef = useRef<Set<string>>(new Set());
  const pendingOptimisticRef = useRef<
    Map<number, { content: string; sentAtMs: number }>
  >(new Map());

  useEffect(() => setMounted(true), []);

  // messages가 바뀔 때마다 id set 갱신
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
    // ✅ roomId가 확정된 경우에만 로드
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

  useEffect(() => {
    if (!navReady) return;
    if (roomIdOrNull == null) return;

    initialLoad();
    resetUnreadCount(roomIdOrNull);
  }, [navReady, roomIdOrNull, initialLoad, resetUnreadCount]);

  // ✅ 스크롤 깜빡임 방지 + 새 메시지 오면 아래로
  useLayoutEffect(() => {
    if (!mounted) return;
    if (messages.length > prevLenRef.current) {
      requestAnimationFrame(() => safeScrollToBottom(true));
    }
    prevLenRef.current = messages.length;
  }, [messages.length, mounted, safeScrollToBottom]);

  // ✅ 웹 입장 시 자동 포커스
  useEffect(() => {
    if (!initialLoading && Platform.OS === "web") {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [initialLoading]);

  // ✅ status map 정리
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

  // ✅ 소켓 구독 (roomId 확정된 경우에만)
  useEffect(() => {
    if (!subscribeRoom) return;
    if (roomIdOrNull == null) return;

    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;

    const unsub = subscribeRoom(roomIdOrNull, (m: ChatMessageResponse) => {
      const normalized = normalizeRestMessage(m);
      const key = String(normalized.messageId);

      // 1) messageId 중복 방지
      if (idSetRef.current.has(key)) return;

      // 2) 내 메시지면 optimistic 교체 시도
      if (myId != null && normalized.senderId === myId) {
        const now = Date.now();
        const serverAt = Date.parse(normalized.createdAt);
        const baseMs = Number.isFinite(serverAt) ? serverAt : now;

        let targetId: number | null = null;
        let best = Infinity;

        for (const [optId, info] of pendingOptimisticRef.current.entries()) {
          if (info.content !== normalized.content) continue;

          const diff = Math.min(
            Math.abs(baseMs - info.sentAtMs),
            Math.abs(now - info.sentAtMs)
          );

          if (diff < 15000 && diff < best) {
            best = diff;
            targetId = optId;
          }
        }

        if (targetId != null) {
          pendingOptimisticRef.current.delete(targetId);
          removeMessageByIdNow(targetId);
        }
      }

      // 3) 서버 메시지 추가
      idSetRef.current.add(key);
      addMsg(roomIdOrNull, normalized);
      updateLast(roomIdOrNull, normalized.content, normalized.createdAt, true);
    });

    return () => unsub?.();
  }, [roomIdOrNull, myId, removeMessageByIdNow]);

  // ✅ navReady 전에는 렌더 멈춤 (hydration 안정)
  if (!navReady) return null;

  // ✅ roomId가 아직 없거나 이상하면 바로 리다이렉트 (store에 NaN 쓰는 것 방지)
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

  const sendContent = useCallback(
    async (msgId: number, content: string) => {
      if (!myId) return;

      markStatus(msgId, "sending");
      try {
        if (sendChatMessageRaw) await sendCompat(roomIdOrNull, myId, content);
        markStatus(msgId, undefined);

        // 서버가 sender에게 echo 안 해주는 환경 대비: pending이면 한번 더 sync
        setTimeout(() => {
          if (pendingOptimisticRef.current.has(msgId)) {
            syncMessages();
          }
        }, 1200);
      } catch {
        markStatus(msgId, "failed");
      }
    },
    [myId, markStatus, roomIdOrNull, syncMessages]
  );

  const openFailActionSheet = useCallback(
    (msgId: number, content: string) => {
      const doResend = () => sendContent(msgId, content);
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

  const onSend = useCallback(async () => {
    if (initialLoading) return;

    const t = text.trim();
    if (!t || !myId) return;

    const nowIso = new Date().toISOString();
    const optimisticId = Date.now() + Math.floor(Math.random() * 1000);

    const optimistic: ChatMessageResponse = {
      messageId: optimisticId,
      roomId: roomIdOrNull,
      senderId: myId,
      content: t,
      createdAt: nowIso,
      sentAt: nowIso,
      senderName: "Me",
      type: "TEXT",
    };

    pendingOptimisticRef.current.set(optimisticId, {
      content: t,
      sentAtMs: Date.now(),
    });

    // ✅ 여기서 바로 store에 들어가야 화면에 보여야 정상
    addMessage(roomIdOrNull, optimistic);
    updateRoomLastMessage(roomIdOrNull, t, nowIso, true);
    setText("");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => safeScrollToBottom(true));
    });

    await sendContent(optimisticId, t);
    inputRef.current?.focus();
  }, [
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
      style={{ flex: 1, backgroundColor: "#fafafa" }}
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
            flexGrow: 1, // ✅ 웹에서 높이 0 되는 케이스 완화
          }}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
          onScrollToIndexFailed={onScrollToIndexFailed}
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

      {/* ✅ 검색 모달 */}
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

      {/* ✅ 프로필 모달 */}
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
