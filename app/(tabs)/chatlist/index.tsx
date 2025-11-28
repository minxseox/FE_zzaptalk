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
import { ApiError } from "../../../src/lib/api";
import styles from "../../../src/styles/chat/ChatList.module";

export default function ChatListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const rooms = useChatListStore((state) => state.rooms);
  const setRooms = useChatListStore((state) => state.setRooms);

  // 모달 관련 상태
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<"single" | "group">("single");
  const [partnerId, setPartnerId] = useState("");
  const [creating, setCreating] = useState(false);

  // 데이터 로딩
  const fetchRooms = async (isRefresh = false) => {
    if (!isRefresh && rooms.length === 0) setLoading(true);
    try {
      const data = await getChatRoomList();
      setRooms(data);
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
          renderItem={({ item }) => {
            const lastMessage =
              (item as any).lastMessage ?? "대화 내용이 없습니다.";
            const lastMessageAt = (item as any).lastMessageAt as
              | string
              | undefined;
            const unreadCount = (item as any).unreadCount as number | undefined;

            const timeLabel = lastMessageAt
              ? new Date(lastMessageAt).toLocaleTimeString("ko-KR", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";

            return (
              <Pressable
                style={styles.roomRow}
                onPress={() => goRoom(item.roomId, item.roomName)}
              >
                {/* 왼쪽 아바타 */}
                <View style={styles.roomAvatar}>
                  <Text style={styles.roomAvatarInitial}>
                    {item.roomName?.charAt(0) ?? "?"}
                  </Text>
                </View>

                {/* 가운데: 방 이름 + 마지막 메시지 / 오른쪽: 시간 + 뱃지 */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {/* 방 이름 + 마지막 메시지 */}
                  <View style={{ flex: 1, marginRight: 8 }}>
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
                    </View>

                    <Text
                      style={{ fontSize: 13, color: "#888" }}
                      numberOfLines={1}
                    >
                      {lastMessage}
                    </Text>
                  </View>

                  {/* 시간 + 뱃지 */}
                  <View style={{ alignItems: "flex-end" }}>
                    {timeLabel ? (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#999",
                          marginBottom: unreadCount ? 4 : 0,
                        }}
                      >
                        {timeLabel}
                      </Text>
                    ) : null}

                    {unreadCount && unreadCount > 0 && (
                      <View
                        style={{
                          minWidth: 18,
                          paddingHorizontal: 4,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: "#FF4D4F",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
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

      {/* 새 채팅 생성 모달 */}
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
