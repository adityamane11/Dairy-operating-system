// Farmer login (farmer code + phone)
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
import Ionicons from "@react-native-vector-icons/ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api } from "@/src/lib/api";
import { saveSession } from "@/src/lib/session";
import { useToast } from "@/src/components/Toast";

export default function LoginFarmer() {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim() || !phone.trim()) {
      toast("ID आणि फोन दोन्ही टाका", "error");
      return;
    }
    setLoading(true);
    try {
      const r = await api.farmerLogin(code.trim().toUpperCase(), phone.trim());
      await saveSession({ role: "farmer", farmer: r.farmer });
      toast(`नमस्कार ${r.farmer.name} 🙏`, "success");
      router.replace("/farmer-home");
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
            testID="farmer-login-back"
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
            <Text style={styles.title}>Farmer Login</Text>
            <Text style={styles.subtitle}>शेतकरी लॉगिन</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Farmer ID / शेतकरी आयडी</Text>
            <View style={styles.inputRow}>
              <Ionicons name="id-card-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="उदा. F001"
                placeholderTextColor={COLORS.textFaint}
                autoCapitalize="characters"
                returnKeyType="next"
                testID="farmer-id-input"
              />
            </View>

            <Text style={[styles.label, { marginTop: SPACING.lg }]}>
              फोन नंबर / Phone
            </Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit मोबाईल"
                placeholderTextColor={COLORS.textFaint}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={submit}
                testID="farmer-phone-input"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={submit}
              disabled={loading}
              testID="farmer-login-submit"
            >
              <Text style={styles.btnText}>{loading ? "..." : "Login →"}</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              💡 Admin ने तुमचा ID create केला आहे — त्यांना विचारा
            </Text>
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
  hint: {
    fontSize: 11,
    color: COLORS.textFaint,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xl,
    ...SHADOW.fab,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.4 },
});
