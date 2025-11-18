// app/screens/SignupScreen.tsx
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signup } from "../../src/services/auth";
import styles from "../../src/styles/loginsignup/Signup.module";

const formatPhone = (raw: string) => {
  const only = raw.replace(/\D/g, "").slice(0, 11);
  if (only.length < 4) return only;
  if (only.length < 8) return `${only.slice(0, 3)}-${only.slice(3)}`;
  return `${only.slice(0, 3)}-${only.slice(3, 7)}-${only.slice(7)}`;
};
const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [rrnFront, setRrnFront] = useState("");
  const [rrnBack1, setRrnBack1] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSignup, setLoadingSignup] = useState(false);

  const pwdOk = pwd.length >= 8;
  const pwdSame = pwd.length > 0 && pwd === pwd2;
  const rrnFrontOk = /^\d{6}$/.test(rrnFront);
  const rrnBack1Ok = /^\d$/.test(rrnBack1);
  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      pwdOk &&
      pwdSame &&
      rrnFrontOk &&
      rrnBack1Ok &&
      phoneOk &&
      !loadingSignup,
    [name, pwdOk, pwdSame, rrnFrontOk, rrnBack1Ok, phoneOk, loadingSignup]
  );

  const onChangeRrnFront = (v: string) =>
    setRrnFront(onlyDigits(v).slice(0, 6));
  const onChangeRrnBack1 = (v: string) =>
    setRrnBack1(onlyDigits(v).slice(0, 1));

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (Platform.OS === "web" && typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    if (loadingSignup) return;

    if (!canSubmit) {
      const msgs: string[] = [];
      if (name.trim().length < 2) msgs.push("이름");
      if (!pwdOk) msgs.push("비밀번호(8자 이상)");
      if (!pwdSame) msgs.push("비밀번호 확인 일치");
      if (!rrnFrontOk) msgs.push("주민번호 앞 6자리");
      if (!rrnBack1Ok) msgs.push("주민번호 뒤 첫 1자리");
      if (!phoneOk) msgs.push("전화번호");
      Alert.alert("입력 확인", `${msgs.join(", ")}을(를) 확인해 주세요.`);
      return;
    }

    const payload = {
      phoneNum: phone.replace(/\D/g, ""),
      pwd,
      name: name.trim(),
      rrn: `${rrnFront}${rrnBack1}`,
    };

    try {
      setLoadingSignup(true);
      await signup(payload); // 서버: text/plain 메시지
      Keyboard.dismiss();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      Alert.alert("회원가입 완료", "로그인 화면으로 이동합니다.");
      requestAnimationFrame(() => router.replace("/login"));
    } catch (e: any) {
      Alert.alert("회원가입 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingSignup(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollPad, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단 로고 & 뒤로가기 */}
          <View style={styles.logoHeader}>
            <Pressable style={styles.backAbs} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
            <Image
              source={require("../../src/assets/images/signuplog.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* 이름 */}
          <Text style={styles.label}>이름</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="이름 입력"
            placeholderTextColor="#b7b7c2"
            style={styles.input}
          />

          {/* 비밀번호 */}
          <Text style={styles.label}>비밀번호</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              value={pwd}
              onChangeText={setPwd}
              placeholder="비밀번호 입력"
              placeholderTextColor="#b7b7c2"
              secureTextEntry={!showPwd}
              style={[
                styles.input,
                pwd.length === 0
                  ? null
                  : pwdOk
                  ? styles.inputOk
                  : styles.inputError,
              ]}
            />
            <Pressable
              onPress={() => setShowPwd((v) => !v)}
              style={{ position: "absolute", right: 6, top: 10, padding: 8 }}
            >
              <Text>{showPwd ? "숨김" : "보기"}</Text>
            </Pressable>
          </View>
          {pwd.length > 0 && (
            <Text style={pwdOk ? styles.helperOk : styles.helperErr}>
              {pwdOk
                ? "사용 가능한 비밀번호입니다."
                : "영문/숫자 포함 8자 이상 입력해 주세요."}
            </Text>
          )}

          {/* 비밀번호 확인 */}
          <Text style={styles.label}>비밀번호 확인</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              value={pwd2}
              onChangeText={setPwd2}
              placeholder="비밀번호 확인 입력"
              placeholderTextColor="#b7b7c2"
              secureTextEntry={!showPwd2}
              style={[
                styles.input,
                pwd2.length === 0
                  ? null
                  : pwdSame
                  ? styles.inputOk
                  : styles.inputError,
              ]}
            />
            <Pressable
              onPress={() => setShowPwd2((v) => !v)}
              style={{ position: "absolute", right: 6, top: 10, padding: 8 }}
            >
              <Text>{showPwd2 ? "숨김" : "보기"}</Text>
            </Pressable>
          </View>
          {pwd2.length > 0 && (
            <Text style={pwdSame ? styles.helperOk : styles.helperErr}>
              {pwdSame
                ? "비밀번호가 일치합니다."
                : "비밀번호가 일치하지 않습니다."}
            </Text>
          )}

          {/* 주민등록번호 */}
          <Text style={styles.label}>주민등록번호</Text>
          <View style={styles.rrnRow}>
            <View style={styles.rrnFrontBox}>
              <TextInput
                value={rrnFront}
                onChangeText={onChangeRrnFront}
                keyboardType="number-pad"
                placeholder="앞 6자리"
                placeholderTextColor="#b7b7c2"
                style={styles.rrnFrontInput}
                maxLength={6}
              />
            </View>
            <Text style={styles.hypen}>-</Text>
            <View style={styles.rrnBackBox}>
              <TextInput
                value={rrnBack1}
                onChangeText={onChangeRrnBack1}
                keyboardType="number-pad"
                style={styles.rrnBackFirstInput}
                maxLength={1}
              />
              <Text style={styles.rrnDots}>••••••</Text>
            </View>
          </View>
          {(rrnFront.length > 0 || rrnBack1.length > 0) && (
            <Text
              style={
                rrnFrontOk && rrnBack1Ok ? styles.helperOk : styles.helperErr
              }
            >
              {rrnFrontOk && rrnBack1Ok
                ? "형식이 올바릅니다."
                : "앞 6자리와 뒤 1자리를 입력해 주세요."}
            </Text>
          )}

          {/* 전화번호 */}
          <Text style={styles.label}>전화번호</Text>
          <TextInput
            value={formatPhone(phone)}
            onChangeText={(v) => setPhone(onlyDigits(v).slice(0, 11))}
            keyboardType="phone-pad"
            placeholder="휴대전화 번호 입력"
            placeholderTextColor="#b7b7c2"
            style={[
              styles.input,
              phone.length === 0
                ? null
                : phoneOk
                ? styles.inputOk
                : styles.inputError,
            ]}
          />

          {/* 회원가입 버튼 */}
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loadingSignup}
            style={({ pressed }) => [
              styles.submitBtn,
              (!canSubmit || loadingSignup) && styles.submitBtnDisabled,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit || loadingSignup }}
          >
            <Text style={styles.submitText}>
              {loadingSignup ? "가입 중..." : "회원가입 완료"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
