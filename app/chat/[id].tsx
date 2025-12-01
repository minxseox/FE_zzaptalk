import React, {
  useCallback,
  useEffect,
  useLayoutEffect, // ✅ [수정] 깜빡임 없는 스크롤을 위해 추가
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

/** ✅ REST/WS 메시지 정규화: messageId도 숫자화(문자열 id 대비) */
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

/** ✅ 서버리스트(setMessages)가 optimistic를 덮어쓰지 않게 merge + dedupe + sort */
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

/** ✅ arity(length) 의존 제거: 항상 (roomId, myId, content)로 호출 */
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

  const [sendStatus, setSendStatus] = useState<SendStatusMap>({});

  // ✅ 채팅 검색 상태
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput | null>(null);

  const prevLenRef = useRef(0);
  const scrollingRef = useRef(false);

  /** ✅ dedupe용: 현재 화면에 존재하는 messageId들 */
  const idSetRef = useRef<Set<string>>(new Set());

  /** ✅ optimistic 교체용: 내가 보낸 임시 메시지 기록 */
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

  // ✅ 프로필 모달
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

      // ✅ 덮어쓰기 금지: 현재 store(optimistic 포함)와 merge
      const cur = useChatStore.getState().messagesByRoom[roomId] ?? EMPTY;
      const merged = mergeDedupeSort(cur, sorted);
      setMessages(roomId, merged);

      if (merged.length > 0) {
        const last = merged[merged.length - 1];
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

      // ✅ 덮어쓰기 금지: 현재 store(optimistic 포함)와 merge
      const cur = useChatStore.getState().messagesByRoom[roomId] ?? EMPTY;
      const merged = mergeDedupeSort(cur, sorted);
      setMessages(roomId, merged);

      if (merged.length > 0) {
        const last = merged[merged.length - 1];
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

  // ✅ [수정] Web Flash 방지 및 스크롤 안정화를 위해 useLayoutEffect 사용
  useLayoutEffect(() => {
    if (!mounted) return;
    if (messages.length > prevLenRef.current) {
      requestAnimationFrame(() => safeScrollToBottom(true));
    }
    prevLenRef.current = messages.length;
  }, [messages.length, mounted, safeScrollToBottom]);

  // ✅ [추가] Web UX: 로딩 완료 후 자동 포커스 (마우스 클릭 불필요하게)
  useEffect(() => {
    if (!initialLoading && Platform.OS === "web") {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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

  /** ✅ 현재 store 기준으로 메시지 삭제(클로저 꼬임 방지) */
  const removeMessageByIdNow = useCallback(
    (msgId: number) => {
      const st = useChatStore.getState();
      const cur = st.messagesByRoom[roomId] ?? EMPTY;
      st.setMessages(
        roomId,
        cur.filter((m) => String(m.messageId) !== String(msgId))
      );

      // sendStatus 정리
      setSendStatus((prev) => {
        const next = { ...prev };
        delete next[String(msgId)];
        return next;
      });

      // dedupe set 정리
      idSetRef.current.delete(String(msgId));
    },
    [roomId]
  );

  // ✅ 소켓 구독 (dedupe + optimistic 교체)
  useEffect(() => {
    if (!subscribeRoom) return;

    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      const normalized = normalizeRestMessage(m);
      const key = String(normalized.messageId);

      // ✅ 1) messageId 기준 중복 방지
      if (idSetRef.current.has(key)) return;

      // ✅ 2) 내 메시지면 optimistic(임시) 교체 시도
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

      // ✅ 3) 서버 메시지 추가
      idSetRef.current.add(key);
      addMsg(roomId, normalized);
      updateLast(roomId, normalized.content, normalized.createdAt, true);
    });

    return () => unsub?.();
  }, [roomId, myId, removeMessageByIdNow]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  const markStatus = useCallback((msgId: number, s?: SendState) => {
    const key = String(msgId);
    setSendStatus((prev) => {
      const next = { ...prev };
      if (!s) delete next[key];
      else next[key] = s;
      return next;
    });
  }, []);

  /** ✅ 실패 액션시트에서 “삭제”는 현재 store 기준으로 삭제 */
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
        if (sendChatMessageRaw) await sendCompat(roomId, myId, content);

        // ✅ 전송 성공
        markStatus(msgId, undefined);

        // ✅ 서버 echo가 안 오는 환경 대비: 잠깐 기다렸다가,
        // 아직 pending(=교체 안 됨)이면 1회 sync로 보정
        setTimeout(() => {
          if (pendingOptimisticRef.current.has(msgId)) {
            syncMessages();
          }
        }, 1200);
      } catch {
        markStatus(msgId, "failed");
      }
    },
    [myId, markStatus, roomId, syncMessages]
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
    // ✅ 초기 로딩 중 전송은 덮어쓰기 타이밍 사고가 나서 방지
    if (initialLoading) return;

    const t = text.trim();
    if (!t || !myId) return;

    const nowIso = new Date().toISOString();
    const optimisticId = Date.now() + Math.floor(Math.random() * 1000);

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

    pendingOptimisticRef.current.set(optimisticId, {
      content: t,
      sentAtMs: Date.now(),
    });

    addMessage(roomId, optimistic);
    updateRoomLastMessage(roomId, t, nowIso, true);
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

  // ✅ 검색 결과 계산 (메시지 내용 기준)
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
      // ✅ [수정] 웹에서는 KeyboardAvoidingView 기능 끄기 (레이아웃 충돌 방지)
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
