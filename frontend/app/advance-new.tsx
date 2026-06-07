// Add advance
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Farmer } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";

export default function AdvanceNew() {
  const router = useRouter();
  const toast = useToast();
  const { farmer_id } = useLocalSearchParams<{ farmer_id?: string }>();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.listFarmers();
      setFarmers(r);
      if (farmer_id) {
        const f = r.find((x) => x.id === farmer_id);
        if (f) setSelected(f);
      }
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast, farmer_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!selected) {
      toast("कृपया farmer निवडा", "error");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast("Valid amount टाका", "error");
      return;
    }
    setSaving(true);
    try {
      await api.createAdvance({
        farmer_id: selected.id,
        amount: amt,
        note: note.trim(),
      });
      toast(`उचल ₹${amt} added! ✅`, "success");
      router.back();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StickyHeader title="उचल / Advance" onBack={() => router.back()} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StickyHeader title="उचल / Add Advance" onBack={() => router.back()} />
      <KeyboardAwareScrollView
        bottomOffset={120}
        contentContainerStyle={{ padding: SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>शेतकरी निवडा / Select Farmer</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.sm }}
        >
          {farmers.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.farmerChip, selected?.id === f.id && styles.farmerChipActive]}
              onPress={() => setSelected(f)}
              testID={`advance-farmer-${f.farmer_code}`}
            >
              <Text style={[styles.chipCode, selected?.id === f.id && { color: "#fff" }]}>
                {f.farmer_code}
              </Text>
              <Text
                style={[styles.chipName, selected?.id === f.id && { color: "#fff" }]}
                numberOfLines={1}
              >
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.card}>
          <Text style={styles.label}>रक्कम / Amount (₹) *</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textFaint}
            testID="advance-amount-input"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>नोंद / Note</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="उदा. वैद्यकीय खर्च"
            placeholderTextColor={COLORS.textFaint}
            testID="advance-note-input"
          />
        </View>

        <View style={styles.warnBox}>
          <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
          <Text style={styles.warnText}>
            ही उचल पुढच्या weekly payment मधून आपोआप कापली जाईल
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          testID="advance-save"
        >
          <Ionicons name="wallet" size={20} color="#fff" />
          <Text style={styles.saveText}>{saving ? "Saving..." : "Add Advance"}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  farmerChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
    flexShrink: 0,
  },
  farmerChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipCode: { fontSize: 10, color: COLORS.accentDark, fontWeight: "700" },
  chipName: { fontSize: 13, color: COLORS.text, fontWeight: "700", marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  amountInput: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 64,
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "800",
    textAlign: "center",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: "#FFF4E5",
    borderRadius: RADIUS.sm,
  },
  warnText: { color: COLORS.warning, fontSize: 11, flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.fab,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
