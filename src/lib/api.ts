// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

/** ===============================
 * 커스텀 에러 클래스
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

/** ===============================
 * ★ BASE URL 설정
 *
 * 요구사항:
 *  1) API_BASE 는 무조건 환경 변수(process.env.REACT_APP_API_URL)에서 읽는다.
 *  2) 값이 비어 있을 때만 기본값(https://api.zzaptalk.com)을 사용한다.
 * =============================== */
const envBase = process.env.REACT_APP_API_URL;

// 값이 없을 때만 기본값 사용 + 경고 로그
if (!envBase) {
  console.warn(
    "[API] REACT_APP_API_URL is not set. Fallback to https://api.zzaptalk.com"
  );
}

// 교수님이 말한 API_BASE 값
export const BASE = (envBase || "https://api.zzaptalk.com").replace(/\/+$/, "");

console.log(`[API] Base URL: ${BASE}`);

/** ===============================
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

/** ===============================
 * Axios 인스턴스
 * =============================== */
export const api = axios.create({
  baseURL: BASE || undefined,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** ===============================
 * 커스텀 필드 확장 (skipAuth)
 * =============================== */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/** ===============================
 * 요청 인터셉터
 * =============================== */
api.interceptors.request.use((config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  config.headers = headers;

  if (config.skipAuth) {
    console.log("[REQ]", config.method?.toUpperCase(), config.url, "skipAuth");
    return config;
  }

  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  const hasAuth = headers.get("Authorization") ? "auth✓" : "auth✗";
  console.log("[REQ]", config.method?.toUpperCase(), config.url, hasAuth);

  return config;
});

/** ===============================
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

      console.warn(
        "[RES ERR]",
        status,
        err.config?.method?.toUpperCase(),
        err.config?.url,
        msg
      );

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

/** ===============================
 * 공통 요청 메서드
 * =============================== */
export async function get<T>(
  url: string,
  params?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.get<T>(url, { params, ...(cfg || {}) });
  return data;
}

export async function post<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.post<T>(url, body, cfg);
  return data;
}

export async function put<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.put<T>(url, body, cfg);
  return data;
}

export async function del<T>(
  url: string,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.delete<T>(url, cfg);
  return data;
}

export async function postText(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<string> {
  const res = await api.post(url, body, {
    responseType: "text",
    transformResponse: (v) => v,
    ...(cfg || {}),
  });
  return res.data as string;
}
