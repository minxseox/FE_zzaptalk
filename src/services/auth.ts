// src/services/auth.ts
import { post, ApiError, setApiAuthToken } from "../lib/api";
import { saveTokenWithExpiry } from "../lib/authStorage";
import { parseJwt } from "../lib/jwt";

/* =========================
 * 타입
 * ========================= */
export type LoginPayload = {
  phoneNum?: string;
  email?: string;
  zzapID?: string;
  pwd: string;
};

type AuthLoginResponse =
  | string
  | {
      accessToken?: string;
      token?: string;
      data?: { accessToken?: string; token?: string };
    };

export type SignupPayload = {
  phoneNum: string;
  pwd: string;
  name: string;
  rrn: string; // 주민번호 뒤 7자리
};

/* =========================
 * 회원가입 (인증 불필요)
 * POST /api/v1/users/signup
 * ========================= */
export async function signup(payload: SignupPayload): Promise<void> {
  const phone = (payload.phoneNum || "").replace(/\D/g, "");
  const pwd = (payload.pwd || "").trim();
  const name = (payload.name || "").trim();
  const rrn = (payload.rrn || "").replace(/\D/g, "").slice(0, 7);

  if (phone.length < 10 || phone.length > 11) {
    throw new ApiError("휴대폰 번호를 정확히 입력해 주세요.", 400, null);
  }
  if (!pwd) throw new ApiError("비밀번호를 입력해 주세요.", 400, null);
  if (!name) throw new ApiError("이름을 입력해 주세요.", 400, null);
  if (rrn.length !== 7) {
    throw new ApiError("주민번호 뒷자리 7자리를 입력해 주세요.", 400, null);
  }

  const body = { phoneNum: phone, pwd, name, rrn };

  // 인증 불필요 엔드포인트이므로 skipAuth 지정
  await post("/api/v1/users/signup", body, { skipAuth: true });
}

/* =========================
 * 로그인 (토큰 저장/설정)
 * POST /api/v1/users/login
 * ========================= */
export async function login(payload: LoginPayload): Promise<string> {
  // 입력 정리
  const pwd = (payload.pwd || "").trim();
  const phone = (payload.phoneNum || "").replace(/\D/g, "");
  const email = (payload.email || "").trim();
  const zzapID = (payload.zzapID || "").trim();

  // 기본 검증
  if (!pwd) {
    throw new ApiError("비밀번호는 필수로 입력해야 합니다.", 400, null);
  }
  if (!phone && !email && !zzapID) {
    throw new ApiError(
      "전화번호/이메일/ID 중 하나를 입력해 주세요.",
      400,
      null
    );
  }

  // 요청 바디 구성
  const body: Record<string, string> = { pwd };
  if (phone) body.phoneNum = phone;
  else if (email) body.email = email;
  else body.zzapID = zzapID;

  // 인증 불필요 엔드포인트 → skipAuth:true
  const res = (await post<AuthLoginResponse>("/api/v1/users/login", body, {
    skipAuth: true,
  })) as AuthLoginResponse;

  // 토큰 추출 (문자열/객체 응답 모두 지원)
  const rawToken =
    typeof res === "string"
      ? res
      : res?.accessToken ??
        res?.token ??
        res?.data?.accessToken ??
        res?.data?.token ??
        "";

  if (!rawToken) {
    throw new ApiError("로그인 응답에 토큰이 없습니다.", 500, res);
  }

  const finalToken = String(rawToken).trim().replace(/^"|"$/g, "");

  // 토큰 저장 & 만료 처리
  try {
    const jwtPayload = parseJwt(finalToken);
    const expSeconds = jwtPayload?.exp; // 초 단위
    const expiresAtMs = expSeconds
      ? expSeconds * 1000
      : Date.now() + 60 * 60 * 1000; // fallback 1h

    setApiAuthToken(finalToken);
    await saveTokenWithExpiry(finalToken, expiresAtMs);
  } catch (err) {
    setApiAuthToken(finalToken);
    // eslint-disable-next-line no-console
    console.error("[auth.ts] 로그인 후 토큰 저장/설정 실패", err);
  }

  return finalToken;
}
