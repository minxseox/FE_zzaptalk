import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { restoreSession, onAuthChange } from "../src/lib/authSession";

export default function IndexGate() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

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

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // 🔥 로그인 = /chatlist
  return <Redirect href={loggedIn ? "/chatlist" : "/login"} />;
}
