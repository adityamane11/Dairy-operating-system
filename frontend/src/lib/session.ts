// Session: who is logged in (admin / farmer / none)
import { storage } from "@/src/utils/storage";
import type { Farmer } from "@/src/lib/api";

const KEY = "siddhnath_session_v1";

export type Session =
  | { role: "admin"; dairyName: string }
  | { role: "farmer"; farmer: Farmer }
  | null;

export async function saveSession(s: Session) {
  if (s == null) {
    await storage.removeItem(KEY);
  } else {
    await storage.setItem(KEY, JSON.stringify(s));
  }
}

export async function loadSession(): Promise<Session> {
  const raw = await storage.getItem<string>(KEY, "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await storage.removeItem(KEY);
}
