// app/(tabs)/friends/index.tsx
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Image, // 🔹 추가 (내 프로필 사진용)
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import styles from "../../../src/styles/friends/Friends.module";
import modalStyles from "../../../src/styles/friends/FriendAddModal.module";

import {
  getFriendList,
  addFriend,
  deleteFriend,
  createFriendGroup,
  addFriendToGroup,
} from "../../../src/services/friends";
import { fetchMyProfile } from "../../../src/services/profile"; // 🔹 내 프로필 API
import type { FriendListResponseDto } from "../../../src/types/friends";

type Friend = {
  id: number; // 사용자 ID (userId)
  friendshipId: number; // 친구 관계 ID (friendshipId)
  name: string;
  isFavorite?: boolean;
  groupName?: string | null;
};

type FriendGroup = {
  name: string;
  friends: Friend[];
};

// 🔹 하드코딩 이름 제거 → 상태로 관리 (기본값 "사용자")
// const MY_NAME = "김민서";

/** 전화번호 자동 하이픈 포맷터 */
function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function FriendsScreen() {
  // 🔹 내 프로필 (상단 영역)
  const [myName, setMyName] = useState("사용자"); // 기본값: "사용자"
  const [myAvatarUri, setMyAvatarUri] = useState<string | null>(null);

  // 🔹 친구 목록
  const [friends, setFriends] = useState<Friend[]>([]);
  // 🔹 서버 + 로컬 그룹
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  // 🔹 필터 탭
  const [filterTab, setFilterTab] = useState<"ALL" | "FAVORITE" | "GROUP">(
    "ALL"
  );
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(
    null
  );

  // 🔹 그룹 관리 모달
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupSelectIds, setGroupSelectIds] = useState<number[]>([]);

  // 🔹 친구 추가 모달
  const [addVisible, setAddVisible] = useState(false);
  const [addType, setAddType] = useState<"PHONE" | "ZZAPID">("PHONE");
  const [identifier, setIdentifier] = useState("");
  const [adding, setAdding] = useState(false);

  /** 🔸 친구 목록 로드 */
  const loadFriends = async () => {
    try {
      const data: FriendListResponseDto = await getFriendList();
      const map = new Map<number, Friend>();

      const upsert = (f: Friend) => {
        const prev = map.get(f.id);
        if (!prev) {
          map.set(f.id, f);
        } else {
          map.set(f.id, {
            ...prev,
            ...f,
            isFavorite: prev.isFavorite || f.isFavorite,
            groupName: prev.groupName ?? f.groupName ?? null,
          });
        }
      };

      // 생일 친구
      // 생일 친구
      (data.birthdayFriends || []).forEach((f: any) =>
        upsert({
          id: f.userId,
          friendshipId: f.friendshipId,
          name: f.nickname,
        })
      );

      // 즐겨찾기
      (data.favoriteFriends || []).forEach((f: any) =>
        upsert({
          id: f.userId,
          friendshipId: f.friendshipId,
          name: f.nickname,
          isFavorite: true,
        })
      );

      // 커스텀 그룹
      const serverGroups: FriendGroup[] = (data.customGroups || []).map(
        (g: any) => {
          const groupName = g.groupName ?? g.name ?? "그룹";
          const groupFriends: Friend[] = (g.friends || []).map((f: any) => {
            const friend: Friend = {
              id: f.userId,
              friendshipId: f.friendshipId,
              name: f.nickname,
              groupName,
            };
            upsert(friend);
            return friend;
          });
          return { name: groupName, friends: groupFriends };
        }
      );

      // 기타 친구
      (data.otherFriends || []).forEach((f: any) =>
        upsert({
          id: f.userId,
          friendshipId: f.friendshipId,
          name: f.nickname,
        })
      );

      setFriends(Array.from(map.values()));
      setGroups(serverGroups);
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "친구 목록을 불러오지 못했어요.");
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  /** 🔸 내 프로필 정보 로드 (상단 아바타 + 이름) */
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMyProfile(); // GET /api/v1/users/profile
        setMyName(me.nickname || me.name || "사용자"); // 나중에 로그인 사용자 이름 자동 반영
        setMyAvatarUri(me.profilePhotoUrl || null);
      } catch (e) {
        console.error("내 프로필 로드 실패:", e);
        // 실패해도 기본값 "사용자"로 그냥 둠
      }
    })();
  }, []);

  /** 🔸 친구 추가 */
  const handleAddFriend = async () => {
    const raw = identifier.trim();
    const cleaned = addType === "PHONE" ? raw.replace(/\D/g, "") : raw;

    if (!cleaned) {
      Alert.alert(
        "알림",
        addType === "PHONE"
          ? "전화번호를 입력해 주세요."
          : "ZzapID를 입력해 주세요."
      );
      return;
    }

    if (addType === "PHONE" && cleaned.length < 10) {
      Alert.alert("알림", "전화번호를 다시 확인해 주세요.");
      return;
    }

    setAdding(true);
    try {
      const msg = await addFriend({ identifier: cleaned, type: addType });

      Alert.alert("완료", msg || "친구가 추가되었습니다.");
      setIdentifier("");
      setAddVisible(false);
      await loadFriends();
    } catch (e: any) {
      const msg =
        e?.response?.data ||
        e?.message ||
        "친구를 추가하지 못했어요. 다시 확인해 주세요.";
      Alert.alert("오류", msg);
    } finally {
      setAdding(false);
    }
  };

  /** 🔸 친구 삭제 (길게 누르기) */
  const handleDeleteFriend = (friendId: number) => {
    Alert.alert("친구 삭제", "정말 이 친구를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFriend(friendId);
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
            // 그룹에서도 제거
            setGroups((prev) =>
              prev.map((g) => ({
                ...g,
                friends: g.friends.filter((f) => f.id !== friendId),
              }))
            );
          } catch (e: any) {
            Alert.alert("오류", "친구 삭제 중 오류가 발생했어요.");
          }
        },
      },
    ]);
  };

  /** 🔸 현재 탭에 맞게 필터링 */
  const filteredFriends = (() => {
    if (filterTab === "FAVORITE") {
      return friends.filter((f) => f.isFavorite);
    }
    if (filterTab === "GROUP") {
      if (!selectedGroupName) return [];
      return friends.filter((f) => f.groupName === selectedGroupName);
    }
    return friends;
  })();

  /** 🔸 그룹 생성 핸들러 (프론트 상태만) */
  /** 🔸 그룹 생성 핸들러 (서버 연동) */
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;

    if (groupSelectIds.length === 0) {
      Alert.alert("알림", "그룹에 넣을 친구를 선택해 주세요.");
      return;
    }

    try {
      // 1) 그룹 생성
      const group = await createFriendGroup({ groupName: name });

      // 2) 선택한 친구들을 그룹에 추가
      const selectedFriends = friends.filter((f) =>
        groupSelectIds.includes(f.id)
      );

      await Promise.all(
        selectedFriends
          .filter((f) => typeof f.friendshipId === "number")
          .map((f) =>
            addFriendToGroup({
              groupId: group.id,
              friendshipId: f.friendshipId,
            })
          )
      );

      // 3) 서버 상태 기준으로 친구/그룹 리스트 재로딩
      await loadFriends();

      // 4) 방금 만든 그룹으로 필터 전환
      setSelectedGroupName(group.groupName);
      setFilterTab("GROUP");

      // 5) 모달 초기화
      setNewGroupName("");
      setGroupSelectIds([]);
      setGroupModalVisible(false);
    } catch (e: any) {
      console.error("그룹 생성 / 그룹에 친구 추가 실패:", e);
      const msg =
        e?.response?.data ||
        e?.message ||
        "그룹 생성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
      Alert.alert("오류", msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>친구</Text>
          <View style={styles.headerRight}>
            <Ionicons name="search" size={20} style={styles.headerIcon} />

            <Pressable onPress={() => setAddVisible(true)}>
              <Ionicons
                name="person-add-outline"
                size={20}
                style={styles.headerIcon}
              />
            </Pressable>

            <Ionicons
              name="settings-outline"
              size={20}
              style={styles.headerIcon}
            />
          </View>
        </View>

        {/* 내 프로필 (눌렀을 때 /profile로 이동) */}
        <Pressable
          style={styles.myProfileSection}
          onPress={() => router.push("/profile")}
        >
          {myAvatarUri ? (
            <Image
              source={{ uri: myAvatarUri }}
              style={styles.myProfileAvatar}
            />
          ) : (
            <View style={styles.myProfileAvatar} />
          )}
          <Text style={styles.myProfileName}>{myName}</Text>
        </Pressable>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 친구 수: 한 줄에 "친구 수 0명" */}
        <View style={[styles.friendCountRow, localStyles.friendCountRowInline]}>
          <Text style={styles.friendCountLabel}>친구 수</Text>
          <Text style={styles.friendCountValue}>{friends.length}명</Text>
        </View>

        {/* 필터 탭: 전체 / 즐겨찾기 / + */}
        <View style={localStyles.friendFilterRow}>
          <Pressable
            style={[
              localStyles.friendFilterTab,
              filterTab === "ALL" && localStyles.friendFilterTabActive,
            ]}
            onPress={() => {
              setFilterTab("ALL");
              setSelectedGroupName(null);
            }}
          >
            <Text
              style={[
                localStyles.friendFilterTabText,
                filterTab === "ALL" && localStyles.friendFilterTabTextActive,
              ]}
            >
              전체
            </Text>
          </Pressable>

          <Pressable
            style={[
              localStyles.friendFilterTab,
              filterTab === "FAVORITE" && localStyles.friendFilterTabActive,
            ]}
            onPress={() => {
              setFilterTab("FAVORITE");
              setSelectedGroupName(null);
            }}
          >
            <Text
              style={[
                localStyles.friendFilterTabText,
                filterTab === "FAVORITE" &&
                  localStyles.friendFilterTabTextActive,
              ]}
            >
              즐겨찾기
            </Text>
          </Pressable>

          {/* + : 그룹 관리 모달 열기 */}
          <Pressable
            style={localStyles.friendFilterPlusTab}
            onPress={() => setGroupModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#7B61FF" />
          </Pressable>
        </View>

        {/* 친구 리스트 */}
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.friendList}
          renderItem={({ item }) => (
            <Pressable
              style={styles.friendRow}
              onLongPress={() => handleDeleteFriend(item.id)}
            >
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarInitial}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <Text style={styles.friendName}>{item.name}</Text>
            </Pressable>
          )}
        />

        {/* 🔻 친구 추가 모달 */}
        {/* (이 아래 모달 부분은 그대로) */}
        <Modal
          visible={addVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={modalStyles.overlay}>
              <TouchableWithoutFeedback>
                <View style={modalStyles.sheet}>
                  <Text style={modalStyles.sheetTitle}>친구 추가</Text>

                  {/* 탭: 전화번호 / ZzapID */}
                  <View style={modalStyles.tabRow}>
                    <Pressable
                      style={[
                        modalStyles.tabButton,
                        addType === "PHONE" && modalStyles.tabButtonActive,
                      ]}
                      onPress={() => setAddType("PHONE")}
                    >
                      <Text
                        style={[
                          modalStyles.tabText,
                          addType === "PHONE" && modalStyles.tabTextActive,
                        ]}
                      >
                        전화번호
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        modalStyles.tabButton,
                        addType === "ZZAPID" && modalStyles.tabButtonActive,
                      ]}
                      onPress={() => setAddType("ZZAPID")}
                    >
                      <Text
                        style={[
                          modalStyles.tabText,
                          addType === "ZZAPID" && modalStyles.tabTextActive,
                        ]}
                      >
                        ZzapID
                      </Text>
                    </Pressable>
                  </View>

                  {/* 입력 */}
                  <View style={modalStyles.inputWrap}>
                    <TextInput
                      style={modalStyles.input}
                      placeholder={
                        addType === "PHONE"
                          ? "전화번호 입력 (숫자만)"
                          : "ZzapID 입력"
                      }
                      value={identifier}
                      onChangeText={(t) => {
                        if (addType === "PHONE")
                          setIdentifier(formatPhoneNumber(t));
                        else setIdentifier(t);
                      }}
                      keyboardType={
                        addType === "PHONE" ? "number-pad" : "default"
                      }
                      autoCapitalize="none"
                    />
                  </View>

                  {/* 버튼 */}
                  <View style={modalStyles.buttonRow}>
                    <Pressable
                      style={[modalStyles.button, modalStyles.cancelButton]}
                      onPress={() => {
                        setIdentifier("");
                        setAddVisible(false);
                      }}
                      disabled={adding}
                    >
                      <Text style={modalStyles.cancelText}>취소</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        modalStyles.button,
                        modalStyles.confirmButton,
                        (!identifier.trim() || adding) && { opacity: 0.5 },
                      ]}
                      onPress={handleAddFriend}
                      disabled={!identifier.trim() || adding}
                    >
                      <Text style={modalStyles.confirmText}>
                        {adding ? "추가 중..." : "추가"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 🔻 그룹 관리 모달 (+ 버튼) */}
        <Modal
          visible={groupModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGroupModalVisible(false)}
        >
          <View style={localStyles.groupModalContainer}>
            <View style={localStyles.groupModalBox}>
              <Text style={localStyles.groupModalTitle}>그룹 관리</Text>

              {/* 기존 그룹 선택 (있으면) */}
              {groups.length > 0 && (
                <>
                  <Text style={localStyles.groupSectionTitle}>그룹 선택</Text>
                  {groups.map((g) => (
                    <Pressable
                      key={g.name}
                      style={localStyles.groupItem}
                      onPress={() => {
                        setSelectedGroupName(g.name);
                        setFilterTab("GROUP");
                        setGroupModalVisible(false);
                      }}
                    >
                      <Text style={localStyles.groupItemText}>{g.name}</Text>
                    </Pressable>
                  ))}
                  <View style={localStyles.groupDivider} />
                </>
              )}

              {/* 새 그룹 만들기 */}
              <Text style={localStyles.groupSectionTitle}>새 그룹 만들기</Text>
              <TextInput
                style={localStyles.groupNameInput}
                placeholder="그룹 이름"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              <Text style={localStyles.groupHintText}>
                그룹에 넣을 친구를 선택해 주세요.
              </Text>

              <View style={localStyles.groupFriendList}>
                {friends.length === 0 ? (
                  <Text style={localStyles.groupHintText}>
                    추가된 친구가 없습니다.
                  </Text>
                ) : (
                  friends.map((f) => {
                    const selected = groupSelectIds.includes(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        style={[
                          localStyles.groupFriendItem,
                          selected && localStyles.groupFriendItemSelected,
                        ]}
                        onPress={() => {
                          setGroupSelectIds((prev) =>
                            prev.includes(f.id)
                              ? prev.filter((id) => id !== f.id)
                              : [...prev, f.id]
                          );
                        }}
                      >
                        <Text
                          style={[
                            localStyles.groupFriendItemText,
                            selected && localStyles.groupFriendItemTextSelected,
                          ]}
                        >
                          {f.name}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>

              <Pressable
                style={[
                  localStyles.groupCreateButton,
                  (!newGroupName.trim() || groupSelectIds.length === 0) && {
                    opacity: 0.4,
                  },
                ]}
                disabled={!newGroupName.trim() || groupSelectIds.length === 0}
                onPress={handleCreateGroup}
              >
                <Text style={localStyles.groupCreateButtonText}>
                  그룹 만들기
                </Text>
              </Pressable>

              <Pressable
                style={localStyles.groupModalClose}
                onPress={() => {
                  setGroupModalVisible(false);
                  setNewGroupName("");
                  setGroupSelectIds([]);
                }}
              >
                <Text style={localStyles.groupModalCloseText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const PURPLE = "#9997FF";
/* 🔸 이 파일 안에서만 쓰는 로컬 스타일 */
const localStyles = StyleSheet.create({
  friendCountRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },

  friendFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  friendFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PURPLE,
    backgroundColor: "#FFFFFF",
  },
  friendFilterTabActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  friendFilterTabText: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: "500",
  },
  friendFilterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  friendFilterPlusTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  groupModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  groupModalBox: {
    width: "80%",
    maxHeight: "80%",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
  },
  groupModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  groupSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  groupItem: {
    paddingVertical: 6,
  },
  groupItemText: {
    fontSize: 14,
  },
  groupDivider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 8,
  },

  groupNameInput: {
    borderWidth: 1,
    borderColor: "#E0E0FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  groupHintText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    marginBottom: 4,
  },
  groupFriendList: {
    maxHeight: 160,
    marginTop: 4,
    marginBottom: 8,
  },
  groupFriendItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  groupFriendItemSelected: {
    backgroundColor: "#ECE8FF",
  },
  groupFriendItemText: {
    fontSize: 13,
    color: "#333",
  },
  groupFriendItemTextSelected: {
    color: "#7B61FF",
    fontWeight: "600",
  },

  groupCreateButton: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#7B61FF",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  groupModalClose: {
    marginTop: 10,
    alignSelf: "flex-end",
  },
  groupModalCloseText: {
    fontSize: 13,
    color: "#7B61FF",
  },
});
