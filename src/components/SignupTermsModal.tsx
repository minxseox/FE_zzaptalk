// src/components/SignupTermsModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void; // 둘 다 동의했을 때만 호출
};

export default function SignupTermsModal({
  visible,
  onClose,
  onConfirm,
}: Props) {
  const router = useRouter();
  const [agreePrivacy, setAgreePrivacy] = useState(false); // 개인정보 처리방침
  const [agreeService, setAgreeService] = useState(false); // 서비스 이용약관

  const allAgreed = agreePrivacy && agreeService;

  const handleConfirm = () => {
    if (!allAgreed) {
      return;
    }
    onConfirm();
    // 다음 번에 열릴 때 다시 체크하도록 상태 초기화
    setAgreePrivacy(false);
    setAgreeService(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>약관 동의</Text>

          {/* 개인정보 처리방침 */}
          <View style={styles.row}>
            <Pressable
              onPress={() => setAgreePrivacy((v) => !v)}
              style={[styles.checkBox, agreePrivacy && styles.checkBoxOn]}
            >
              {agreePrivacy && <Text style={styles.checkText}>✓</Text>}
            </Pressable>
            <Text style={styles.label}>개인정보 처리방침 (필수)</Text>
            <Pressable
              onPress={() => {
                onClose();
                router.push("/policy" as Href);
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>전체보기</Text>
            </Pressable>
          </View>

          {/* 서비스 이용약관 */}
          <View style={styles.row}>
            <Pressable
              onPress={() => setAgreeService((v) => !v)}
              style={[styles.checkBox, agreeService && styles.checkBoxOn]}
            >
              {agreeService && <Text style={styles.checkText}>✓</Text>}
            </Pressable>
            <Text style={styles.label}>서비스 이용약관 (필수)</Text>
            <Pressable
              onPress={() => {
                onClose();
                router.push("/terms" as Href);
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>전체보기</Text>
            </Pressable>
          </View>

          {/* 버튼들 */}
          <Pressable
            onPress={handleConfirm}
            style={[styles.primaryBtn, !allAgreed && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryText}>동의하고 가입하기</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "85%",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkBoxOn: {
    backgroundColor: "#4C70FF",
    borderColor: "#4C70FF",
  },
  checkText: {
    color: "#fff",
    fontSize: 12,
  },
  label: {
    fontSize: 14,
  },
  linkBtn: {
    marginLeft: "auto",
  },
  linkText: {
    color: "#4C70FF",
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4C70FF",
    alignItems: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#ccc",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
  },
});
