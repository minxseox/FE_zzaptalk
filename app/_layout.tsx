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

import { restoreSession, onAuthChange } from "../src/lib/authSession";
import { loadTokenWithExpiry } from "../src/lib/authStorage";
import { connectStomp, disconnectStomp } from "../src/services/socket";

const PUBLIC = new Set<string>(["/login", "/signup"]);
const norm = (p: string) => {
  const q = p.split("?")[0].split("#")[0];
  return q === "/" ? "/" : q.replace(/\/+$/, "");
};

// 개발용 우회 (나중에 실제 배포 시 false 또는 제거)
const DEV_BYPASS_AUTH = false;

export default function RootLayout() {
  // ✅ 클라이언트 전용 렌더링 (Hydration 오류 방지)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#9997FF" />
      </View>
    );
  }

  return <RootLayoutContent />;
}

function RootLayoutContent() {
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

  // ✅ 전역 소켓 연결 여부 (중복 연결 방지)
  const socketInitializedRef = useRef(false);

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

    const off = onAuthChange((v) => setLoggedIn(v));

    return () => {
      alive = false;
      off();
    };
  }, []);

  // 2️⃣ 전역 소켓 연결 관리 (로그인 ↔ 로그아웃 전환 시에만)
  useEffect(() => {
    if (!ready) return;

    let alive = true;

    (async () => {
      if (!alive) return;

      if (loggedIn) {
        // ✅ 이미 연결 성공한 상태면 스킵
        if (socketInitializedRef.current) return;

        const data = await loadTokenWithExpiry();
        if (!alive) return;

        // ✅ 토큰 없으면 연결 시도 X (ref도 올리지 않음)
        if (!data?.token) {
          socketInitializedRef.current = false;
          return;
        }

        console.log("[Layout] 전역 소켓 연결 시도...");
        try {
          await connectStomp(data.token);
          if (!alive) return;

          // ✅ 성공 후에만 연결 완료 처리
          socketInitializedRef.current = true;
        } catch (e) {
          console.warn("[Layout] 소켓 연결 실패:", e);
          // ✅ 실패하면 이후 다시 시도 가능하게
          socketInitializedRef.current = false;
        }
      } else {
        // ✅ 로그아웃 시 연결이 되어있었다면 해제
        if (socketInitializedRef.current) {
          console.log("[Layout] 전역 소켓 해제");
          socketInitializedRef.current = false;
          try {
            // disconnectStomp가 async여도 안전하게
            void disconnectStomp();
          } catch {}
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [loggedIn, ready]);

  // 3️⃣ 라우팅 방어 (리다이렉트)
  useEffect(() => {
    if (!rootNav?.key || !ready) return;

    if (DEV_BYPASS_AUTH) return;

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
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#9997FF" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }} />;
}
