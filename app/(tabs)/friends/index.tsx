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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../../src/styles/friends/Friends.module";
import modalStyles from "../../../src/styles/friends/FriendAddModal.module";

import {
  getFriendList,
  addFriend,
  deleteFriend,
} from "../../../src/services/friends";
import type { FriendListResponseDto } from "../../../src/types/friends";

type Friend = {
  id: number;
  name: string;
};

const MY_NAME = "김민서";

/** 전화번호 자동 하이픈 포맷터 (010-1234-5678) */
function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, ""); // 숫자만

  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function FriendsScreen() {
  // 🔹 친구 목록 상태
  const [friends, setFriends] = useState<Friend[]>([]);

  // 🔹 친구 추가 모달 상태
  const [addVisible, setAddVisible] = useState(false);
  const [addType, setAddType] = useState<"PHONE" | "ZZAPID">("PHONE");
  const [identifier, setIdentifier] = useState("");
  const [adding, setAdding] = useState(false);

  // 🔹 친구 목록 로드 함수
  const loadFriends = async () => {
    try {
      const data: FriendListResponseDto = await getFriendList();

      const merged: Friend[] = [
        ...(data.birthdayFriends || []),
        ...(data.favoriteFriends || []),
        ...(data.customGroups || []).flatMap((g) => g.friends || []),
        ...(data.otherFriends || []),
      ].map((f) => ({
        id: f.userId,
        name: f.nickname,
      }));

      const map = new Map<number, Friend>();
      merged.forEach((f) => {
        if (!map.has(f.id)) map.set(f.id, f);
      });

      setFriends(Array.from(map.values()));
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "친구 목록을 불러오지 못했어요.");
    }
  };

  // 🔹 마운트 시 친구 목록 불러오기
  useEffect(() => {
    loadFriends();
  }, []);

  // 🔹 친구 추가 처리
  const handleAddFriend = async () => {
    const raw = identifier.trim();

    // PHONE일 때는 숫자만 추출해서 API에 보냄
    const cleaned = addType === "PHONE" ? raw.replace(/\D/g, "") : raw; // ← 하이픈 제거!

    if (!cleaned) {
      Alert.alert(
        "알림",
        addType === "PHONE"
          ? "전화번호를 입력해 주세요."
          : "ZzapID를 입력해 주세요."
      );
      return;
    }

    // (선택) 간단한 길이 체크
    if (addType === "PHONE" && cleaned.length < 10) {
      Alert.alert("알림", "전화번호를 다시 확인해 주세요.");
      return;
    }

    setAdding(true);
    try {
      const msg = await addFriend({
        identifier: cleaned, // ← 하이픈 제거된 값 전송
        type: addType,
      });

      Alert.alert("완료", msg || "친구가 추가되었습니다.");
      setIdentifier("");
      setAddVisible(false);

      await loadFriends();
    } catch (e: any) {
      const msg =
        e?.response?.data ||
        e?.message ||
        (addType === "PHONE"
          ? "친구를 추가하지 못했어요. 전화번호를 다시 확인해 주세요."
          : "친구를 추가하지 못했어요. ZzapID를 다시 확인해 주세요.");
      Alert.alert("오류", msg);
    } finally {
      setAdding(false);
    }
  };

  // 🔹 친구 삭제 처리 (친구 항목 길게 누르면 삭제)
  const handleDeleteFriend = (friendId: number) => {
    Alert.alert("친구 삭제", "정말 이 친구를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFriend(friendId); // ← 이제 void

            // 목록에서 제거
            setFriends((prev) => prev.filter((f) => f.id !== friendId));

            Alert.alert("완료", "친구가 삭제되었습니다.");
          } catch (e: any) {
            Alert.alert(
              "오류",
              e?.message || "친구 삭제 중 오류가 발생했어요."
            );
          }
        },
      },
    ]);
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

            {/* 🔹 친구추가 버튼 */}
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

        {/* 내 프로필 */}
        <View style={styles.myProfileSection}>
          <View style={styles.myProfileAvatar} />
          <Text style={styles.myProfileName}>{MY_NAME}</Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 친구 수 */}
        <View style={styles.friendCountRow}>
          <Text style={styles.friendCountLabel}>친구 수</Text>
          <Text style={styles.friendCountValue}>{friends.length}</Text>
        </View>

        {/* 친구 리스트 */}
        <FlatList
          data={friends}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.friendList}
          renderItem={({ item }) => (
            // 🔹 친구 항목 길게 누르면 삭제 알럿
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

                  {/* 입력창 */}
                  <View style={modalStyles.inputWrap}>
                    <TextInput
                      style={modalStyles.input}
                      placeholder={
                        addType === "PHONE"
                          ? "전화번호를 입력하세요 (숫자만)"
                          : "ZzapID를 입력하세요"
                      }
                      value={identifier}
                      onChangeText={(text) => {
                        if (addType === "PHONE") {
                          setIdentifier(formatPhoneNumber(text)); // 화면에는 하이픈 포함
                        } else {
                          setIdentifier(text);
                        }
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
      </View>
    </SafeAreaView>
  );
}
