// Admin: Settings — rate config, password, dairy info
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Settings } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { clearSession } from "@/src/lib/session";

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getSettings();
      setS(r);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await api.updateSettings({
        dairy_name: s.dairy_name,
        dairy_phone: s.dairy_phone,
        base_fat: Number(s.base_fat),
        base_snf: Number(s.base_snf),
        base_rate: Number(s.base_rate),
        fat_increment: Number(s.fat_increment),
        snf_increment: Number(s.snf_increment),
        admin_password: s.admin_password,
      });
      toast("Settings saved ✅", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await clearSession();
    router.replace("/");
  };

  if (loading || !s) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StickyHeader title="Settings" />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const previewRate =
    s.base_rate +
    ((4.0 - s.base_fat) / 0.1) * s.fat_increment +
    ((8.7 - s.base_snf) / 0.1) * s.snf_increment;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader title="Settings / सेटिंग्ज" subtitle={s.dairy_name} />

      <KeyboardAwareScrollView
        bottomOffset={120}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="🏠 Dairy Information">
          <Field
            label="Dairy Name"
            value={s.dairy_name}
            onChange={(v) => setS({ ...s, dairy_name: v })}
            testID="dairy-name-input"
          />
          <Field
            label="Dairy Phone"
            value={s.dairy_phone}
            onChange={(v) => setS({ ...s, dairy_phone: v })}
            keyboardType="phone-pad"
            testID="dairy-phone-input"
          />
        </Section>

        <Section title="💰 Rate Configuration">
          <Text style={styles.helpText}>
            Base rate: Fat {s.base_fat}% + SNF {s.base_snf}% = ₹{s.base_rate}/L.{"\n"}
            प्रत्येक +0.1 Fat = +₹{s.fat_increment} · प्रत्येक +0.1 SNF = +₹{s.snf_increment}
          </Text>
          <View style={styles.fieldRow}>
            <Field
              label="Base Fat %"
              value={String(s.base_fat)}
              onChange={(v) => setS({ ...s, base_fat: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              flex
              testID="base-fat-input"
            />
            <Field
              label="Base SNF %"
              value={String(s.base_snf)}
              onChange={(v) => setS({ ...s, base_snf: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              flex
              testID="base-snf-input"
            />
          </View>
          <Field
            label="Base Rate ₹/L"
            value={String(s.base_rate)}
            onChange={(v) => setS({ ...s, base_rate: parseFloat(v) || 0 })}
            keyboardType="decimal-pad"
            testID="base-rate-input"
          />
          <View style={styles.fieldRow}>
            <Field
              label="+₹ per 0.1 Fat"
              value={String(s.fat_increment)}
              onChange={(v) => setS({ ...s, fat_increment: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              flex
              testID="fat-inc-input"
            />
            <Field
              label="+₹ per 0.1 SNF"
              value={String(s.snf_increment)}
              onChange={(v) => setS({ ...s, snf_increment: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              flex
              testID="snf-inc-input"
            />
          </View>
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>उदाहरण / Example</Text>
            <Text style={styles.previewText}>
              Fat 4.0%, SNF 8.7% → <Text style={styles.previewRate}>₹{previewRate.toFixed(2)}/L</Text>
            </Text>
          </View>
        </Section>

        <Section title="🔒 Security">
          <Field
            label="Admin Password"
            value={s.admin_password}
            onChange={(v) => setS({ ...s, admin_password: v })}
            secure
            testID="admin-password-edit"
          />
        </Section>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          testID="save-settings"
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Settings"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} testID="logout-btn">
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  secure,
  flex,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "decimal-pad" | "phone-pad";
  secure?: boolean;
  flex?: boolean;
  testID?: string;
}) {
  return (
    <View style={[{ marginBottom: SPACING.md }, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || "default"}
        secureTextEntry={secure}
        placeholderTextColor={COLORS.textFaint}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
  },
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  helpText: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md, lineHeight: 18 },
  previewBox: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  previewLabel: { fontSize: 11, color: COLORS.accentDark, fontWeight: "700" },
  previewText: { fontSize: 13, color: COLORS.text, marginTop: 4 },
  previewRate: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.fab,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  logoutBtn: {
    marginTop: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  logoutText: { color: COLORS.danger, fontWeight: "700", fontSize: 14 },
});
