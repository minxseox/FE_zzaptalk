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

// ✅ [수정 1] 정렬 및 데이터 표시를 위한 타입 정의 보완
interface ChatRoomItem {
  roomId: number;
  roomName: string;
  lastMessage?: string; // 마지막 대화 내용
  lastMessageAt?: string; // 마지막 대화 시간
  createdAt?: string; // 생성 시간
  [key: string]: any;
}

export default function ChatListScreen() {
  const router = useRouter();

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

  // ✅ [수정 2] 정렬 로직 변경: "단순 입장/생성"이 아닌 "실제 대화 시간" 기준 정렬
  const fetchRooms = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);

        const data = await getChatRoomList();

        // 정렬 로직:
        // 1순위: 마지막 메시지가 있는 방이 무조건 위로 (lastMessageAt 기준 내림차순)
        // 2순위: 둘 다 메시지가 없으면 생성일(createdAt) 기준
        const sortedData = data.sort((a: any, b: any) => {
          // 메시지 시간 (없으면 0으로 취급하여 맨 뒤로 보냄)
          const timeA = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const timeB = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;

          // 1. 둘 중 하나라도 메시지가 있거나 시간이 다르면 메시지 시간 역순 정렬
          if (timeA !== timeB) {
            return timeB - timeA; // 최신 메시지가 위로 (큰 값이 먼저)
          }

          // 2. 둘 다 메시지가 없는 경우(0)에는 생성일 기준 (최신 생성 방이 위로 올지 아래로 갈지 결정)
          // 보통 메시지가 없으면 최신 생성된 방이 위로 오는 것이 자연스럽습니다.
          const createA = new Date(a.createdAt || 0).getTime();
          const createB = new Date(b.createdAt || 0).getTime();
          return createB - createA;
        });

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

      const r = room as ChatRoomItem;
      const roomId = r.roomId;
      const roomName = r.roomName || "채팅방";

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
                    {/* ✅ [추가] 마지막 메시지 시간 표시 (선택 사항) */}
                    {/* {roomItem.lastMessageAt && (
                      <Text style={{ fontSize: 11, color: "#aaa" }}>
                        {new Date(roomItem.lastMessageAt).toLocaleDateString()}
                      </Text>
                    )} */}
                  </View>

                  {/* ✅ [확인] 마지막 대화 내용 표시 */}
                  {/* 새로고침 시 안 보인다면, 서버 응답의 필드명(예: lastMessageContent)을 확인해야 합니다. */}
                  {/* 여기서는 lastMessage가 있으면 보여주고, 없으면 기본 문구를 보여줍니다. */}
                  <Text
                    style={{ fontSize: 13, color: "#888" }}
                    numberOfLines={1}
                  >
                    {roomItem.lastMessage && roomItem.lastMessage.trim() !== ""
                      ? roomItem.lastMessage
                      : "대화 내용이 없습니다."}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* 모달 관련 코드는 변경 없음 */}
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
