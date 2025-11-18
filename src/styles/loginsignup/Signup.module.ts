import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24, // 👈 로그인과 동일
    justifyContent: "center",
  },
  scrollPad: { paddingHorizontal: 24, paddingBottom: 24 },

  /** 상단: 뒤로가기 절대배치 + 고정 높이 로고 (로그인과 동일 Y) */
  logoHeader: {
    height: 180, // ← 로그인과 동일 값
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  backAbs: {
    position: "absolute",
    left: 8,
    top: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: { fontSize: 28, color: "#222" },
  logoImg: { width: 120, height: 120, resizeMode: "contain" },

  form: {
    width: "100%",
    maxWidth: 400, // 로그인과 동일한 폭
    alignSelf: "center", // 가운데 정렬
    paddingHorizontal: 20,
    marginTop: 16, // 살짝 안쪽 여백
  },
  /** 레이블/인풋 */
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
    fontSize: 14,
    paddingHorizontal: 6,
  },
  inputError: { borderColor: "#ff6b6b" },
  inputOk: { borderColor: "#7fb77e" },

  helper: { fontSize: 12, color: "#888", marginTop: 6 },
  helperOk: { fontSize: 12, color: "#2e7d32", marginTop: 6 },
  helperErr: { fontSize: 12, color: "#c62828", marginTop: 6 },

  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },

  /** 주민번호 */
  rrnRow: { flexDirection: "row", alignItems: "center" },
  rrnFrontBox: { flex: 1 },
  rrnFrontInput: {
    height: 44,
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
    fontSize: 14,
    paddingHorizontal: 6,
  },
  hypen: { marginHorizontal: 10, color: "#666" },
  rrnBackBox: { flexDirection: "row", alignItems: "center" },
  rrnBackFirstInput: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 16,
    marginRight: 8,
  },
  rrnDots: { letterSpacing: 2, color: "#222" },

  /** 전화번호/인증요청 */
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex1: { flex: 1 },
  reqBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F1F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DFE3FF",
  },
  reqBtnDisabled: { opacity: 0.5 },
  reqBtnText: { fontSize: 12, color: "#5b6cff", fontWeight: "700" },

  /** 인증 입력/타이머/확인 */
  verifyRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timer: {
    width: 52,
    textAlign: "center",
    fontWeight: "700",
    color: "#5b6cff",
  },
  timerExpired: { color: "#b0b0b0" },
  verifyBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#E6E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { fontSize: 12, color: "#2b2366", fontWeight: "700" },

  /** 제출 버튼 */
  submitBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#C4C3FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#2b2366", fontWeight: "700", fontSize: 16 },
});
