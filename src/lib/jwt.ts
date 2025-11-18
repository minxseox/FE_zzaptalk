// src/lib/jwt.ts
export type JWTPayload = { exp?: number; iat?: number; [k: string]: any };

export function parseJwt(token: string): JWTPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    // atob 결과가 UTF-8일 수 있어 decodeURIComponent로 정리
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}
