// app/policy.tsx
import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function PolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{ marginBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 18 }}>‹ 뒤로</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>
        개인정보 처리방침
      </Text>

      <Text style={{ lineHeight: 20 }}>
        {/* TODO: 여기 짭톡 개인정보처리방침 전문 넣기 */}임시 개인정보 처리방침
        내용
      </Text>
    </ScrollView>
  );
}
