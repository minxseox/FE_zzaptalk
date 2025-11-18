// src/components/chat/ChatHeader.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import styles from "../../styles/chat/ChatHeader.module";

export default function ChatHeader({ name }: { name?: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.leftGroup}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#4b4b4b" />
        </Pressable>

        {/* 이름은 있을 때만 보여주기 */}
        {name ? (
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
        ) : (
          // 레이아웃 흔들림 방지: 빈 자리 유지 (원하면 완전 제거해도 됨)
          <View style={{ minWidth: 80 }} />
        )}
      </View>

      <View style={styles.rightGroup}>
        <Pressable style={styles.iconBtn}>
          <Ionicons name="search" size={20} color="#6a6a6a" />
        </Pressable>
        <Pressable style={styles.iconBtn}>
          <Feather name="menu" size={22} color="#6a6a6a" />
        </Pressable>
      </View>
    </View>
  );
}
