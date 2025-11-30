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

import {
  chatRoomStyles,
  chatRoomModalStyles,
} from "../../src/styles/chat/ChatRoom.module";

import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";

import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

import { fetchFriendProfile } from "../../src/services/profile";

let sendChatMessageRaw: any;
let subscribeRoom: any;
try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch {}

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
  if (typeof window === "undefined") {
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

function normalizeRestMessage(m: ChatMessageResponse): ChatMessageResponse {
  return {
    ...m,
    createdAt: toIsoSafe((m as any).createdAt),
    sentAt: toIsoSafe((m as any).sentAt ?? (m as any).createdAt),
  };
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
  if (sendChatMessageRaw.length === 2) {
    return sendChatMessageRaw(roomId, content);
  }
  return sendChatMessageRaw(roomId, myId, content);
}

function scrollToBottomUtil(flatRef: React.RefObject<any>) {
  requestAnimationFrame(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  });
}

export default function ChatRoomScreen() {
  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();
  const roomId = Number(id);
  const isValidRoom = Number.isFinite(roomId);

  const router = useRouter();
  const rootNav = useRootNavigationState();
  const navReady = !!rootNav?.key;

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : "채팅";

  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const messages = useChatStore((state) =>
    isValidRoom ? state.messagesByRoom[roomId] ?? [] : []
  );
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (state) => state.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((state) => state.resetUnreadCount);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  const flatRef = useRef<any>(null);
  const lastRedirectRef = useRef<Href | null>(null);
  const inputRef = useRef<TextInput>(null);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ 모든 Hook은 조건부 return 전에 위치!

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      setMyId(await getMyId());
    })();
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

  // ✅ 초기 로딩
  useEffect(() => {
    if (!navReady || !isValidRoom) return;

    let cancelled = false;

    const load = async () => {
      try {
        try {
          await getChatRoomList();
        } catch (e: any) {
          if (e?.status === 401) {
            redirectOnce("/login" as Href);
            return;
          }
        }

        const data = await getChatMessages(roomId);
        if (cancelled) return;

        const normalized = data.map(normalizeRestMessage);
        const sorted = [...normalized].sort(
          (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
        );

        useChatStore.getState().setMessages(roomId, sorted);

        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          useChatListStore
            .getState()
            .updateRoomLastMessage(roomId, last.content, last.createdAt, true);
        }

        scrollToBottomUtil(flatRef);
      } catch (e: any) {
        if (e?.status === 401) {
          redirectOnce("/login" as Href);
          return;
        }
        Alert.alert("오류", e?.message || "불러오기 실패");
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    load();
    useChatListStore.getState().resetUnreadCount(roomId);

    return () => {
      cancelled = true;
    };
  }, [navReady, isValidRoom, roomId, redirectOnce]);

  // ✅ 소켓 구독
  useEffect(() => {
    if (!subscribeRoom || !isValidRoom) return;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      console.log("📩 WS 메시지 수신:", m);

      const normalized = normalizeRestMessage(m);
      useChatStore.getState().addMessage(roomId, normalized);
      scrollToBottomUtil(flatRef);

      useChatListStore
        .getState()
        .updateRoomLastMessage(
          roomId,
          normalized.content,
          normalized.createdAt,
          true
        );
    });

    return () => {
      unsub?.();
    };
  }, [roomId, isValidRoom]);

  const syncMessages = useCallback(async () => {
    if (!isValidRoom) return;

    setSyncing(true);
    try {
      const data = await getChatMessages(roomId);
      const normalized = data.map(normalizeRestMessage);
      const sorted = [...normalized].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );

      useChatStore.getState().setMessages(roomId, sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        useChatListStore
          .getState()
          .updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }

      scrollToBottomUtil(flatRef);
    } catch (e: any) {
      if (e?.status === 401) {
        redirectOnce("/login" as Href);
      }
    } finally {
      setSyncing(false);
    }
  }, [roomId, isValidRoom, redirectOnce]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !myId || !isValidRoom) return;

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

    useChatStore.getState().addMessage(roomId, optimistic);
    useChatListStore.getState().updateRoomLastMessage(roomId, t, nowIso, true);
    setText("");

    scrollToBottomUtil(flatRef);

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
  }, [text, myId, roomId, isValidRoom, syncMessages]);

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
      const showDateSeparator = index === 0;
      const showTimeLabel = index === 0;

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
    [myId, mounted, handlePressAvatar]
  );

  // ✅ 조건부 return은 모든 Hook 선언 후에!
  if (!navReady) return null;
  if (!isValidRoom) return <Redirect href={"/chatlist" as Href} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
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
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
          extraData={mounted}
        />
      )}

      <View style={chatRoomStyles.inputBar}>
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
