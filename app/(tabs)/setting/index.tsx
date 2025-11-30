// app/(tabs)/setting/index.tsx
import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";

// ✅ 로그아웃 API & 토큰 삭제 유틸 불러오기
import { logout } from "../../../src/services/auth";
import { clearAuthTokens } from "../../../src/lib/authStorage";

export default function SettingsScreen() {
  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive", // 아이폰에서 빨간색으로 표시됨
        onPress: async () => {
          try {
            // 1. 서버에 로그아웃 요청
            await logout();

            // 2. 로컬에 저장된 토큰 삭제
            await clearAuthTokens();

            console.log("로그아웃 되었습니다.");

            // 3. 로그인/시작 화면으로 이동 (뒤로가기 방지 위해 replace 사용)
            // 경로는 프로젝트 구조에 맞게 수정 (예: "/login" 등)
            router.replace("/");
          } catch (e) {
            console.error("로그아웃 실패", e);
            Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.description}>
          현재 로그인된 계정에서 로그아웃 합니다.
        </Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center", // 화면 중앙 정렬
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  logoutButton: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#FF4444", // 로그아웃은 보통 빨간색 계열 사용
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2, // 안드로이드 그림자
    shadowColor: "#000", // iOS 그림자
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
