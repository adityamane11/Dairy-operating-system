// Toast: lightweight in-app toast (no native Alert)
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

type ToastKind = "success" | "error" | "info";
type ToastCtx = (msg: string, kind?: ToastKind) => void;

const Ctx = createContext<ToastCtx>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; kind: ToastKind } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastCtx>((text, kind = "info") => {
    setMsg({ text, kind });
  }, []);

  useEffect(() => {
    if (!msg) return;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setMsg(null),
      );
    }, 2600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [msg, opacity]);

  const bg =
    msg?.kind === "success" ? COLORS.primary : msg?.kind === "error" ? COLORS.danger : "#1A201C";

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity, top: insets.top + 12, backgroundColor: bg },
          ]}
          testID="app-toast"
        >
          <Text style={styles.toastText}>{msg.text}</Text>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    zIndex: 9999,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" },
});
