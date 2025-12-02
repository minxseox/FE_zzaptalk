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

import { useChatListStore } from "../../../src/store/chatListStore";
import {
  getChatRoomList,
  createOrGetSingleChatRoom,
} from "../../../src/services/chat";
import { ApiError } from "../../../src/lib/api";
import styles from "../../../src/styles/chat/ChatList.module";

// ✅ [수정] 정렬을 위해 시간 관련 필드 타입을 명시했습니다.
interface ChatRoomItem {
  roomId: number;
  roomName: string;
  lastMessage?: string;
  lastMessageAt?: string; // 마지막 메시지 시간
  createdAt?: string; // 생성 시간
  [key: string]: any; // 다른 필드 허용
}

export default function ChatListScreen() {
  const router = useRouter();

  // Zustand: Hook 패턴으로 상태와 액션 구독
  const rooms = useChatListStore((state) => state.rooms);
  const setRoomsFromServer = useChatListStore(
    (state) => state.setRoomsFromServer
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 모달 상태
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<"single" | "group">("single");
  const [partnerId, setPartnerId] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ [수정] 데이터를 받아온 후 최신순으로 정렬하는 로직 추가
  const fetchRooms = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);

        // 1. 서버에서 목록 가져오기
        const data = await getChatRoomList();

        // 2. 최신순 정렬 (마지막 메시지 시간 > 생성 시간 순)
        const sortedData = data.sort((a: any, b: any) => {
          // 비교할 시간값 추출 (없으면 0 처리)
          const timeA = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageAt || b.createdAt || 0).getTime();

          // 내림차순 정렬 (큰 값이 먼저 = 최신이 위로)
          return timeB - timeA;
        });

        // 3. 정렬된 데이터를 스토어에 저장
        setRoomsFromServer(sortedData);
      } catch (e) {
        console.error("[ChatList] 채팅방 목록 조회 실패:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setRoomsFromServer]
  );

  // 포커스 시 갱신
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms(true);
  }, [fetchRooms]);

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

      // 타입 안전하게 처리
      const r = room as ChatRoomItem;
      const roomId = r.roomId;
      const roomName = r.roomName || "채팅방";

      if (!roomId) {
        Alert.alert("오류", "생성된 채팅방 ID를 찾을 수 없어요.");
        return;
      }

      setShowCreate(false);
      setPartnerId("");

      // 방 생성 후 목록 갱신 및 이동
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
  }, [partnerId, goRoom, fetchRooms]);

  return (
    <View style={styles.safeArea}>
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
              <Text style={styles.emptyText}>참여 중인 채팅방이 없어요.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const roomItem = item as ChatRoomItem;
            return (
              <Pressable
                style={styles.roomRow}
                onPress={() => goRoom(roomItem.roomId, roomItem.roomName)}
              >
                <View style={styles.roomAvatar}>
                  <Text style={styles.roomAvatarInitial}>
                    {roomItem.roomName?.charAt(0) ?? "?"}
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
                      {roomItem.roomName || "알 수 없는 채팅방"}
                    </Text>
                  </View>

                  <Text
                    style={{ fontSize: 13, color: "#888" }}
                    numberOfLines={1}
                  >
                    {roomItem.lastMessage || "대화 내용이 없습니다."}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* 채팅방 생성 모달 */}
      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.sheetBackdropTouchable}
            onPress={() => setShowCreate(false)}
          />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetTabRow}>
              <Pressable
                style={[
                  styles.sheetTab,
                  createTab === "single" && styles.sheetTabActive,
                ]}
                onPress={() => setCreateTab("single")}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    createTab === "single" && styles.sheetTabTextActive,
                  ]}
                >
                  개인 채팅
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sheetTab,
                  createTab === "group" && styles.sheetTabActive,
                ]}
                onPress={() => setCreateTab("group")}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    createTab === "group" && styles.sheetTabTextActive,
                  ]}
                >
                  단체 채팅
                </Text>
              </Pressable>
            </View>

            {createTab === "single" && (
              <View style={styles.sheetBody}>
                <Text style={styles.sheetLabel}>상대 사용자 ID</Text>
                <View style={styles.sheetInputWrap}>
                  <TextInput
                    style={styles.sheetInput}
                    value={partnerId}
                    placeholder="예) 1"
                    onChangeText={setPartnerId}
                    keyboardType="numeric"
                  />
                </View>
                <Pressable
                  style={styles.sheetPrimaryBtn}
                  onPress={onCreateSingle}
                  disabled={creating}
                >
                  <Text style={styles.sheetPrimaryBtnText}>
                    {creating ? "생성 중..." : "개인 채팅 만들기"}
                  </Text>
                </Pressable>
              </View>
            )}

            {createTab === "group" && (
              <View style={styles.sheetBody}>
                <Text style={styles.sheetLabel}>.</Text>
                <Pressable
                  style={styles.sheetPrimaryBtn}
                  onPress={() =>
                    Alert.alert("알림", "단체 채팅 기능은 준비 중입니다.")
                  }
                >
                  <Text style={styles.sheetPrimaryBtnText}>
                    단체 채팅 만들기
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
