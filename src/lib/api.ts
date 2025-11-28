// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Platform } from "react-native";

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
 * BASE URL 설정 (최종 버전)
 *
 * - Web(브라우저):
 *    👉 항상 "/api" 로 고정
 *    👉 NGINX 가 /api → zzaptalk-backend:8080 으로 프록시
 *
 * - Native(App):
 *    👉 EXPO_PUBLIC_API_BASE 가 있으면 사용
 *    👉 없으면 10.0.2.2:8080 (에뮬레이터 → 호스트) 기본값
 * =============================== */
const getBaseUrl = () => {
  // ✅ 1. Web 환경: 환경변수 여부와 관계없이 항상 /api 사용
  if (Platform.OS === "web") {
    return "/api";
  }

  // ✅ 2. Native 환경: .env 를 우선 사용
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) {
    // 혹시라도 슬래시가 겹치지 않도록 끝의 / 제거
    return envBase.replace(/\/+$/, "");
  }

  // ✅ 3. Native 기본값 (로컬 개발용)
  // - Android 에뮬레이터 기준: 10.0.2.2 = 호스트 PC
  return "http://10.0.2.2:8080/api";
};

// ✅ 최종 BASE URL
export const BASE = getBaseUrl();
console.log(`[API] Platform: ${Platform.OS}, BASE: '${BASE}'`);

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
  // 프론트/백엔드가 같은 도메인(/api 프록시) 기준이라서
  // withCredentials 는 있어도 되고 없어도 됨. (쿠키 쓰면 유지)
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
