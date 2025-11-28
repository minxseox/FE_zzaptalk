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
} from "react-native";
import {
  Redirect,
  type Href,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useChatStore } from "../../src/store/chatStore";
import { useChatListStore } from "../../src/store/chatListStore";
import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

// 소켓 (SSR 방지용 require)
let sendChatMessageRaw: any;
let subscribeRoom: any;
try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch {}

/* 날짜 유틸 */
function isSameDay(d1: string, d2: string) {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

const PURPLE = "#9997FF";

export default function ChatRoomScreen() {
  const { id, title } = useLocalSearchParams<{ id?: string; title?: string }>();
  const roomId = Number(id);

  const router = useRouter();

  const headerTitle =
    typeof title === "string" && title.length > 0 ? title : `채팅방 ${id}`;

  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [text, setText] = useState("");

  const messages = useChatStore((s) => s.messagesByRoom[roomId] ?? []);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const updateRoomLastMessage = useChatListStore(
    (s) => s.updateRoomLastMessage
  );
  const resetUnreadCount = useChatListStore((s) => s.resetUnreadCount);

  const flatRef = useRef<FlatList<ChatMessageResponse>>(null);

  useEffect(() => {
    // 내 ID 가져오기
    (async () => {
      const id = await getMyId();
      setMyId(id);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const initialLoad = useCallback(async () => {
    if (!Number.isFinite(roomId)) return;
    try {
      // 방 목록 가져와서 401 체크
      try {
        await getChatRoomList();
      } catch (e: any) {
        if (e?.status === 401) {
          router.replace("/login" as Href);
          return;
        }
      }

      const data = await getChatMessages(roomId);
      const normalized = data.map(normalizeRestMessage);
      const sorted = [...normalized].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );

      setMessages(roomId, sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }

      scrollToBottom();
    } catch (e: any) {
      if (e?.status === 401) {
        router.replace("/login" as Href);
        return;
      }
      console.error("[ChatRoom] initialLoad error:", e);
      Alert.alert("오류", e?.message || "채팅을 불러올 수 없어요.");
    } finally {
      setInitialLoading(false);
    }
  }, [roomId, router, setMessages, updateRoomLastMessage, scrollToBottom]);

  const syncMessages = useCallback(async () => {
    if (!Number.isFinite(roomId)) return;
    setSyncing(true);
    try {
      const data = await getChatMessages(roomId);
      const normalized = data.map(normalizeRestMessage);
      const sorted = [...normalized].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
      setMessages(roomId, sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        updateRoomLastMessage(roomId, last.content, last.createdAt, true);
      }

      scrollToBottom();
    } catch (e: any) {
      if (e?.status === 401) {
        router.replace("/login" as Href);
      }
    } finally {
      setSyncing(false);
    }
  }, [roomId, router, setMessages, updateRoomLastMessage, scrollToBottom]);

  useEffect(() => {
    if (!Number.isFinite(roomId)) return;
    initialLoad();
    resetUnreadCount(roomId);
  }, [roomId, initialLoad, resetUnreadCount]);

  if (!Number.isFinite(roomId)) {
    return <Redirect href={"/chatlist" as Href} />;
  }

  // 소켓 구독
  useEffect(() => {
    if (!subscribeRoom) return;
    if (!Number.isFinite(roomId)) return;

    const unsub = subscribeRoom(roomId, (m: ChatMessageResponse) => {
      const normalized = normalizeRestMessage(m);
      addMessage(roomId, normalized);
      scrollToBottom();
      updateRoomLastMessage(
        roomId,
        normalized.content,
        normalized.createdAt,
        true
      );
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

    addMessage(roomId, optimistic);
    updateRoomLastMessage(roomId, t, nowIso, true);
    setText("");
    scrollToBottom();

    try {
      if (sendChatMessageRaw) {
        await sendCompat(roomId, myId, t);
      }
      await syncMessages();
    } catch (e) {
      console.error("[ChatRoom] send error:", e);
      Alert.alert("전송 실패", "메시지를 보낼 수 없어요.");
    }
  }, [
    text,
    myId,
    roomId,
    addMessage,
    updateRoomLastMessage,
    scrollToBottom,
    syncMessages,
  ]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageResponse; index: number }) => {
      const mine = myId != null && item.senderId === myId;

      let showDateSeparator = false;
      if (index === 0) {
        showDateSeparator = true;
      } else {
        const prev = messages[index - 1];
        if (prev && !isSameDay(item.createdAt, prev.createdAt)) {
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
            <View style={styles.bubbleLine}>
              {!mine && (
                <Text style={[styles.timeBeside, styles.timeBesideOther]}>
                  {timeLabel}
                </Text>
              )}

              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                <Text style={mine ? styles.msgTextMine : styles.msgTextOther}>
                  {item.content}
                </Text>
              </View>

              {mine && (
                <Text style={[styles.timeBeside, styles.timeBesideMine]}>
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
        <View style={{ width: 40 }} />
      </View>

      {/* 메시지 리스트 */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
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

  bubbleLine: { flexDirection: "row", alignItems: "flex-end", maxWidth: "88%" },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "100%",
  },
  bubbleMine: { backgroundColor: PURPLE, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: "#EFEFEF", borderBottomLeftRadius: 6 },
  msgTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  msgTextOther: { color: "#111", fontSize: 15, lineHeight: 21 },

  timeBeside: { fontSize: 11, color: "#8E8E8E", alignSelf: "flex-end" },
  timeBesideMine: { textAlign: "left", marginRight: 4, marginLeft: 0 },
  timeBesideOther: { textAlign: "right", marginLeft: 4, marginRight: 0 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E9E9EC",
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
