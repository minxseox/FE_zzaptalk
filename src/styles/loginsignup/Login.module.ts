import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },

  /** 공통 로고 헤더: 높이 고정해서 회원가입과 Y위치 동일 */
  logoHeader: {
    marginTop: 60,
    height: 200, // ← 필요시 160~220 사이에서 같이 조절
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 16,
    position: "relative",
  },
  logoImg: { width: 120, height: 120 },

  /** 폼 */
  form: {
    marginTop: 12,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  /** 체크박스 */
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: { borderColor: "#9DA9FF", backgroundColor: "#E6E9FF" },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5b6cff",
  },
  checkboxLabel: { fontSize: 12, color: "#555" },

  /** 버튼 */
  loginBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#C4C3FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: "#2b2366", fontWeight: "700", fontSize: 16 },

  /** 하단 링크 */
  linksRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  linkText: { fontSize: 12, color: "#6a6a6a", textDecorationLine: "underline" },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#cfcfcf",
    marginHorizontal: 8,
  },
});
