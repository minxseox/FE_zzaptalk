// app/_layout.tsx
import {
  Stack,
  usePathname,
  useRouter,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import "../global-icons.css";

// ✅ 기존 라이브러리 Import
import { restoreSession, onAuthChange } from "../src/lib/authSession";
// ✅ 추가: 토큰 가져오기 및 소켓 함수 Import
import { loadTokenWithExpiry } from "../src/lib/authStorage";
import { connectStomp, disconnectStomp } from "../src/services/socket";

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

  // 웹 포커스 처리
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      (document.activeElement as any)?.blur?.();
    } catch {}
  }, [pathname]);

  // 1️⃣ 초기 세션 복구 & 로그인 상태 감지
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await restoreSession();
      if (!alive) return;
      setLoggedIn(!!ok);
      setReady(true);
    })();

    // 로그인 상태가 바뀌면(로그인/로그아웃) loggedIn 업데이트
    const off = onAuthChange((v) => setLoggedIn(v));
    return () => {
      alive = false;
      off();
    };
  }, []);

  // 2️⃣ ✅ [신규] 전역 소켓 연결 관리 (로그인 상태에 따라)
  useEffect(() => {
    if (!ready) return;

    const manageSocket = async () => {
      if (loggedIn) {
        // 로그인 상태: 토큰 꺼내서 소켓 연결
        const data = await loadTokenWithExpiry();
        if (data?.token) {
          console.log("[Layout] 전역 소켓 연결 시도...");
          connectStomp(data.token).catch((e) =>
            console.warn("[Layout] 소켓 연결 실패:", e)
          );
        }
      } else {
        // 로그아웃 상태: 소켓 끊기
        console.log("[Layout] 전역 소켓 해제");
        disconnectStomp();
      }
    };

    manageSocket();
  }, [loggedIn, ready]); // loggedIn이 바뀔 때마다 실행

  // 3️⃣ 라우팅 방어 (리다이렉트)
  useEffect(() => {
    if (!rootNav?.key || !ready) return;

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
