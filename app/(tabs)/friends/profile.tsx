// app/(tabs)/friends/profile.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../../../src/styles/friends/Profile.module";

const MY_NAME = "본인 이름"; // 나중에 실제 이름/닉네임으로 교체

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        {/* 왼쪽 공간(정렬용) */}
        <View style={styles.headerSpacer} />

        <Text style={styles.headerTitle}>프로필</Text>

        <Pressable
          style={styles.editButton}
          onPress={() => {
            // TODO: 편집 화면 이동 연결
          }}
        >
          <Text style={styles.editButtonText}>편집</Text>
        </Pressable>
      </View>

      {/* 본문 */}
      <View style={styles.content}>
        {/* 배경사진 영역 */}
        <View style={styles.backgroundBox}>
          <Text style={styles.backgroundText}>배경사진</Text>
        </View>

        {/* 프로필 사진 + 이름 (배경 박스에 겹쳐 보이게) */}
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <Text style={styles.myName}>{MY_NAME}</Text>
        </View>

        {/* 상태 메시지 */}
        <Text style={styles.statusMessage}>상태 메시지</Text>
      </View>
    </SafeAreaView>
  );
}
