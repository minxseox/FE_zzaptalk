import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
  Keyboard,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../../src/styles/loginsignup/Login.module";
import { login } from "../../src/services/auth";
import { startSession } from "../../src/lib/authSession";
import { ApiError } from "../../src/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!errorMsg) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [errorMsg, fadeAnim]);

  const formatPhone = (raw: string) => {
    const only = raw.replace(/\D/g, "").slice(0, 11);
    if (only.length < 4) return only;
    if (only.length < 8) return `${only.slice(0, 3)}-${only.slice(3)}`;
    return `${only.slice(0, 3)}-${only.slice(3, 7)}-${only.slice(7)}`;
  };

  const canSubmit = useMemo(() => {
    const phoneOk = /^\d{3}-\d{3,4}-\d{4}$/.test(phone);
    return phoneOk && password.trim().length > 0 && !loading;
  }, [phone, password, loading]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      Keyboard.dismiss();

      // 1) 로그인 호출 (객체 반환)
      const res: any = await login({
        phoneNum: phone.replace(/\D/g, ""),
        pwd: password.trim(),
      });

      // 2) 토큰 안전 추출: 문자열/객체 모두 대응
      const token =
        typeof res === "string"
          ? String(res).trim().replace(/^"|"$/g, "")
          : String(res?.accessToken || res?.token || "");

      if (!token) {
        setErrorMsg("로그인 응답에 토큰이 없어요.");
        return;
      }

      // 3) 세션 시작 → axios에 Authorization 세팅
      await startSession(token);

      // 4) 홈으로 이동 (index → /chat으로 보냄)
      router.replace("/");
    } catch (err: any) {
      console.error("로그인 실패:", err);

      if (err instanceof ApiError) {
        // 400 / 401: 아이디·비번 문제
        if (err.status === 400 || err.status === 401) {
          setErrorMsg("전화번호 또는 비밀번호를 다시 확인해 주세요.");
        }
        // 5xx, 네트워크(0): 서버/통신 문제
        else if (err.status >= 500 || err.status === 0) {
          setErrorMsg(
            "서버 오류로 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
        // 그 외 코드들
        else {
          setErrorMsg("로그인에 실패했습니다. 다시 시도해 주세요.");
        }
      } else {
        // ApiError 가 아닌 예외
        setErrorMsg("로그인에 실패했습니다. 네트워크 상태를 확인해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 56,
            paddingHorizontal: 20,
            paddingBottom: 40,
            justifyContent: "flex-start",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoHeader}>
            <Image
              source={require("../../src/assets/images/loginlog.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>전화번호</Text>
            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(formatPhone(v))}
              keyboardType={Platform.OS === "web" ? "default" : "phone-pad"}
              placeholder="010-0000-0000"
              placeholderTextColor="#b7b7b7"
              style={styles.input}
              maxLength={13}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor="#b7b7b7"
              secureTextEntry
              style={styles.input}
              onSubmitEditing={onSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />

            {errorMsg && (
              <Animated.View style={{ opacity: fadeAnim, marginTop: 10 }}>
                <Text style={{ color: "#ff4d4d", textAlign: "center" }}>
                  {errorMsg}
                </Text>
              </Animated.View>
            )}

            <Pressable
              style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "로그인 중..." : "로그인"}
              </Text>
            </Pressable>

            <View style={styles.linksRow}>
              <Pressable onPress={() => alert("아이디 찾기")}>
                <Text style={styles.linkText}>아이디 찾기</Text>
              </Pressable>
              <View style={styles.dot} />
              <Pressable onPress={() => alert("비밀번호 찾기")}>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </Pressable>
              <View style={styles.dot} />
              <Pressable onPress={() => router.push("/signup")}>
                <Text style={styles.linkText}>회원가입</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
