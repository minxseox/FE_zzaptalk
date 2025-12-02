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

// ✅ [수정 1] 스토어(ChatRoomUserListItem)와 타입을 완벽히 일치시킴
// type과 unreadCount를 필수로 설정하여 setRoomsFromServer 에러 해결
interface ChatRoomItem {
  roomId: number;
  type: "SINGLE" | "GROUP"; // 필수
  roomName: string;
  unreadCount: number; // 필수

  // 메시지 및 시간 관련 필드 (서버 응답에 따라 선택적)
  lastMessageContent?: string;
  lastMessage?: string | null;
  lastMessageTime?: string;
  lastMessageAt?: string | null;
  createdAt?: string;

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

  // --- 목록 불러오기 및 정렬 ---
  const fetchRooms = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);

        // API 결과를 ChatRoomItem 배열로 타입 단언
        const data = (await getChatRoomList()) as ChatRoomItem[];

        // 날짜 파싱 헬퍼
        const getTime = (item: ChatRoomItem) => {
          const timeStr = item.lastMessageAt || item.lastMessageTime;
          return timeStr ? new Date(timeStr).getTime() : 0;
        };

        // 최신 메시지 순 정렬
        const sortedData = data.sort((a, b) => {
          const timeA = getTime(a);
          const timeB = getTime(b);
          return timeB - timeA;
        });

        // ✅ 이제 타입이 일치하므로 빨간줄이 뜨지 않습니다.
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

  // --- 채팅방 생성 로직 ---
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

      // ✅ [수정 2] 생성 API 호출 결과 처리 방식 변경
      // createOrGetSingleChatRoom은 ChatRoomResponse(간략 정보)를 반환합니다.
      // 이를 ChatRoomItem(상세 정보)으로 강제 형변환(as)하면 type, unreadCount가 없어서 에러가 납니다.
      const response = await createOrGetSingleChatRoom(idNum);

      if (!response.roomId) {
        Alert.alert("오류", "생성된 채팅방 ID를 찾을 수 없어요.");
        return;
      }

      setShowCreate(false);
      setPartnerId("");

      // 1. 목록 새로고침 (이때 완전한 ChatRoomItem 정보를 받아와서 스토어에 넣음)
      await fetchRooms();

      // 2. 채팅방으로 이동 (생성 결과에서 ID와 이름만 사용)
      goRoom(response.roomId, response.roomName || "채팅방");
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
            // 스토어에 저장된 데이터는 이미 ChatRoomItem 형식이므로 안심하고 사용
            const roomItem = item as ChatRoomItem;

            // 메시지 우선순위 처리
            const displayMessage =
              roomItem.lastMessageContent &&
              roomItem.lastMessageContent.trim() !== ""
                ? roomItem.lastMessageContent
                : roomItem.lastMessage && roomItem.lastMessage.trim() !== ""
                ? roomItem.lastMessage
                : "대화 내용이 없습니다.";

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
                      marginBottom: 4,
                    }}
                  >
                    <Text style={styles.roomName} numberOfLines={1}>
                      {roomItem.roomName || "알 수 없는 채팅방"}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: "#888", flex: 1 }}
                      numberOfLines={1}
                    >
                      {displayMessage}
                    </Text>

                    {/* 안 읽은 메시지 배지 */}
                    {roomItem.unreadCount > 0 && (
                      <View
                        style={{
                          backgroundColor: "#FF4444",
                          borderRadius: 10,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginLeft: 8,
                          minWidth: 18,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {roomItem.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* 생성 모달 (기존 유지) */}
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
