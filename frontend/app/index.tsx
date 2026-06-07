// Splash / Role selector
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { loadSession } from "@/src/lib/session";

export default function Index() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s?.role === "admin") {
        router.replace("/admin");
        return;
      }
      if (s?.role === "farmer") {
        router.replace("/farmer-home");
        return;
      }
      setChecked(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    })();
  }, [fade, slide, router]);

  if (!checked) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Image
          source={require("../assets/brand/logo.png")}
          style={styles.splashLogo}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.bg, COLORS.bg]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" }} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fade, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.logoBox}>
            <View style={styles.logoFrame}>
              <Image
                source={require("../assets/brand/logo.png")}
                style={styles.logo}
                contentFit="contain"
                testID="brand-logo-image"
              />
            </View>
            <Text style={styles.brandDevanagari}>सिद्धनाथ</Text>
            <Text style={styles.brandTagline}>दूध संकलन केंद्र</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>Doodh Sankalan Kendra</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>स्वागत आहे! 🙏</Text>
            <Text style={styles.cardDesc}>
              तुम्ही कोण आहात ते निवडा / Choose your role
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.roleBtn, styles.adminBtn]}
              onPress={() => router.push("/login-admin")}
              testID="role-admin-button"
            >
              <View style={styles.roleIconWrap}>
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>Admin / मालक</Text>
                <Text style={styles.roleDesc}>
                  Records add करा, payments manage करा
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.roleBtn, styles.farmerBtn]}
              onPress={() => router.push("/login-farmer")}
              testID="role-farmer-button"
            >
              <View style={[styles.roleIconWrap, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="person" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleTitle, { color: COLORS.text }]}>
                  शेतकरी / Farmer
                </Text>
                <Text style={[styles.roleDesc, { color: COLORS.textMuted }]}>
                  आपला हिशेब बघा, payment slip बघा
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            🥛 Powered by AI · Made for Indian Dairy
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  splashLogo: { width: 200, height: 200, alignSelf: "center" },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: "space-between",
    paddingVertical: SPACING.xl,
  },
  logoBox: { alignItems: "center", marginTop: SPACING.lg },
  logoFrame: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  logo: { width: 150, height: 150 },
  brandDevanagari: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: SPACING.md,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 20,
    color: COLORS.text,
    marginTop: 2,
    fontWeight: "700",
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.accent,
    marginVertical: SPACING.sm,
    borderRadius: 2,
  },
  subtitle: { fontSize: 13, color: COLORS.textMuted, letterSpacing: 0.5 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.lg },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  adminBtn: { backgroundColor: COLORS.primary },
  farmerBtn: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  roleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  roleDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  footer: {
    textAlign: "center",
    color: COLORS.textFaint,
    fontSize: 12,
    marginTop: SPACING.lg,
  },
});
