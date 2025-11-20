import {
  Stack,
  usePathname,
  useRouter,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { restoreSession, onAuthChange } from "../src/lib/authSession";
import { useFonts } from "expo-font";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import "../global-icons.css";

const PUBLIC = new Set<string>(["/login", "/signup"]);
const norm = (p: string) => {
  const q = p.split("?")[0].split("#")[0];
  return q === "/" ? "/" : q.replace(/\/+$/, "");
};

// 🔥 서버 안 돌아갈 때만 true 로 두기 (나중에 꼭 false/삭제)
const DEV_BYPASS_AUTH = true;

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const rootNav = useRootNavigationState();

  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const lastRedirect = useRef<string>("");

  const isWeb = Platform.OS === "web";
  const [fontsLoaded] = useFonts(
    isWeb ? {} : { ...Ionicons.font, ...MaterialIcons.font }
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      (document.activeElement as any)?.blur?.();
    } catch {}
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // DEV_BYPASS_AUTH 켜져 있어도 그냥 세션 복구 시도는 해도 되고,
      // 귀찮으면 이 블록도 조건으로 감싸도 됨.
      const ok = await restoreSession();
      if (!alive) return;
      setLoggedIn(!!ok);
      setReady(true);
    })();
    const off = onAuthChange((v) => setLoggedIn(v));
    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    if (!rootNav?.key || !ready) return;

    // ✅ 개발용: 인증 우회 시 리다이렉트 로직 자체를 막음
    if (DEV_BYPASS_AUTH) {
      return;
    }

    const curr = norm(pathname);
    let to: string | null = null;

    if (!loggedIn && !PUBLIC.has(curr)) {
      to = "/login";
    }

    if (loggedIn && (curr === "/login" || curr === "/signup")) {
      to = "/chatlist";
    }

    if (to && to !== curr && lastRedirect.current !== to) {
      lastRedirect.current = to;
      router.replace(to as any);
    }
  }, [rootNav?.key, ready, loggedIn, pathname, router]);

  if (!fontsLoaded || !ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }} />;
}
