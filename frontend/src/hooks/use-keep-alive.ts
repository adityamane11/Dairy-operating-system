// Keep-alive ping — prevents free-tier backend (Render/Railway/etc.) from
// going to sleep after inactivity. Pings /api/health every 4 minutes.
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const PING_INTERVAL_MS = 240_000; // 4 minutes

export function useKeepAlive() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!base) return;

    const url = `${base}/api/health`;

    const ping = () => {
      fetch(url, { method: "GET" })
        .then(() => {})
        .catch(() => {
          // silently ignore — next interval will retry
        });
    };

    const start = () => {
      if (timerRef.current) return;
      ping(); // immediate ping on start / foreground
      timerRef.current = setInterval(ping, PING_INTERVAL_MS);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    start();

    // Pause when app is backgrounded; resume on foreground to save battery
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, []);
}
