// src/lib/authStorage.ts
import { Platform } from "react-native";

const TOKEN_KEY = "zzap_token";
const EXPIRES_KEY = "zzap_token_expires"; // epoch ms

let memoryToken: string | null = null;
let memoryExpiresAt: number | null = null;

async function setItem(key: string, val: string) {
  if (Platform.OS === "web") localStorage.setItem(key, val);
  else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, val);
  }
}
async function getItem(key: string) {
  if (Platform.OS === "web") return localStorage.getItem(key);
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}
async function delItem(key: string) {
  if (Platform.OS === "web") localStorage.removeItem(key);
  else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveTokenWithExpiry(token: string, expiresAtMs: number) {
  memoryToken = token;
  memoryExpiresAt = expiresAtMs;
  await setItem(TOKEN_KEY, token);
  await setItem(EXPIRES_KEY, String(expiresAtMs));
}

export async function loadTokenWithExpiry(): Promise<{
  token: string | null;
  expiresAtMs: number | null;
}> {
  if (memoryToken && memoryExpiresAt)
    return { token: memoryToken, expiresAtMs: memoryExpiresAt };
  const [t, e] = await Promise.all([getItem(TOKEN_KEY), getItem(EXPIRES_KEY)]);
  memoryToken = t;
  memoryExpiresAt = e ? Number(e) : null;
  return { token: memoryToken, expiresAtMs: memoryExpiresAt };
}

export async function clearTokenAll() {
  memoryToken = null;
  memoryExpiresAt = null;
  await delItem(TOKEN_KEY);
  await delItem(EXPIRES_KEY);
}
