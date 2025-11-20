import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      // app/(tabs)/setting/index.tsx
      <TouchableOpacity onPress={() => router.push("/profile" as any)}>
        <Text style={{ fontSize: 16 }}>프로필</Text>
      </TouchableOpacity>
    </View>
  );
}
