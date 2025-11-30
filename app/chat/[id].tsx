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

// ✅ 스타일 모듈 (named exports)
import {
  chatRoomStyles,
  chatRoomModalStyles,
} from "../../src/styles/chat/ChatRoom.module";

// ✅ Zustand Store
import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";

import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

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

// 하루 비교
function isSameDay(d1: string, d2: string) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// 어떤 값이 오든 ISO 문자열로 정규화
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

// ✅ 클라이언트 전용 날짜 포맷팅 (Hydration 에러 방지)
function formatDateSafe(isoString: string): string {
  if (typeof window === "undefined") {
    // 서버에서는 ISO 그대로 반환
    return isoString;
  }

  try {
    return new Date(isoString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } catch {
    return isoString;
  }
}

function formatTimeSafe(isoString: string): string {
  if (typeof window === "undefined") {
    // 서버에서는 빈 문자열
    return "";
  }

  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// REST로 받은 메시지도 createdAt/sentAt 정규화
function normalizeRestMessage(m: ChatMessageResponse): ChatMessageResponse {
  return {
    ...m,
    createdAt: toIsoSafe((m as any).createdAt),
    sentAt: toIsoSafe((m as any).sentAt ?? (m as any).createdAt),
  };
}

// 내 ID 가져오기
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

// 전송 호환성 함수
async function sendCompat(roomId: number, myId: number, content: string) {
  if (!sendChatMessageRaw) return;
  // (roomId, content)
  if (sendChatMessageRaw.length === 2) {
    return sendChatMessageRaw(roomId, content);
  }
  // (roomId, myId, content)
  return sendChatMessageRaw(roomId, myId, content);
}

// ✅ 스크롤 헬퍼 함수 (유틸로 분리) - flatRef 타입 any로 수정
function scrollToBottomUtil(flatRef: React.RefObject<any>) {
  requestAnimationFrame(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  });
}

export default function ChatRoomScreen() {
  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();
  const roomId = Number(id);

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : "채팅";

  // ✅ 클라이언트 마운트 상태 추가 (Hydration 에러 방지)
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // ✅ 방별 메시지 사용
  const messages = useChatStore((state) => state.messagesByRoom[roomId] ?? []);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (state) => state.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((state) => state.resetUnreadCount);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  // ✅ flatRef 타입을 any로 수정
  const flatRef = useRef<any>(null);
  const lastRedirectRef = useRef<Href | null>(null);

  // 프로필 모달
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

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
    (async () => {
      setMyId(await getMyId());
    })();
  }, []);

  // 초기 로딩
  const initialLoad = useCallback(async () => {
    try {
      try {
        await getChatRoomList();
      } catch (e: any) {
        if (e?.status === 401) return redirectOnce("/login" as Href);
      }

      const data = await getChatMessages(roomId);
      const normalized = data.map(normalizeRestMessage);
      const sorted = [...normalized].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );

      setMessages(roomId, sorted);

      // ✅ 추가: 마지막 메시지를 채팅방 목록에 반영
      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }

      scrollToBottomUtil(flatRef);
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
      const normalized = data.map(normalizeRestMessage);
      const sorted = [...normalized].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
      setMessages(roomId, sorted);

      // ✅ 추가: 동기화 후에도 마지막 메시지 반영
      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }

      scrollToBottomUtil(flatRef);
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
  }, [navReady, initialLoad, roomId, resetUnreadCount]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  // 🔥 소켓 구독 (무한 루프 방지 버전 + scrollToBottom 의존성 제거)
  useEffect(() => {
    if (!subscribeRoom) return;

    // ✅ Zustand setter는 getState()로 고정된 참조 사용
    const addMsg = useChatStore.getState().addMessage;
    const updateLast = useChatListStore.getState().updateRoomLastMessage;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      console.log("📩 WS 메시지 수신:", m);

      const normalized = normalizeRestMessage(m);
      addMsg(roomId, normalized);

      // ✅ 직접 스크롤 (scrollToBottom 의존성 제거)
      scrollToBottomUtil(flatRef);

      updateLast(
        roomId,
        normalized.content,
        normalized.createdAt,
        true // 방 안에 있으니까 읽은 상태
      );
    });

    return () => {
      unsub?.();
    };
  }, [roomId]); // ✅ scrollToBottom 제거!

  // ✅ onSend에서도 scrollToBottom 의존성 제거
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

    // ✅ 직접 스크롤
    scrollToBottomUtil(flatRef);

    try {
      if (sendChatMessageRaw) {
        await sendCompat(roomId, myId, t);
      }
      await syncMessages();
    } catch {
      Alert.alert("전송 실패", "메시지를 보낼 수 없어요.");
    }
  }, [text, myId, roomId, syncMessages, addMessage, updateRoomLastMessage]); // ✅ scrollToBottom 제거!

  // 프로필 클릭
  const handlePressAvatar = async (senderId: number) => {
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
  };

  // 리스트 렌더링
  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageResponse; index: number }) => {
      const mine = myId != null && item.senderId === myId;

      // 🔹 날짜 구분자: 이전 메시지와 날짜가 다를 때만
      let showDateSeparator = false;
      if (index === 0) {
        showDateSeparator = true;
      } else {
        const prevMsg = messages[index - 1];
        if (prevMsg && !isSameDay(item.createdAt, prevMsg.createdAt)) {
          showDateSeparator = true;
        }
      }

      // 🔹 시간 표시: 이전 메시지와 1분 이상 차이날 때만
      let showTimeLabel = false;
      if (index === 0) {
        showTimeLabel = true;
      } else {
        const prevMsg = messages[index - 1];
        if (prevMsg) {
          const curTime = new Date(item.createdAt).getTime();
          const prevTime = new Date(prevMsg.createdAt).getTime();
          if (!Number.isNaN(curTime) && !Number.isNaN(prevTime)) {
            if (curTime - prevTime >= 60 * 1000) {
              showTimeLabel = true;
            }
          }
        }
      }

      // ✅ 클라이언트 전용 포맷팅 (Hydration 에러 방지)
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
            {!mine && (
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
            )}

            <View style={chatRoomStyles.bubbleLine}>
              {mine && showTimeLabel && mounted && (
                <Text
                  style={[
                    chatRoomStyles.timeBeside,
                    chatRoomStyles.timeBesideMine,
                  ]}
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
                {!mine && item.senderName ? (
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

              {!mine && showTimeLabel && mounted && (
                <Text
                  style={[
                    chatRoomStyles.timeBeside,
                    chatRoomStyles.timeBesideOther,
                  ]}
                >
                  {timeLabel}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    },
    [myId, messages, mounted]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
      {/* 헤더 */}
      <View style={chatRoomStyles.header}>
        <Pressable
          onPress={() => router.back()}
          style={chatRoomStyles.headerBtn}
        >
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

      {/* 채팅 목록 */}
      {initialLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.messageId)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          onContentSizeChange={() => scrollToBottomUtil(flatRef)}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
        />
      )}

      {/* 입력창 */}
      <View style={chatRoomStyles.inputBar}>
        <Pressable style={chatRoomStyles.circleBtn}>
          <Ionicons name="add" size={20} color="#444" />
        </Pressable>
        <Pressable style={chatRoomStyles.circleBtn}>
          <Ionicons name="happy-outline" size={20} color="#444" />
        </Pressable>
        <View style={chatRoomStyles.inputWrap}>
          <TextInput
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

      {/* 친구 프로필 모달 */}
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
