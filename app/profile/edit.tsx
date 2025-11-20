// app/profile/edit.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";

import styles from "../../src/styles/profile/Profile.module";
import { updateMyProfile } from "../../src/services/profile";

export default function EditProfileScreen() {
  const params = useLocalSearchParams();

  const [name, setName] = useState((params.name as string) || "본인 이름");
  const [status, setStatus] = useState(
    (params.status as string) || "상태 메시지"
  );
  const [backgroundUri, setBackgroundUri] = useState<string | null>(
    params.backgroundUri ? (params.backgroundUri as string) : null
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(
    params.avatarUri ? (params.avatarUri as string) : null
  );
  const [saving, setSaving] = useState(false);

  const pickImage = async (type: "background" | "avatar") => {
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        if (type === "background") setBackgroundUri(uri);
        else setAvatarUri(uri);
      }
    } catch (e: any) {
      console.error("이미지 선택 중 오류:", e);
      Alert.alert("오류", "이미지 선택 중 오류가 발생했어요.");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);

      // ✅ 서버에 프로필 수정 요청 (nickname = UI 이름)
      const updated = await updateMyProfile({
        nickname: name,
        statusMessage: status,
        profilePhotoUrl: avatarUri ?? undefined,
        backgroundPhotoUrl: backgroundUri ?? undefined,
      });

      // ✅ 서버 응답 기준으로 /profile 화면 갱신
      router.replace({
        pathname: "/profile",
        params: {
          name: updated.nickname ?? updated.name ?? "본인 이름",
          status: updated.statusMessage ?? "",
          backgroundUri: updated.backgroundPhotoUrl ?? "",
          avatarUri: updated.profilePhotoUrl ?? "",
        },
      });
    } catch (e: any) {
      console.error("프로필 수정 실패:", e);
      Alert.alert("프로필 수정 실패", "다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSideSpace}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>프로필 편집</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.editButtonText}>
              {saving ? "저장 중..." : "완료"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 배경 사진 + 변경 버튼 */}
        <View style={styles.backgroundWrapper}>
          {backgroundUri ? (
            <Image
              source={{ uri: backgroundUri }}
              style={styles.backgroundImage}
            />
          ) : (
            <View style={styles.backgroundPlaceholder}>
              <Text style={styles.backgroundPlaceholderText}>배경사진</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backgroundChangeButton}
            onPress={() => pickImage("background")}
          >
            <Ionicons name="camera-outline" size={14} />
            <Text style={styles.backgroundChangeText}>배경화면 변경</Text>
          </TouchableOpacity>
        </View>

        {/* 아래 카드 */}
        <View style={styles.bottomCard}>
          {/* 프로필 사진 + 이름 입력 */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarEditWrapper}>
              <TouchableOpacity onPress={() => pickImage("avatar")}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={40} color="#8a8a8a" />
                  </View>
                )}
                <View style={styles.avatarCameraBadge}>
                  <Ionicons name="camera-outline" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.nameEditContainer}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.nameInput}
                placeholder="본인 이름"
                placeholderTextColor="#aaaaaa"
              />
              <Ionicons name="pencil" size={14} style={styles.nameEditIcon} />
            </View>
          </View>

          {/* 상태 메시지 입력 */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}></Text>

            <View style={styles.statusInputRow}>
              <TextInput
                value={status}
                onChangeText={setStatus}
                style={styles.statusInput}
                placeholder="상태 메시지"
                placeholderTextColor="#c0c0c0"
              />
              <Ionicons name="pencil" size={14} style={styles.statusEditIcon} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
