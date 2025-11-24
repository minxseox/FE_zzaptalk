// app/profile/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import styles from "../../src/styles/profile/Profile.module";
// ✅ [API] 본인 프로필 조회 (GET /api/v1/users/profile)
import { fetchMyProfile } from "../../src/services/profile";

export default function ProfileScreen() {
  const params = useLocalSearchParams();

  const [name, setName] = useState("본인 이름");
  const [status, setStatus] = useState("상태 메시지");
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 1) 서버에서 내 프로필 가져오기 (GET)
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyProfile();

        // API 응답 매핑
        setName(data.nickname || data.name || "이름 없음");
        setStatus(data.statusMessage || "");
        setAvatarUri(data.profilePhotoUrl || null);
        setBackgroundUri(data.backgroundPhotoUrl || null);
      } catch (e) {
        console.error("내 프로필 조회 실패:", e);
        Alert.alert("오류", "프로필 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🔹 2) 편집 화면(PUT 완료 후)에서 돌아올 때 UI 업데이트
  useEffect(() => {
    if (params.name) setName(params.name as string);
    if (params.status) setStatus(params.status as string);
    if (params.backgroundUri !== undefined) {
      // 빈 문자열이면 이미지 삭제된 것으로 간주
      setBackgroundUri(
        params.backgroundUri === "" ? null : (params.backgroundUri as string)
      );
    }
    if (params.avatarUri !== undefined) {
      setAvatarUri(
        params.avatarUri === "" ? null : (params.avatarUri as string)
      );
    }
  }, [params]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerSideSpace}>
            {/* 뒤로가기 버튼이 필요하면 여기에 추가 */}
            <Ionicons
              name="chevron-back"
              size={24}
              color="#333"
              onPress={() => router.back()}
            />
          </View>
          <Text style={styles.headerTitle}>프로필</Text>

          <View>
            <Text
              style={styles.editButton}
              onPress={() =>
                // ✅ [API] 수정은 별도 페이지(PUT /api/v1/users/profile)에서 처리
                router.push({
                  pathname: "/profile/edit",
                  params: {
                    name,
                    status,
                    backgroundUri: backgroundUri ?? "",
                    avatarUri: avatarUri ?? "",
                  },
                })
              }
            >
              <Text style={styles.editButtonText}>편집</Text>
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#9997FF" />
          </View>
        ) : (
          <>
            {/* 배경 사진 */}
            <View style={styles.backgroundWrapper}>
              {backgroundUri ? (
                <Image
                  source={{ uri: backgroundUri }}
                  style={styles.backgroundImage}
                />
              ) : (
                <View style={styles.backgroundPlaceholder}>
                  {/* 배경이 없을 때 표시할 내용 */}
                </View>
              )}
            </View>

            {/* 아래 카드 영역 */}
            <View style={styles.bottomCard}>
              <View style={styles.topDivider} />

              {/* 프로필 사진 + 이름 */}
              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="#fff" />
                    </View>
                  )}
                </View>

                <Text style={styles.nameText}>{name}</Text>
              </View>

              {/* 상태 메시지 */}
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
