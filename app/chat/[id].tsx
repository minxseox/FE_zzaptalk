// app/chat/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  Text,
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
 * 날짜 유틸
 * =============================== */
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

// Hydration 안전: 웹에서만 locale 포맷
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
    // ✅ 오전/오후 포함
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
  return {
    ...m,
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

  // ✅ 방별 메시지
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
  const inputRef = useRef<TextInput>(null);
  const lastRedirectRef = useRef<Href | null>(null);

  // ✅ 입력바 높이 측정 → FlatList paddingBottom에 반영
  const [inputBarH, setInputBarH] = useState(0);

  // ✅ 스크롤 제어
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
    // ✅ 히스토리 없으면 chatlist로
    try {
      const canGoBack = (router as any).canGoBack?.();
      if (canGoBack) router.back();
      else router.replace("/chatlist" as any);
    } catch {
      router.replace("/chatlist" as any);
    }
  }, [router]);

  // ✅ 초기 데이터 로딩
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

  // ✅ 새 메시지 추가되면 자동 스크롤 (렌더 끝난 후)
  useEffect(() => {
    if (!mounted) return;
    if (messages.length > prevLenRef.current) {
      requestAnimationFrame(() => safeScrollToBottom(true));
    }
    prevLenRef.current = messages.length;
  }, [messages.length, mounted, safeScrollToBottom]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  // ✅ 소켓 구독
  useEffect(() => {
    if (!subscribeRoom) return;

    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      const normalized = normalizeRestMessage(m);
      addMsg(roomId, normalized);
      updateLast(roomId, normalized.content, normalized.createdAt, true);
      // 스크롤은 messages.length effect에서 처리
    });

    return () => unsub?.();
  }, [roomId]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !myId) return;

    const nowIso = new Date().toISOString();
    const optimistic: ChatMessageResponse = {
      messageId: Date.now(),
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

    // ✅ 렌더 완료 “다음 프레임”에 한번 더 내려야 입력바에 안 가림
    requestAnimationFrame(() => {
      requestAnimationFrame(() => safeScrollToBottom(true));
    });

    try {
      if (sendChatMessageRaw) {
        await sendCompat(roomId, myId, t);
      }
      await syncMessages();
    } catch {
      Alert.alert("전송 실패", "메시지를 보낼 수 없어요.");
    } finally {
      inputRef.current?.focus();
    }
  }, [
    text,
    myId,
    roomId,
    syncMessages,
    addMessage,
    updateRoomLastMessage,
    safeScrollToBottom,
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

      // ✅ 날짜 구분선: 첫 메시지 or 날짜 바뀔 때
      const showDateSeparator =
        index === 0 || !sameDay(prev?.createdAt, item.createdAt);

      // ✅ 연속 메시지 판단
      const isFirstOfRun = !prev || prev.senderId !== item.senderId;
      const isLastOfRun = !next || next.senderId !== item.senderId;

      // ✅ 상대방: 아바타/이름은 run의 첫 말풍선에만
      const showAvatar = !mine && isFirstOfRun;
      const showName = !mine && isFirstOfRun;

      // ✅ 시간: run의 마지막 말풍선에만 (단순 규칙)
      const showTimeLabel = isLastOfRun;

      const dateText = mounted ? formatDateSafe(item.createdAt) : "";
      const timeLabel = mounted ? formatTimeSafe(item.createdAt) : "";

      return (
        <View>
          {showDateSeparator && mounted && (
            <View style={chatRoomStyles.dateSeparator}>
              <Text style={chatRoomStyles.dateSeparatorText}>{dateText}</Text>
            </View>
          )}

          <View
            style={[
              chatRoomStyles.msgRow,
              mine ? chatRoomStyles.msgRowMine : chatRoomStyles.msgRowOther,
            ]}
          >
            {/* ✅ 상대 run 후속 메시지는 아바타 자리만 유지 */}
            {!mine ? (
              showAvatar ? (
                <Pressable
                  style={chatRoomStyles.avatarContainer}
                  onPress={() => handlePressAvatar(item.senderId)}
                >
                  <View style={chatRoomStyles.avatarPlaceholder}>
                    <Text style={chatRoomStyles.avatarInitial}>
                      {item.senderName?.charAt(0) ?? "?"}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View style={chatRoomStyles.avatarSpacer} />
              )
            ) : null}

            <View style={chatRoomStyles.bubbleLine}>
              {/* ✅ 내 시간: 말풍선 왼쪽 아래 */}
              {mine && showTimeLabel && mounted && (
                <Text
                  style={[chatRoomStyles.timeBeside, chatRoomStyles.timeMine]}
                >
                  {timeLabel}
                </Text>
              )}

              <View
                style={[
                  chatRoomStyles.bubble,
                  mine ? chatRoomStyles.bubbleMine : chatRoomStyles.bubbleOther,
                ]}
              >
                {showName && item.senderName ? (
                  <Text style={chatRoomStyles.senderName}>
                    {item.senderName}
                  </Text>
                ) : null}

                <Text
                  style={
                    mine
                      ? chatRoomStyles.msgTextMine
                      : chatRoomStyles.msgTextOther
                  }
                >
                  {item.content}
                </Text>
              </View>

              {/* ✅ 상대 시간: 말풍선 오른쪽 아래 */}
              {!mine && showTimeLabel && mounted && (
                <Text
                  style={[chatRoomStyles.timeBeside, chatRoomStyles.timeOther]}
                >
                  {timeLabel}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    },
    [myId, mounted, messages, handlePressAvatar]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
      <View style={chatRoomStyles.header}>
        <Pressable onPress={onBack} style={chatRoomStyles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <Text style={chatRoomStyles.headerTitle}>{headerTitle}</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable style={chatRoomStyles.headerBtn}>
            <Ionicons name="search" size={20} color="#111" />
          </Pressable>
          <Pressable style={chatRoomStyles.headerBtn}>
            <Ionicons
              name="settings-outline"
              size={20}
              color="#111"
              style={{ opacity: syncing ? 0.6 : 1 }}
            />
          </Pressable>
        </View>
      </View>

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
            paddingBottom: inputBarH + insets.bottom + 12, // ✅ 입력바/세이프영역만큼 여백
          }}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
          extraData={mounted}
        />
      )}

      <View
        style={chatRoomStyles.inputBar}
        onLayout={(e) => setInputBarH(e.nativeEvent.layout.height)}
      >
        <Pressable style={chatRoomStyles.circleBtn}>
          <Ionicons name="add" size={20} color="#444" />
        </Pressable>
        <Pressable style={chatRoomStyles.circleBtn}>
          <Ionicons name="happy-outline" size={20} color="#444" />
        </Pressable>

        <View style={chatRoomStyles.inputWrap}>
          <TextInput
            ref={inputRef}
            placeholder="메세지 입력"
            value={text}
            onChangeText={setText}
            style={chatRoomStyles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <Pressable
            style={[
              chatRoomStyles.sendFab,
              !text.trim() && { backgroundColor: "#D8D8E8" },
            ]}
            onPress={onSend}
            disabled={!text.trim()}
          >
            <Ionicons name="paper-plane" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

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
