// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

/* ===============================
 * 커스텀 ApiError 클래스
 * =============================== */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/* ===============================
 * BASE URL 설정 (배포 대응 수정 버전)
 *
 * 1. .env 설정이 있으면 최우선 (EXPO_PUBLIC_API_BASE)
 * 2. 개발 환경: localhost:8080/api
 * 3. 배포 환경: https://api.zzaptalk.com/api (여기가 핵심!)
 * =============================== */
const getBaseUrl = () => {
  // 1. .env 에서 EXPO_PUBLIC_API_BASE 가 오면 최우선 사용
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) {
    // 혹시 모를 끝부분 슬래시 제거 후 반환
    return envBase.replace(/\/+$/, "");
  }

  // 2. 개발 환경 (npm start / npx expo start)
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8080/api";
  }

  // 3. 배포(Production) 환경 기본값
  // ❌ 수정 전: return "/api"; (이건 같은 도메인일 때만 유효)
  // ✅ 수정 후: 명시적으로 배포 서버 도메인 + /api 포함
  return "https://api.zzaptalk.com/api";
};

// ✅ 최종 BASE URL
export const BASE = getBaseUrl();
console.log(`[API] BASE: '${BASE}'`);

/* ===============================
 * 전역 토큰 캐시
 * =============================== */
let AUTH_TOKEN: string | null = null;

export function setApiAuthToken(token: string | null) {
  AUTH_TOKEN = token;
  if (token) {
    (api.defaults.headers as any).common["Authorization"] = `Bearer ${token}`;
  } else {
    delete (api.defaults.headers as any).common["Authorization"];
  }
}

export function clearApiAuthToken() {
  setApiAuthToken(null);
}

/* ===============================
 * Axios 인스턴스
 * =============================== */
export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ===============================
 * Axios 추가 타입
 * =============================== */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/* ===============================
 * 요청 인터셉터
 * =============================== */
api.interceptors.request.use((config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  config.headers = headers;

  // 토큰 스킵 옵션
  if (config.skipAuth) return config;

  // Authorization 헤더가 없고, 전역 토큰이 있으면 자동 주입
  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  return config;
});

/* ===============================
 * 응답 인터셉터
 * =============================== */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data as any;
      const msg =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.error ||
        data?.msg ||
        `HTTP ${status}`;
      return Promise.reject(new ApiError(msg, status, data));
    }
    if (err.request) {
      return Promise.reject(
        new ApiError("네트워크 오류 또는 서버 응답 없음", 0, null)
      );
    }
    return Promise.reject(
      new ApiError(err.message || "알 수 없는 오류", -1, null)
    );
  }
);

/* ===============================
 * 편의 함수들 (GET/POST/PUT/DELETE)
 * =============================== */
export async function get<T>(
  url: string,
  params?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.get<T>(url, { params, ...(cfg || {}) });
  return data;
}

export async function post<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.post<T>(url, body, cfg);
  return data;
}

export async function put<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.put<T>(url, body, cfg);
  return data;
}

export async function del<T>(url: string, cfg?: AxiosRequestConfig) {
  const { data } = await api.delete<T>(url, cfg);
  return data;
}

export async function postText(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const res = await api.post(url, body, {
    responseType: "text",
    transformResponse: (v) => v,
    ...(cfg || {}),
  });
  return res.data as string;
}
