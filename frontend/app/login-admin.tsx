// Admin login (password)
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api } from "@/src/lib/api";
import { saveSession } from "@/src/lib/session";
import { useToast } from "@/src/components/Toast";

export default function LoginAdmin() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async () => {
    if (!password.trim()) {
      toast("कृपया पासवर्ड टाका", "error");
      return;
    }
    setLoading(true);
    try {
      const r = await api.adminLogin(password.trim());
      await saveSession({ role: "admin", dairyName: r.dairy_name });
      toast("स्वागत आहे! 🙏", "success");
      router.replace("/admin");
    } catch (e: any) {
      toast(e.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="admin-login-back"
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/brand/logo.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>मालक लॉगिन</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>पासवर्ड / Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textFaint}
                secureTextEntry={!show}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={submit}
                testID="admin-password-input"
              />
              <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10}>
                <Ionicons
                  name={show ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Default password: <Text style={{ fontWeight: "700" }}>admin123</Text>
              {"  "}(Settings मध्ये बदला)
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={submit}
              disabled={loading}
              testID="admin-login-submit"
            >
              <Text style={styles.btnText}>{loading ? "..." : "Login →"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: "center" },
  logoBox: { alignItems: "center", marginBottom: SPACING.xl },
  logo: { width: 100, height: 100, resizeMode: "contain" },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginTop: SPACING.md },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  label: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600", marginBottom: SPACING.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 54,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: "600" },
  hint: { fontSize: 11, color: COLORS.textFaint, marginTop: SPACING.sm },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
    ...SHADOW.fab,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.4 },
});
