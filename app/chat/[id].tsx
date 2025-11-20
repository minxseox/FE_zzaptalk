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
  useRootNavigationState,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ✅ Zustand Store Import
import { useChatStore } from "../../src/store/chatStore";

import { getChatMessages, getChatRoomList } from "../../src/services/chat";
import type { ChatMessageResponse } from "../../src/types/chat";

import { loadTokenWithExpiry } from "../../src/lib/authStorage";
import { parseJwt } from "../../src/lib/jwt";

// 🛠️ [유틸] 두 날짜가 같은 날인지 비교
function isSameDay(d1: string, d2: string) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// --- 소켓 모듈 로딩 (전송/구독용) ---
let sendChatMessageRaw:
  | undefined
  | ((roomId: number, content: string) => Promise<any>)
  | ((roomId: number, senderId: number, content: string) => Promise<any>);
let subscribeRoom:
  | undefined
  | ((roomId: number, cb: (m: ChatMessageResponse) => void) => () => void);

try {
  const mod = require("../../src/services/socket");
  sendChatMessageRaw = mod.sendChatMessage;
  subscribeRoom = mod.subscribeRoom;
} catch {}

// --- 유틸 ---
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
    return (sendChatMessageRaw as (r: number, c: string) => Promise<any>)(
      roomId,
      content
    );
  }
  return (
    sendChatMessageRaw as (r: number, s: number, c: string) => Promise<any>
  )(roomId, myId, content);
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

  // ✅ Store 사용
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  const [text, setText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);

  const flatRef = useRef<FlatList<ChatMessageResponse>>(null);
  const lastRedirectRef = useRef<Href | null>(null);

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

  const initialLoad = useCallback(async () => {
    try {
      try {
        await getChatRoomList();
      } catch (e: any) {
        const st = e?.status ?? e?.response?.status;
        if (st === 401) return redirectOnce("/login" as Href);
      }

      const data = await getChatMessages(roomId);
      const sorted = [...data].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );

      setMessages(sorted);
      scrollToBottom();
    } catch (e: any) {
      const st = e?.status ?? e?.response?.status;
      if (st === 401) return redirectOnce("/login" as Href);
      if (st === 403) {
        Alert.alert("접근 불가", "이 방의 메시지를 볼 권한이 없어요.");
        return redirectOnce("/chatlist" as Href);
      }
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
      const st = e?.status ?? e?.response?.status;
      if (st === 401) {
        redirectOnce("/login" as Href);
        return;
      }
      Alert.alert("동기화 실패", e?.message || "메시지를 갱신하지 못했어요.");
    } finally {
      setSyncing(false);
    }
  }, [roomId, scrollToBottom, redirectOnce, setMessages]);

  useEffect(() => {
    if (!navReady) return;
    initialLoad();
  }, [navReady, initialLoad]);

  if (!navReady) return null;
  if (!Number.isFinite(roomId)) return <Redirect href={"/chatlist" as Href} />;

  // ✅ 소켓 구독 (Global Socket 활용)
  useEffect(() => {
    if (!subscribeRoom) return;
    const unsub = subscribeRoom(roomId, (m) => {
      addMessage(m);
      scrollToBottom();
    });
    return () => {
      unsub?.();
    };
  }, [roomId, addMessage, scrollToBottom]);

  // 메시지 전송
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
    setText("");
    scrollToBottom();

    try {
      if (sendChatMessageRaw) {
        await sendCompat(roomId, myId, t);
      }
      await syncMessages();
    } catch {
      const currentMsgs = useChatStore.getState().messages;
      setMessages(
        currentMsgs.filter((m) => m.messageId !== optimistic.messageId)
      );
      Alert.alert("전송 실패", "메시지를 보낼 수 없어요.");
    }
  }, [
    text,
    myId,
    roomId,
    scrollToBottom,
    syncMessages,
    addMessage,
    setMessages,
  ]);

  // 🎨 Render Item (날짜 구분선 로직 포함)
  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageResponse; index: number }) => {
      const mine = myId != null && item.senderId === myId;

      // --- 날짜 구분선 판단 ---
      let showDateSeparator = false;
      if (index === 0) {
        showDateSeparator = true;
      } else {
        const prevMsg = messages[index - 1];
        // 이전 메시지와 날짜가 다르면 구분선 표시
        if (prevMsg && !isSameDay(item.createdAt, prevMsg.createdAt)) {
          showDateSeparator = true;
        }
      }

      // 날짜 포맷 (예: 2025년 11월 20일 목요일)
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
          {/* 📅 날짜 구분선 렌더링 */}
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{dateText}</Text>
            </View>
          )}

          {/* 메시지 말풍선 */}
          <View
            style={[
              styles.msgRow,
              mine ? styles.msgRowMine : styles.msgRowOther,
            ]}
          >
            {!mine && <View style={{ width: 34, marginRight: 8 }} />}

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
    [myId, messages] // messages가 바뀌면 인덱스 비교 다시 해야 함
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 52, android: 0, web: 0 })}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <Text style={styles.headerTitle}>{headerTitle}</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => {}} style={styles.headerBtn}>
            <Ionicons name="search" size={20} color="#111" />
          </Pressable>
          <Pressable onPress={() => {}} style={styles.headerBtn}>
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
          onContentSizeChange={scrollToBottom}
          onScrollBeginDrag={() => Platform.OS !== "web" && Keyboard.dismiss()}
        />
      )}

      <View style={styles.inputBar}>
        <Pressable style={styles.circleBtn} onPress={() => {}}>
          <Ionicons name="add" size={20} color="#444" />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={() => {}}>
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
    </KeyboardAvoidingView>
  );
}

const PURPLE = "#9997FF";

const styles = StyleSheet.create({
  // --- Header ---
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  // --- Date Separator ---
  dateSeparator: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  // --- Message Row & Bubble ---
  msgRow: { flexDirection: "row", marginVertical: 6, paddingHorizontal: 6 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },

  bubbleLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "88%",
  },

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

  timeBeside: {
    fontSize: 11,
    color: "#8E8E8E",
    alignSelf: "flex-end",
  },
  timeBesideMine: {
    textAlign: "left",
    marginRight: 4,
    marginLeft: 0,
  },
  timeBesideOther: {
    textAlign: "right",
    marginLeft: 4,
    marginRight: 0,
  },

  // --- Input Bar ---
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
