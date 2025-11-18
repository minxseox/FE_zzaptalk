// src/lib/authSession.ts
import { setApiAuthToken } from "./api";
import { parseJwt } from "./jwt";
import {
  clearTokenAll,
  loadTokenWithExpiry,
  saveTokenWithExpiry,
} from "./authStorage";

type Listener = (loggedIn: boolean) => void;
const listeners = new Set<Listener>();
export const onAuthChange = (fn: Listener) => (
  listeners.add(fn), () => listeners.delete(fn)
);
function emit(v: boolean) {
  listeners.forEach((f) => f(v));
}

let logoutTimer: any = null;

export async function startSession(token: string, expiresInMs?: number) {
  const payload = parseJwt(token);
  const expiresAt = payload?.exp
    ? payload.exp * 1000
    : expiresInMs && expiresInMs > 0
    ? Date.now() + expiresInMs
    : Date.now() + 60 * 60 * 1000; // fallback 1h

  await saveTokenWithExpiry(token, expiresAt);
  setApiAuthToken(token);
  scheduleAutoLogout(expiresAt);
  emit(true);
}

export async function restoreSession() {
  const { token, expiresAtMs } = await loadTokenWithExpiry();
  if (!token || !expiresAtMs || Date.now() >= expiresAtMs) {
    await endSession();
    return false;
  }
  setApiAuthToken(token);
  scheduleAutoLogout(expiresAtMs);
  emit(true);
  return true;
}

export async function endSession() {
  setApiAuthToken(null);
  clearTimeout(logoutTimer as any);
  logoutTimer = null;
  await clearTokenAll();
  emit(false);
}

function scheduleAutoLogout(expiresAt: number) {
  clearTimeout(logoutTimer as any);
  const ms = Math.max(0, expiresAt - Date.now());
  logoutTimer = setTimeout(() => {
    endSession();
  }, ms);
}

export async function getRemainingMs() {
  const { expiresAtMs } = await loadTokenWithExpiry();
  if (!expiresAtMs) return 0;
  return Math.max(0, expiresAtMs - Date.now());
}
