// app/(tabs)/chatlist/index.tsx
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter, type Href, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ✅ Store Import
import { useChatListStore } from "../../../src/store/chatListStore";

import {
  getChatRoomList,
  createOrGetSingleChatRoom,
} from "../../../src/services/chat";
import type { ChatRoomUserListItem } from "../../../src/types/chat";
import { ApiError } from "../../../src/lib/api";
import styles from "../../../src/styles/chat/ChatList.module";

export default function ChatListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ rooms + setRoomsFromServer 사용
  const rooms = useChatListStore((state) => state.rooms);
  const setRoomsFromServer = useChatListStore(
    (state) => state.setRoomsFromServer
  );

  // 모달 관련 상태
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<"single" | "group">("single");
  const [partnerId, setPartnerId] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ 서버에서 목록 가져오기 + 기존 메타 유지
  const fetchRooms = async (isRefresh = false) => {
    if (!isRefresh && rooms.length === 0) setLoading(true);
    try {
      const data = await getChatRoomList();
      setRoomsFromServer(data); // 🔥 여기!
    } catch (e) {
      console.error("[ChatList] 채팅방 목록 조회 실패:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 화면 포커스 시 갱신
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [])
  );

  // 당겨서 새로고침
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms(true);
  }, []);

  const goRoom = useCallback(
    (roomId: number, roomName?: string) => {
      router.push({
        pathname: `/chat/${roomId}`,
        params: roomName ? { title: roomName } : {},
      } as Href);
    },
    [router]
  );

  const onCreateSingle = useCallback(async () => {
    const trimmed = partnerId.trim();
    if (!trimmed) {
      Alert.alert("알림", "상대 사용자 ID를 입력해 주세요.");
      return;
    }

    const idNum = Number(trimmed);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      Alert.alert("알림", "상대 사용자 ID는 숫자만 입력해 주세요.");
      return;
    }

    try {
      setCreating(true);
      const room = await createOrGetSingleChatRoom(idNum);

      const r = room as any;
      const roomId = r.roomId ?? r.id;
      const roomName = r.roomName ?? r.title ?? r.name ?? "채팅방";

      if (!roomId) {
        Alert.alert("오류", "생성된 채팅방 ID를 찾을 수 없어요.");
        return;
      }

      setShowCreate(false);
      setPartnerId("");
      await fetchRooms();
      goRoom(roomId, roomName);
    } catch (err: any) {
      console.error("[ChatList] 1:1 채팅방 생성 실패:", err);
      if (err instanceof ApiError) {
        Alert.alert("오류", err.message || "다시 시도해 주세요.");
      } else {
        Alert.alert("네트워크 오류", "잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setCreating(false);
    }
  }, [partnerId, goRoom]);

  return (
    <View style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>채팅</Text>
        </View>

        <View style={styles.headerLeft} />

        <View style={styles.headerRight}>
          <Pressable style={styles.headerIconBtn}>
            <Ionicons name="search" size={20} style={styles.headerIcon} />
          </Pressable>

          <Pressable
            style={styles.headerPlusBtn}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={18} style={styles.headerPlusIcon} />
          </Pressable>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#9997FF" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.roomId)}
          contentContainerStyle={[
            styles.roomList,
            rooms.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: 100,
              }}
            >
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={{ marginTop: 12, color: "#999", fontSize: 15 }}>
                참여 중인 채팅방이 없어요.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.roomRow}
              onPress={() => goRoom(item.roomId, item.roomName)}
            >
              <View style={styles.roomAvatar}>
                <Text style={styles.roomAvatarInitial}>
                  {item.roomName?.charAt(0) ?? "?"}
                </Text>
              </View>

              <View style={{ flex: 1, justifyContent: "center" }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <Text style={styles.roomName} numberOfLines={1}>
                    {item.roomName || "알 수 없는 채팅방"}
                  </Text>
                  {/* 필요하면 오른쪽에 시간도 나중에 추가 가능 */}
                </View>

                {/* 🔥 마지막 메시지 프리뷰 */}
                <Text style={{ fontSize: 13, color: "#888" }} numberOfLines={1}>
                  {(item as any).lastMessage || "대화 내용이 없습니다."}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* 아래 모달 부분은 그대로 유지 */}
      {/* ... (생략, 기존 코드 그대로 두면 됨) */}
    </View>
  );
}
