// app/profile/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import styles from "../../src/styles/profile/Profile.module";
import { fetchMyProfile } from "../../src/services/profile";

export default function ProfileScreen() {
  const params = useLocalSearchParams();

  const [name, setName] = useState("본인 이름");
  const [status, setStatus] = useState("상태 메시지");
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 1) 처음 마운트될 때 서버에서 내 프로필 가져오기
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyProfile();

        // UI에서는 nickname을 표시 이름으로 사용
        setName(data.nickname || data.name || "본인 이름");
        setStatus(data.statusMessage || "상태 메시지");
        setAvatarUri(data.profilePhotoUrl || null);
        setBackgroundUri(data.backgroundPhotoUrl || null);
      } catch (e) {
        console.error("내 프로필 조회 실패:", e);
        Alert.alert("프로필 불러오기 실패", "다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🔹 2) 편집 화면에서 돌아올 때 넘겨준 params 가 있으면 그걸로 덮어쓰기
  useEffect(() => {
    if (params.name) setName(params.name as string);
    if (params.status) setStatus(params.status as string);
    if (params.backgroundUri && params.backgroundUri !== "") {
      setBackgroundUri(params.backgroundUri as string);
    }
    if (params.avatarUri && params.avatarUri !== "") {
      setAvatarUri(params.avatarUri as string);
    }
  }, [params.name, params.status, params.backgroundUri, params.avatarUri]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerSideSpace} />
          <Text style={styles.headerTitle}>프로필</Text>

          <View>
            <Text
              style={styles.editButton}
              onPress={() =>
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

        {/* 로딩 중이면 가운데 인디케이터 */}
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator />
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
                  <Text style={styles.backgroundPlaceholderText}>배경사진</Text>
                </View>
              )}
            </View>

            {/* 아래 카드 */}
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
                      <Ionicons name="person" size={40} color="#8a8a8a" />
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
