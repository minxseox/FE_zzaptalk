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
  StyleSheet,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import styles from "../../../src/styles/friends/Friends.module";
import modalStyles from "../../../src/styles/friends/FriendAddModal.module";
import { updateFriendSetting } from "../../../src/services/friends";

import {
  getFriendList,
  addFriend,
  deleteFriend,
  createFriendGroup,
  addFriendToGroup,
  deleteFriendGroup,
  blockFriend, // ✅ [추가] 차단 API 함수 임포트
} from "../../../src/services/friends";
import { fetchMyProfile } from "../../../src/services/profile";
import type { FriendListResponseDto } from "../../../src/types/friends";

type Friend = {
  id: number;
  friendshipId: number;
  name: string;
  isFavorite?: boolean;
  groupName?: string | null;
};

type FriendGroup = {
  id: number;
  name: string;
  friends: Friend[];
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function FriendsScreen() {
  const [myName, setMyName] = useState("사용자");
  const [myAvatarUri, setMyAvatarUri] = useState<string | null>(null);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);

  const [filterTab, setFilterTab] = useState<"ALL" | "FAVORITE" | "GROUP">(
    "ALL"
  );
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(
    null
  );

  // --- 검색 관련 상태 ---
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");

  // --- 설정 메뉴 관련 상태 ---
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupSelectIds, setGroupSelectIds] = useState<number[]>([]);

  const [addVisible, setAddVisible] = useState(false);
  const [addType, setAddType] = useState<"PHONE" | "ZZAPID">("PHONE");
  const [identifier, setIdentifier] = useState("");
  const [adding, setAdding] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuType, setMenuType] = useState<"FRIEND" | "GROUP">("FRIEND");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<FriendGroup | null>(null);

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

      (data.birthdayFriends || []).forEach((f: any) =>
        upsert({ id: f.userId, friendshipId: f.friendshipId, name: f.nickname })
      );
      (data.favoriteFriends || []).forEach((f: any) =>
        upsert({
          id: f.userId,
          friendshipId: f.friendshipId,
          name: f.nickname,
          isFavorite: true,
        })
      );

      const serverGroups: FriendGroup[] = (data.customGroups || []).map(
        (g: any) => {
          const groupName = g.groupName ?? g.name ?? "그룹";
          const groupId = g.groupId ?? g.id ?? 0;
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
          return { id: groupId, name: groupName, friends: groupFriends };
        }
      );

      (data.otherFriends || []).forEach((f: any) =>
        upsert({ id: f.userId, friendshipId: f.friendshipId, name: f.nickname })
      );

      setFriends(Array.from(map.values()));
      setGroups(serverGroups);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMyProfile();
        setMyName(me.nickname || me.name || "사용자");
        setMyAvatarUri(me.profilePhotoUrl || null);
      } catch (e) {}
    })();
  }, []);

  const handleAddFriend = async () => {
    const raw = identifier.trim();
    const cleaned = addType === "PHONE" ? raw.replace(/\D/g, "") : raw;
    if (!cleaned) return Alert.alert("알림", "정보를 입력해주세요.");
    setAdding(true);
    try {
      await addFriend({ identifier: cleaned, type: addType });
      setIdentifier("");
      setAddVisible(false);
      await loadFriends();
    } catch (e: any) {
      Alert.alert("오류", "추가 실패");
    } finally {
      setAdding(false);
    }
  };

  // 점 3개 메뉴 오픈 (친구)
  const handleOpenFriendMenu = (friend: Friend) => {
    setMenuType("FRIEND");
    setSelectedFriend(friend);
    setMenuVisible(true);
  };

  // 기존 LongPress 호환 (필요 시)
  const handleLongPressFriend = (friend: Friend) => {
    handleOpenFriendMenu(friend);
  };

  const handleLongPressGroup = (group: FriendGroup) => {
    setMenuType("GROUP");
    setSelectedGroup(group);
    setMenuVisible(true);
  };

  const handleToggleFavorite = async () => {
    if (!selectedFriend) return;
    setMenuVisible(false);
    const newValue = !selectedFriend.isFavorite;

    setFriends((prev) =>
      prev.map((f) =>
        f.id === selectedFriend.id ? { ...f, isFavorite: newValue } : f
      )
    );

    try {
      await updateFriendSetting({
        friendId: selectedFriend.id,
        isFavorite: newValue,
      });
    } catch (e) {
      console.error("즐겨찾기 변경 실패", e);
      Alert.alert("오류", "즐겨찾기 설정에 실패했습니다.");
      setFriends((prev) =>
        prev.map((f) =>
          f.id === selectedFriend.id ? { ...f, isFavorite: !newValue } : f
        )
      );
    }
  };

  const handleDeleteFriend = () => {
    if (!selectedFriend) return;
    setMenuVisible(false);
    Alert.alert("삭제", "삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFriend(selectedFriend.id);
            await loadFriends();
          } catch {
            Alert.alert("오류", "삭제 실패");
          }
        },
      },
    ]);
  };

  // 차단 기능 연결
  const handleBlockFriend = () => {
    if (!selectedFriend) return;
    setMenuVisible(false);

    Alert.alert(
      "차단",
      `'${selectedFriend.name}'님을 차단하시겠습니까?\n차단하면 메시지와 프로필이 보이지 않게 됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. 차단 API 호출 (타입: MESSAGE_AND_PROFILE)
              await blockFriend(selectedFriend.id, "MESSAGE_AND_PROFILE");

              // 2. 친구 목록 새로고침 (차단된 친구 사라짐)
              await loadFriends();

              Alert.alert("알림", "차단되었습니다.");
            } catch (e) {
              console.error(e);
              Alert.alert("오류", "차단에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    setMenuVisible(false);
    Alert.alert(
      "그룹 삭제",
      `'${selectedGroup.name}' 그룹을 삭제하시겠습니까?\n(친구는 삭제되지 않습니다)`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFriendGroup(selectedGroup.id);
              setGroups((prev) =>
                prev.filter((g) => g.id !== selectedGroup.id)
              );
              if (selectedGroupName === selectedGroup.name) {
                setFilterTab("ALL");
                setSelectedGroupName(null);
              }
            } catch (e) {
              console.error(e);
              Alert.alert("오류", "그룹 삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  // 검색어 필터링 추가
  const filteredFriends = (() => {
    let result = friends;

    // 1. 탭 필터
    if (filterTab === "FAVORITE") {
      result = result.filter((f) => f.isFavorite);
    } else if (filterTab === "GROUP") {
      if (!selectedGroupName) result = [];
      else result = result.filter((f) => f.groupName === selectedGroupName);
    }

    // 2. 검색어 필터
    if (searchText) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return result;
  })();

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name || groupSelectIds.length === 0) return;
    try {
      const group = await createFriendGroup({ groupName: name });
      const selectedFriends = friends.filter((f) =>
        groupSelectIds.includes(f.id)
      );
      await Promise.all(
        selectedFriends.map((f) =>
          addFriendToGroup({ groupId: group.id, friendshipId: f.friendshipId })
        )
      );
      await loadFriends();
      setGroupModalVisible(false);
      setNewGroupName("");
      setGroupSelectIds([]);
    } catch {
      Alert.alert("오류", "그룹 생성 실패");
    }
  };

  // --- 헤더 검색 처리 ---
  const handleSearchToggle = () => {
    if (isSearching) {
      // 검색 종료
      setIsSearching(false);
      setSearchText("");
      Keyboard.dismiss();
    } else {
      // 검색 시작
      setIsSearching(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ================= HEADER ================= */}
        <View style={[styles.header, localStyles.headerContainer]}>
          <View style={localStyles.absoluteTitleContainer}>
            {isSearching ? (
              <TextInput
                style={localStyles.searchInput}
                placeholder="친구 이름 검색"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
            ) : (
              <Text style={styles.headerTitle}>친구</Text>
            )}
          </View>

          <View style={styles.headerLeft} />

          <View style={[styles.headerRight, localStyles.headerRight]}>
            <Pressable onPress={handleSearchToggle}>
              <Ionicons
                name={isSearching ? "close" : "search"}
                size={20}
                style={styles.headerIcon}
              />
            </Pressable>

            <Pressable onPress={() => setAddVisible(true)}>
              <Ionicons
                name="person-add-outline"
                size={20}
                style={styles.headerIcon}
              />
            </Pressable>

            <Pressable onPress={() => setSettingsMenuVisible(true)}>
              <Ionicons
                name="settings-outline"
                size={20}
                style={styles.headerIcon}
              />
            </Pressable>
          </View>
        </View>
        {/* =========================================== */}

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
        <View style={styles.divider} />
        <View style={[styles.friendCountRow, localStyles.friendCountRowInline]}>
          <Text style={styles.friendCountLabel}>친구 수</Text>
          <Text style={styles.friendCountValue}>{friends.length}명</Text>
        </View>

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

          {groups.map((group) => (
            <Pressable
              key={group.id}
              style={[
                localStyles.friendFilterTab,
                selectedGroupName === group.name &&
                  localStyles.friendFilterTabActive,
              ]}
              onPress={() => {
                setFilterTab("GROUP");
                setSelectedGroupName(group.name);
              }}
              onLongPress={() => handleLongPressGroup(group)}
            >
              <Text
                style={[
                  localStyles.friendFilterTabText,
                  selectedGroupName === group.name &&
                    localStyles.friendFilterTabTextActive,
                ]}
              >
                {group.name}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={localStyles.friendFilterPlusTab}
            onPress={() => setGroupModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#7B61FF" />
          </Pressable>
        </View>

        {isSearching && filteredFriends.length === 0 && searchText !== "" && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: "#888" }}>검색 결과가 없습니다.</Text>
          </View>
        )}

        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.friendList}
          renderItem={({ item }) => (
            <View
              style={[styles.friendRow, { justifyContent: "space-between" }]}
            >
              {/* 왼쪽: 프로필 사진 + 이름 영역 (누르면 프로필 이동 등 확장 가능) */}
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onLongPress={() => handleLongPressFriend(item)}
              >
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarInitial}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.friendName}>
                  {item.name}
                  {item.isFavorite && (
                    <Text style={{ color: "#FFD700" }}> ★</Text>
                  )}
                </Text>
              </Pressable>

              {/* 오른쪽: 점 3개 메뉴 버튼 */}
              <TouchableOpacity
                style={localStyles.moreButton}
                onPress={() => handleOpenFriendMenu(item)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* ============ MODALS ============ */}

        {/* 1. 친구 추가 모달 */}
        <Modal
          visible={addVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddVisible(false)}
        >
          <Pressable
            style={modalStyles.modalOverlay}
            onPress={() => {
              Keyboard.dismiss();
              setAddVisible(false);
            }}
          >
            <Pressable
              style={modalStyles.modalContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={modalStyles.modalTitle}>친구 추가</Text>

              <View style={modalStyles.tabRow}>
                <Pressable
                  style={[
                    modalStyles.tabButton,
                    addType === "PHONE" && modalStyles.tabButtonActive,
                  ]}
                  onPress={() => {
                    setAddType("PHONE");
                    setIdentifier("");
                  }}
                >
                  <Text
                    style={[
                      modalStyles.tabText,
                      addType === "PHONE" && modalStyles.tabTextActive,
                    ]}
                  >
                    연락처
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    modalStyles.tabButton,
                    addType === "ZZAPID" && modalStyles.tabButtonActive,
                  ]}
                  onPress={() => {
                    setAddType("ZZAPID");
                    setIdentifier("");
                  }}
                >
                  <Text
                    style={[
                      modalStyles.tabText,
                      addType === "ZZAPID" && modalStyles.tabTextActive,
                    ]}
                  >
                    ID
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={modalStyles.input}
                placeholder={addType === "PHONE" ? "010-0000-0000" : "ID 입력"}
                value={identifier}
                onChangeText={(text) => {
                  if (addType === "PHONE") {
                    setIdentifier(formatPhoneNumber(text));
                  } else {
                    setIdentifier(text);
                  }
                }}
                keyboardType={addType === "PHONE" ? "number-pad" : "default"}
              />

              <View style={modalStyles.buttonRow}>
                <Pressable
                  style={modalStyles.cancelButton}
                  onPress={() => setAddVisible(false)}
                >
                  <Text style={modalStyles.cancelButtonText}>취소</Text>
                </Pressable>
                <Pressable
                  style={modalStyles.addButton}
                  onPress={handleAddFriend}
                >
                  <Text style={modalStyles.addButtonText}>
                    {adding ? "추가 중..." : "추가"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* 2. 그룹 생성 모달 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={groupModalVisible}
          onRequestClose={() => setGroupModalVisible(false)}
        >
          <View style={localStyles.groupModalContainer}>
            <View style={localStyles.groupModalBox}>
              <Text style={localStyles.groupModalTitle}>그룹 생성</Text>

              <Text style={localStyles.groupSectionTitle}>그룹 이름</Text>
              <TextInput
                style={localStyles.groupNameInput}
                placeholder="그룹 이름을 입력하세요"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <Text style={localStyles.groupSectionTitle}>친구 선택</Text>
              <Text style={localStyles.groupHintText}>
                그룹에 포함할 친구를 선택해주세요 ({groupSelectIds.length}명)
              </Text>

              <FlatList
                data={friends}
                keyExtractor={(item) => String(item.id)}
                style={localStyles.groupFriendList}
                renderItem={({ item }) => {
                  const isSelected = groupSelectIds.includes(item.id);
                  return (
                    <Pressable
                      style={[
                        localStyles.groupFriendItem,
                        isSelected && localStyles.groupFriendItemSelected,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setGroupSelectIds((prev) =>
                            prev.filter((id) => id !== item.id)
                          );
                        } else {
                          setGroupSelectIds((prev) => [...prev, item.id]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          localStyles.groupFriendItemText,
                          isSelected && localStyles.groupFriendItemTextSelected,
                        ]}
                      >
                        {item.name} {isSelected && "✓"}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              <Pressable
                style={localStyles.groupCreateButton}
                onPress={handleCreateGroup}
              >
                <Text style={localStyles.groupCreateButtonText}>완료</Text>
              </Pressable>

              <Pressable
                style={localStyles.groupModalClose}
                onPress={() => setGroupModalVisible(false)}
              >
                <Text style={localStyles.groupModalCloseText}>취소</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* 3. 친구/그룹 관리 컨텍스트 메뉴 모달 */}
        <Modal
          transparent={true}
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          {/* 모달 바깥 터치시 닫기 */}
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={localStyles.menuOverlay}>
              {/* 메뉴 박스 내부 터치시 닫기 방지 */}
              <TouchableWithoutFeedback>
                <View style={localStyles.menuContainer}>
                  {/* 상단 이름 영역 */}
                  <View style={localStyles.menuHeader}>
                    <Text style={localStyles.menuTitle}>
                      {menuType === "FRIEND"
                        ? selectedFriend?.name
                        : selectedGroup?.name}
                    </Text>
                  </View>

                  {menuType === "FRIEND" ? (
                    <>
                      <TouchableOpacity
                        style={localStyles.menuItem}
                        onPress={handleToggleFavorite}
                      >
                        <Text style={localStyles.menuItemText}>
                          {selectedFriend?.isFavorite
                            ? "즐겨찾기 해제"
                            : "즐겨찾기 추가"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={localStyles.menuItem}
                        onPress={handleDeleteFriend}
                      >
                        <Text style={localStyles.menuItemText}>삭제</Text>
                      </TouchableOpacity>
                      {/* ✅ [연결] 차단 버튼 */}
                      <TouchableOpacity
                        style={localStyles.menuItem}
                        onPress={handleBlockFriend}
                      >
                        <Text style={localStyles.menuItemText}>차단</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={localStyles.menuItem}
                        onPress={handleDeleteGroup}
                      >
                        <Text
                          style={[
                            localStyles.menuItemText,
                            { color: "#FF4444" },
                          ]}
                        >
                          그룹 삭제
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 4. 우측 상단 설정 드롭다운 메뉴 */}
        <Modal
          transparent={true}
          visible={settingsMenuVisible}
          animationType="fade"
          onRequestClose={() => setSettingsMenuVisible(false)}
        >
          <Pressable
            style={localStyles.settingsOverlay}
            onPress={() => setSettingsMenuVisible(false)}
          >
            <View style={localStyles.settingsDropdown}>
              <TouchableOpacity
                style={localStyles.settingsItem}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  Alert.alert("알림", "친구 관리 기능");
                }}
              >
                <Text style={localStyles.settingsItemText}>친구 관리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.settingsItem}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  Alert.alert("알림", "전체 설정 기능");
                }}
              >
                <Text style={localStyles.settingsItemText}>전체 설정</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const PURPLE = "#9997FF";
const localStyles = StyleSheet.create({
  headerContainer: {
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    height: 56,
  },
  absoluteTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  searchInput: {
    width: "60%",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#333",
  },
  headerRight: {
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },

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
    flexWrap: "wrap",
  },
  friendFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PURPLE,
    backgroundColor: "#FFFFFF",
  },
  friendFilterTabActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  friendFilterTabText: { fontSize: 13, color: PURPLE, fontWeight: "500" },
  friendFilterTabTextActive: { color: "#FFFFFF", fontWeight: "600" },
  friendFilterPlusTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  moreButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 250,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  menuTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  menuItem: { paddingVertical: 12, paddingHorizontal: 20 },
  menuItemText: { fontSize: 15, color: "#444" },

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
  groupModalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  groupSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  groupItem: { paddingVertical: 6 },
  groupItemText: { fontSize: 14 },
  groupDivider: { height: 1, backgroundColor: "#EEE", marginVertical: 8 },
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
  groupFriendList: { maxHeight: 160, marginTop: 4, marginBottom: 8 },
  groupFriendItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  groupFriendItemSelected: { backgroundColor: "#ECE8FF" },
  groupFriendItemText: { fontSize: 13, color: "#333" },
  groupFriendItemTextSelected: { color: "#7B61FF", fontWeight: "600" },
  groupCreateButton: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#7B61FF",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreateButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  groupModalClose: { marginTop: 10, alignSelf: "flex-end" },
  groupModalCloseText: { fontSize: 13, color: "#7B61FF" },
  settingsOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  settingsDropdown: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: "#eee",
  },
  settingsItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsItemText: {
    fontSize: 15,
    color: "#333",
  },
});
