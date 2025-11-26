import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    // 모바일에서 너무 꽉 차지 않도록 최소한의 여백
    paddingHorizontal: 24,
  },

  /** 상단 로고 헤더 */
  logoHeader: {
    marginTop: 60,
    height: 200,
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 10,
    position: "relative",
  },

  // 뒤로가기 버튼
  backAbs: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: "center",
    zIndex: 10,
  },
  backButtonText: { fontSize: 24, color: "#222" },
  logoImg: { width: 120, height: 120, resizeMode: "contain" },

  /** * [핵심 설정] 폼 컨테이너
   * 1. width: "100%" -> 모바일에서는 꽉 차게
   * 2. maxWidth: 300 -> PC/태블릿에서는 300px까지만 늘어나게 (길이 제한)
   * 3. alignSelf: "center" -> 화면 중앙에 배치
   */
  form: {
    width: "100%",
    maxWidth: 300, // 👈 길이를 300으로 줄임 (더 슬림하게)
    alignSelf: "center", // 👈 중앙 정렬
    marginTop: 12,
  },

  /** 레이블 */
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginTop: 20,
    marginBottom: 8,
  },

  /** 입력창 (밑줄 스타일 유지) */
  input: {
    height: 40, // 길이도 줄었으니 높이도 살짝 컴팩트하게 (44->40)
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
    fontSize: 14,
    paddingHorizontal: 4,
    color: "#222",
  },

  inputError: { borderColor: "#ff6b6b", borderBottomWidth: 1.5 },
  inputOk: { borderColor: "#5b6cff", borderBottomWidth: 1.5 },

  helper: { fontSize: 12, color: "#999", marginTop: 6 },
  helperOk: { fontSize: 12, color: "#2e7d32", marginTop: 6 },
  helperErr: { fontSize: 12, color: "#c62828", marginTop: 6 },

  /** 주민번호 */
  rrnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rrnFrontBox: { flex: 1 },
  rrnFrontInput: {
    height: 40,
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
    fontSize: 14,
    textAlign: "center",
    color: "#222",
  },
  hypen: { marginHorizontal: 8, color: "#aaa" },
  rrnBackBox: { flex: 1, flexDirection: "row", alignItems: "center" },
  rrnBackFirstInput: {
    width: 32, // 전체 폭이 줄었으니 이 박스도 살짝 줄임
    height: 36,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 16,
    marginRight: 8,
    color: "#222",
  },
  rrnDots: { letterSpacing: 3, color: "#ccc", fontSize: 20, marginTop: 4 },

  /** 전화번호 & 인증 */
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex1: { flex: 1 },

  reqBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F1F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  reqBtnDisabled: { backgroundColor: "#f5f5f5" },
  reqBtnText: { fontSize: 11, color: "#5b6cff", fontWeight: "700" },

  verifyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  timer: {
    width: 40,
    textAlign: "center",
    fontWeight: "700",
    color: "#5b6cff",
    fontSize: 12,
  },
  timerExpired: { color: "#bbb" },
  verifyBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: "#E6E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { fontSize: 11, color: "#2b2366", fontWeight: "700" },

  /** 제출 버튼 */
  submitBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#C4C3FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    width: "100%", // form 너비(300px)에 맞춰 꽉 차게
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#2b2366", fontWeight: "700", fontSize: 16 },
});
