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
  StyleSheet,
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

// ✅ Zustand Store
import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";

import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

// ✅ [API] 친구 프로필 조회 (GET /api/v1/friends/{friendId}/profile)
import { fetchFriendProfile } from "../../src/services/profile";

// 날짜 비교 유틸
function isSameDay(d1: string, d2: string) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// 소켓 모듈 로딩 (안전 처리)
let sendChatMessageRaw: any;
let subscribeRoom: any;
try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch {}

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
  if (sendChatMessageRaw.length === 2) {
    return sendChatMessageRaw(roomId, content);
  }
  return sendChatMessageRaw(roomId, myId, content);
}

export default function ChatRoomScreen() {
  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();
  const roomId = Number(id);

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : "채팅";

  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Store
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (state) => state.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((state) => state.resetUnreadCount);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  const flatRef = useRef<FlatList<ChatMessageResponse>>(null);
  const lastRedirectRef = useRef<Href | null>(null);

  // ✅ [추가] 친구 프로필 모달 상태
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

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    (async () => {
      setMyId(await getMyId());
    })();
  }, []);

  // 채팅방 초기 로딩
  const initialLoad = useCallback(async () => {
    try {
      try {
        await getChatRoomList();
      } catch (e: any) {
        if (e?.status === 401) return redirectOnce("/login" as Href);
      }

      const data = await getChatMessages(roomId);
      const sorted = [...data].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );

      setMessages(sorted);
      scrollToBottom();
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
      Alert.alert("오류", e?.message || "불러오기 실패");
    } finally {
      setInitialLoading(false);
    }
  }, [roomId, redirectOnce, scrollToBottom, setMessages]);

  const syncMessages = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await getChatMessages(roomId);
      const sorted = [...data].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
      setMessages(sorted);
      scrollToBottom();
    } catch (e: any) {
      if (e?.status === 401) return redirectOnce("/login" as Href);
    } finally {
      setSyncing(false);
    }
  }, [roomId, scrollToBottom, redirectOnce, setMessages]);

  useEffect(() => {
    if (!navReady) return;
    initialLoad();
    resetUnreadCount(roomId);
  }, [navReady, initialLoad, roomId, resetUnreadCount]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  // 소켓 구독
  useEffect(() => {
    if (!subscribeRoom) return;
    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      addMessage(m);
      scrollToBottom();
      updateRoomLastMessage(roomId, m.content, m.createdAt, true);
    });
    return () => {
      unsub?.();
    };
  }, [roomId, addMessage, scrollToBottom, updateRoomLastMessage]);

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

    addMessage(optimistic);
    updateRoomLastMessage(roomId, t, nowIso, true);
    setText("");
    scrollToBottom();

    try {
      if (sendChatMessageRaw) {
        await sendCompat(roomId, myId, t);
      }
      await syncMessages();
    } catch {
      Alert.alert("전송 실패", "메시지를 보낼 수 없어요.");
    }
  }, [
    text,
    myId,
    roomId,
    scrollToBottom,
    syncMessages,
    addMessage,
    updateRoomLastMessage,
  ]);

  // ✅ [API] 친구 프로필 클릭 핸들러
  const handlePressAvatar = async (senderId: number) => {
    if (senderId === myId) return; // 내 프로필은 무시 (또는 내 프로필로 이동)

    setProfileLoading(true);
    setProfileModalVisible(true);
    try {
      // GET /api/v1/friends/{friendId}/profile
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

  // 렌더 아이템
  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageResponse; index: number }) => {
      const mine = myId != null && item.senderId === myId;

      let showDateSeparator = false;
      if (index === 0) showDateSeparator = true;
      else {
        const prevMsg = messages[index - 1];
        if (prevMsg && !isSameDay(item.createdAt, prevMsg.createdAt)) {
          showDateSeparator = true;
        }
      }

      const dateText = new Date(item.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      const timeLabel = new Date(item.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <View>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{dateText}</Text>
            </View>
          )}

          <View
            style={[
              styles.msgRow,
              mine ? styles.msgRowMine : styles.msgRowOther,
            ]}
          >
            {!mine && (
              // ✅ [수정] 상대방 아바타 영역 (클릭 시 프로필 조회)
              <Pressable
                style={styles.avatarContainer}
                onPress={() => handlePressAvatar(item.senderId)}
              >
                {/* 실제 이미지가 있으면 Image, 없으면 아이콘 */}
                {/* 메시지 객체에 profileUrl이 있다면 사용, 없으면 기본 아이콘 */}
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {item.senderName?.charAt(0) ?? "?"}
                  </Text>
                </View>
              </Pressable>
            )}

            <View style={styles.bubbleLine}>
              {mine && (
                <Text style={[styles.timeBeside, styles.timeBesideMine]}>
                  {timeLabel}
                </Text>
              )}

              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                {!mine && item.senderName ? (
                  // 이름 클릭 시에도 프로필 조회 가능하게 할 수 있음
                  <Text style={styles.senderName}>{item.senderName}</Text>
                ) : null}
                <Text style={mine ? styles.msgTextMine : styles.msgTextOther}>
                  {item.content}
                </Text>
              </View>

              {!mine && (
                <Text style={[styles.timeBeside, styles.timeBesideOther]}>
                  {timeLabel}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    },
    [myId, messages]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable style={styles.headerBtn}>
            <Ionicons name="search" size={20} color="#111" />
          </Pressable>
          <Pressable style={styles.headerBtn}>
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
          onContentSizeChange={scrollToBottom}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
        />
      )}

      {/* 입력창 */}
      <View style={styles.inputBar}>
        <Pressable style={styles.circleBtn}>
          <Ionicons name="add" size={20} color="#444" />
        </Pressable>
        <Pressable style={styles.circleBtn}>
          <Ionicons name="happy-outline" size={20} color="#444" />
        </Pressable>
        <View style={styles.inputWrap}>
          <TextInput
            placeholder="메세지 입력"
            value={text}
            onChangeText={setText}
            style={styles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <Pressable
            style={[
              styles.sendFab,
              !text.trim() && { backgroundColor: "#D8D8E8" },
            ]}
            onPress={onSend}
            disabled={!text.trim()}
          >
            <Ionicons name="paper-plane" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ✅ [추가] 친구 프로필 모달 */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setProfileModalVisible(false)}>
          <View style={modalStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={modalStyles.card}>
                {profileLoading ? (
                  <ActivityIndicator size="large" color="#7C73FF" />
                ) : (
                  selectedProfile && (
                    <>
                      {/* 배경 */}
                      <View style={modalStyles.bgContainer}>
                        {selectedProfile.backgroundPhotoUrl ? (
                          <Image
                            source={{ uri: selectedProfile.backgroundPhotoUrl }}
                            style={modalStyles.bgImage}
                          />
                        ) : (
                          <View
                            style={[
                              modalStyles.bgImage,
                              { backgroundColor: "#eee" },
                            ]}
                          />
                        )}
                        <Pressable
                          style={modalStyles.closeBtn}
                          onPress={() => setProfileModalVisible(false)}
                        >
                          <Ionicons name="close" size={20} color="#333" />
                        </Pressable>
                      </View>

                      {/* 프로필 정보 */}
                      <View style={modalStyles.infoContainer}>
                        <View style={modalStyles.avatarContainer}>
                          {selectedProfile.profilePhotoUrl ? (
                            <Image
                              source={{ uri: selectedProfile.profilePhotoUrl }}
                              style={modalStyles.avatar}
                            />
                          ) : (
                            <View
                              style={[
                                modalStyles.avatar,
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
                        <Text style={modalStyles.name}>
                          {selectedProfile.nickname ||
                            selectedProfile.name ||
                            "이름 없음"}
                        </Text>
                        <Text style={modalStyles.status}>
                          {selectedProfile.statusMessage || ""}
                        </Text>
                      </View>

                      {/* 하단 버튼 (예: 1:1 채팅, 통화 등) */}
                      <View style={modalStyles.actionRow}>
                        <View style={modalStyles.actionItem}>
                          <Ionicons name="chatbubble" size={20} color="#fff" />
                          <Text style={modalStyles.actionText}>1:1 채팅</Text>
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

const PURPLE = "#9997FF";

const styles = StyleSheet.create({
  // 기존 스타일 유지
  header: {
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  dateSeparator: { alignItems: "center", marginVertical: 16 },
  dateSeparatorText: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  msgRow: { flexDirection: "row", marginVertical: 6, paddingHorizontal: 6 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },

  // ✅ [수정] 아바타 스타일
  avatarContainer: { marginRight: 8, alignSelf: "flex-start" },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 14, color: "#666", fontWeight: "600" },

  bubbleLine: { flexDirection: "row", alignItems: "flex-end", maxWidth: "88%" },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "100%",
  },
  bubbleMine: { backgroundColor: PURPLE, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: "#EFEFEF", borderBottomLeftRadius: 6 },
  senderName: { fontSize: 12, color: "#666", marginBottom: 4 },
  msgTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  msgTextOther: { color: "#111", fontSize: 15, lineHeight: 21 },
  timeBeside: { fontSize: 11, color: "#8E8E8E", alignSelf: "flex-end" },
  timeBesideMine: { textAlign: "left", marginRight: 4, marginLeft: 0 },
  timeBesideOther: { textAlign: "right", marginLeft: 4, marginRight: 0 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E9E9EC",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F3F3F7",
    borderRadius: 22,
    minHeight: 44,
    justifyContent: "center",
  },
  input: {
    paddingLeft: 14,
    paddingRight: 54,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    maxHeight: 120,
  },
  sendFab: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ✅ [추가] 모달용 스타일
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 300,
    height: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  bgContainer: { height: 120, width: "100%", position: "relative" },
  bgImage: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: { flex: 1, alignItems: "center", marginTop: -40 },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    backgroundColor: "#fff",
    marginBottom: 10,
    elevation: 2,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 40 },
  name: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 4 },
  status: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  actionRow: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
  },
  actionItem: {
    flex: 1,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
