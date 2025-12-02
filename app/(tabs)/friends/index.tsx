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
  blockFriend,
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

  const handleOpenFriendMenu = (friend: Friend) => {
    setMenuType("FRIEND");
    setSelectedFriend(friend);
    setMenuVisible(true);
  };

  const handleLongPressFriend = (friend: Friend) => {
    handleOpenFriendMenu(friend);
  };

  const handleLongPressGroup = (group: FriendGroup) => {
    setMenuType("GROUP");
    setSelectedGroup(group);
    setMenuVisible(true);
  };

  // ✅ [수정] Typed Routes에 맞춰 pathname 수정 + params에 id 추가
  const handleEnterChat = (friend: Friend) => {
    router.push({
      pathname: "/chat/[id]", // 파일명 그대로 입력
      params: {
        id: friend.id,
        targetName: friend.name,
      },
    });
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
              await blockFriend(selectedFriend.id, "MESSAGE_AND_PROFILE");
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

  const filteredFriends = (() => {
    let result = friends;
    if (filterTab === "FAVORITE") {
      result = result.filter((f) => f.isFavorite);
    } else if (filterTab === "GROUP") {
      if (!selectedGroupName) result = [];
      else result = result.filter((f) => f.groupName === selectedGroupName);
    }
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

  const handleSearchToggle = () => {
    if (isSearching) {
      setIsSearching(false);
      setSearchText("");
      Keyboard.dismiss();
    } else {
      setIsSearching(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.header, styles.headerContainer]}>
          <View style={styles.absoluteTitleContainer}>
            {isSearching ? (
              <TextInput
                style={styles.searchInput}
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
          <View style={[styles.headerRight, styles.headerRight]}>
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
        <View style={[styles.friendCountRow, styles.friendCountRowInline]}>
          <Text style={styles.friendCountLabel}>친구 수</Text>
          <Text style={styles.friendCountValue}>{friends.length}명</Text>
        </View>

        <View style={styles.friendFilterRow}>
          <Pressable
            style={[
              styles.friendFilterTab,
              filterTab === "ALL" && styles.friendFilterTabActive,
            ]}
            onPress={() => {
              setFilterTab("ALL");
              setSelectedGroupName(null);
            }}
          >
            <Text
              style={[
                styles.friendFilterTabText,
                filterTab === "ALL" && styles.friendFilterTabTextActive,
              ]}
            >
              전체
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.friendFilterTab,
              filterTab === "FAVORITE" && styles.friendFilterTabActive,
            ]}
            onPress={() => {
              setFilterTab("FAVORITE");
              setSelectedGroupName(null);
            }}
          >
            <Text
              style={[
                styles.friendFilterTabText,
                filterTab === "FAVORITE" && styles.friendFilterTabTextActive,
              ]}
            >
              즐겨찾기
            </Text>
          </Pressable>
          {groups.map((group) => (
            <Pressable
              key={group.id}
              style={[
                styles.friendFilterTab,
                selectedGroupName === group.name &&
                  styles.friendFilterTabActive,
              ]}
              onPress={() => {
                setFilterTab("GROUP");
                setSelectedGroupName(group.name);
              }}
              onLongPress={() => handleLongPressGroup(group)}
            >
              <Text
                style={[
                  styles.friendFilterTabText,
                  selectedGroupName === group.name &&
                    styles.friendFilterTabTextActive,
                ]}
              >
                {group.name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.friendFilterPlusTab}
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
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onLongPress={() => handleLongPressFriend(item)}
                onPress={() => handleEnterChat(item)}
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
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => handleOpenFriendMenu(item)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* 모달들 (친구추가, 그룹생성, 메뉴, 설정) */}
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

        <Modal
          animationType="fade"
          transparent={true}
          visible={groupModalVisible}
          onRequestClose={() => setGroupModalVisible(false)}
        >
          <View style={styles.groupModalContainer}>
            <View style={styles.groupModalBox}>
              <Text style={styles.groupModalTitle}>그룹 생성</Text>
              <Text style={styles.groupSectionTitle}>그룹 이름</Text>
              <TextInput
                style={styles.groupNameInput}
                placeholder="그룹 이름을 입력하세요"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              <Text style={styles.groupSectionTitle}>친구 선택</Text>
              <Text style={styles.groupHintText}>
                그룹에 포함할 친구를 선택해주세요 ({groupSelectIds.length}명)
              </Text>
              <FlatList
                data={friends}
                keyExtractor={(item) => String(item.id)}
                style={styles.groupFriendList}
                renderItem={({ item }) => {
                  const isSelected = groupSelectIds.includes(item.id);
                  return (
                    <Pressable
                      style={[
                        styles.groupFriendItem,
                        isSelected && styles.groupFriendItemSelected,
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
                          styles.groupFriendItemText,
                          isSelected && styles.groupFriendItemTextSelected,
                        ]}
                      >
                        {item.name} {isSelected && "✓"}
                      </Text>
                    </Pressable>
                  );
                }}
              />
              <Pressable
                style={styles.groupCreateButton}
                onPress={handleCreateGroup}
              >
                <Text style={styles.groupCreateButtonText}>완료</Text>
              </Pressable>
              <Pressable
                style={styles.groupModalClose}
                onPress={() => setGroupModalVisible(false)}
              >
                <Text style={styles.groupModalCloseText}>취소</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          transparent={true}
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.menuContainer}>
                  <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>
                      {menuType === "FRIEND"
                        ? selectedFriend?.name
                        : selectedGroup?.name}
                    </Text>
                  </View>
                  {menuType === "FRIEND" ? (
                    <>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleToggleFavorite}
                      >
                        <Text style={styles.menuItemText}>
                          {selectedFriend?.isFavorite
                            ? "즐겨찾기 해제"
                            : "즐겨찾기 추가"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleDeleteFriend}
                      >
                        <Text style={styles.menuItemText}>삭제</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleBlockFriend}
                      >
                        <Text style={styles.menuItemText}>차단</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleDeleteGroup}
                      >
                        <Text
                          style={[styles.menuItemText, { color: "#FF4444" }]}
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

        <Modal
          transparent={true}
          visible={settingsMenuVisible}
          animationType="fade"
          onRequestClose={() => setSettingsMenuVisible(false)}
        >
          <Pressable
            style={styles.settingsOverlay}
            onPress={() => setSettingsMenuVisible(false)}
          >
            <View style={styles.settingsDropdown}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  Alert.alert("알림", "친구 관리 기능");
                }}
              >
                <Text style={styles.settingsItemText}>친구 관리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  Alert.alert("알림", "전체 설정 기능");
                }}
              >
                <Text style={styles.settingsItemText}>전체 설정</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
