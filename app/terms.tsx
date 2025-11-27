// app/terms.tsx
import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{ marginBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 18 }}>‹ 뒤로</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>
        서비스 이용약관
      </Text>

      <Text style={{ lineHeight: 20 }}>
        {/* TODO: 여기 짭톡 이용약관 전문 넣기 */}이 곳에 짭톡 서비스 이용약관
        내용을 작성해 주세요.
      </Text>
    </ScrollView>
  );
}
