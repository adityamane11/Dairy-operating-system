// Add Milk Entry — select farmer, scan or manual, auto-calc, save
import { useCallback, useEffect, useState } from "react";
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
import { buildEntrySlip, shareToWhatsApp } from "@/src/lib/whatsapp";
import { storage } from "@/src/utils/storage";

export default function AddEntry() {
  const router = useRouter();
  const toast = useToast();
  const { farmer_id } = useLocalSearchParams<{ farmer_id?: string }>();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [query, setQuery] = useState("");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [liters, setLiters] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [density, setDensity] = useState("");
  const [rate, setRate] = useState(0);
  const [amount, setAmount] = useState(0);
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

  // Pull scan result back from camera screen
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await storage.getItem<string>("scan_result_tmp", "");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Date.now() - parsed.ts < 60_000) {
              if (parsed.fat != null) setFat(String(parsed.fat));
              if (parsed.snf != null) setSnf(String(parsed.snf));
              if (parsed.density != null) setDensity(String(parsed.density));
            }
          } catch {}
          await storage.removeItem("scan_result_tmp");
        }
      })();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const f = parseFloat(fat);
    const s = parseFloat(snf);
    const l = parseFloat(liters);
    if (isNaN(f) || isNaN(s) || isNaN(l)) {
      setRate(0);
      setAmount(0);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api.ratePreview(f, s, l);
        setRate(r.rate);
        setAmount(r.amount);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [fat, snf, liters]);

  const save = async (shareAfter: boolean) => {
    if (!selected) {
      toast("कृपया farmer निवडा", "error");
      return;
    }
    const l = parseFloat(liters);
    const f = parseFloat(fat);
    const s = parseFloat(snf);
    if (!l || !f || !s) {
      toast("Liters, Fat, SNF भरा", "error");
      return;
    }
    setSaving(true);
    try {
      const entry = await api.createEntry({
        farmer_id: selected.id,
        shift,
        liters: l,
        fat: f,
        snf: s,
        density: density ? parseFloat(density) : null,
      });
      toast("Entry saved! ✅", "success");
      if (shareAfter) {
        const settings = await api.getSettings();
        await shareToWhatsApp(
          selected.phone,
          buildEntrySlip(entry, settings.dairy_name),
        );
      }
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
        <StickyHeader title="नवीन Entry" onBack={() => router.back()} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (farmers.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StickyHeader title="नवीन Entry" onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={50} color={COLORS.textFaint} />
          <Text style={styles.emptyTitle}>आधी farmer add करा</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.replace("/farmer-new")}
          >
            <Text style={styles.emptyBtnText}>+ Farmer Add करा</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StickyHeader title="नवीन Entry" onBack={() => router.back()} />
      <KeyboardAwareScrollView
        bottomOffset={180}
        contentContainerStyle={{ padding: SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>शेतकरी निवडा</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, ID किंवा फोन शोधा..."
            placeholderTextColor={COLORS.textFaint}
            style={styles.searchInput}
            autoCapitalize="none"
            testID="entry-farmer-search"
          />
          {query ? (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={10}
              testID="clear-farmer-search"
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {(() => {
          const q = query.trim().toLowerCase();
          const list = q
            ? farmers.filter(
                (f) =>
                  f.name.toLowerCase().includes(q) ||
                  f.farmer_code.toLowerCase().includes(q) ||
                  f.phone.includes(q) ||
                  (f.village || "").toLowerCase().includes(q),
              )
            : farmers;
          if (list.length === 0) {
            return (
              <View style={styles.noMatch}>
                <Ionicons name="search-outline" size={20} color={COLORS.textFaint} />
                <Text style={styles.noMatchText}>
                  &quot;{query}&quot; साठी farmer सापडला नाही
                </Text>
              </View>
            );
          }
          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.sm }}
              keyboardShouldPersistTaps="handled"
            >
              {list.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.farmerChip,
                    selected?.id === f.id && styles.farmerChipActive,
                  ]}
                  onPress={() => setSelected(f)}
                  testID={`entry-farmer-${f.farmer_code}`}
                >
                  <Text
                    style={[styles.chipCode, selected?.id === f.id && { color: "#fff" }]}
                  >
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
          );
        })()}

        {selected ? (
          <View style={styles.selectedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            <Text style={styles.selectedBannerText} numberOfLines={1}>
              निवडले: <Text style={{ fontWeight: "800" }}>{selected.name}</Text>{" "}
              <Text style={{ color: COLORS.accentDark }}>({selected.farmer_code})</Text>
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>शिफ्ट / Shift</Text>
        <View style={styles.shiftRow}>
          <TouchableOpacity
            style={[styles.shiftBtn, shift === "morning" && styles.shiftActiveMorning]}
            onPress={() => setShift("morning")}
            testID="shift-morning"
          >
            <Ionicons
              name="sunny"
              size={20}
              color={shift === "morning" ? "#fff" : COLORS.accent}
            />
            <Text style={[styles.shiftText, shift === "morning" && { color: "#fff" }]}>
              सकाळ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shiftBtn, shift === "evening" && styles.shiftActiveEvening]}
            onPress={() => setShift("evening")}
            testID="shift-evening"
          >
            <Ionicons
              name="moon"
              size={20}
              color={shift === "evening" ? "#fff" : "#5B6CD8"}
            />
            <Text style={[styles.shiftText, shift === "evening" && { color: "#fff" }]}>
              संध्याकाळ
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>लिटर / Liters *</Text>
          <TextInput
            style={styles.bigInput}
            value={liters}
            onChangeText={setLiters}
            placeholder="0.0"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textFaint}
            testID="liters-input"
          />
        </View>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push("/scan-camera")}
          activeOpacity={0.85}
          testID="open-scan-camera"
        >
          <Ionicons name="camera" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.scanBtnTitle}>📸 AI ने मूल्ये वाचा</Text>
            <Text style={styles.scanBtnSub}>मशीन display चा फोटो काढा</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.orText]}>— किंवा manual entry —</Text>

        <View style={styles.card}>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Fat %</Text>
              <TextInput
                style={styles.bigInput}
                value={fat}
                onChangeText={setFat}
                placeholder="3.5"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textFaint}
                testID="fat-input"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>SNF %</Text>
              <TextInput
                style={styles.bigInput}
                value={snf}
                onChangeText={setSnf}
                placeholder="8.5"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textFaint}
                testID="snf-input"
              />
            </View>
          </View>
          <Text style={[styles.cardLabel, { marginTop: SPACING.sm }]}>
            Density / CLR (optional)
          </Text>
          <TextInput
            style={styles.input}
            value={density}
            onChangeText={setDensity}
            placeholder="उदा. 27.5"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textFaint}
            testID="density-input"
          />
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>दर / Rate</Text>
            <Text style={styles.previewVal} testID="preview-rate">
              ₹{rate.toFixed(2)}/L
            </Text>
          </View>
          <View style={styles.previewDivider} />
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { fontSize: 14 }]}>एकूण / Total</Text>
            <Text style={styles.previewAmount} testID="preview-amount">
              ₹{amount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.saveBtn, styles.saveOnly, saving && { opacity: 0.6 }]}
            onPress={() => save(false)}
            disabled={saving}
            testID="save-only-btn"
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={[styles.saveText, { color: COLORS.primary }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, styles.saveShare, saving && { opacity: 0.6 }]}
            onPress={() => save(true)}
            disabled={saving}
            testID="save-share-btn"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.saveText}>Save & Send</Text>
          </TouchableOpacity>
        </View>
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: "500" },
  noMatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  noMatchText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  selectedBannerText: { color: COLORS.primaryDark, fontSize: 13, flex: 1 },

  shiftRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md },
  shiftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shiftActiveMorning: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  shiftActiveEvening: { backgroundColor: "#5B6CD8", borderColor: "#5B6CD8" },
  shiftText: { fontSize: 14, fontWeight: "700", color: COLORS.text },

  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
    marginBottom: SPACING.md,
  },
  cardLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600", marginBottom: 6 },
  bigInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 64,
    fontSize: 26,
    color: COLORS.text,
    fontWeight: "800",
    textAlign: "center",
  },
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
  row2: { flexDirection: "row", gap: SPACING.md },

  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    ...SHADOW.fab,
  },
  scanBtnTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  scanBtnSub: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 1 },
  orText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    marginVertical: SPACING.md,
  },

  preview: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { fontSize: 12, color: COLORS.accentDark, fontWeight: "700" },
  previewVal: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  previewDivider: {
    height: 1,
    backgroundColor: "rgba(212,160,23,0.3)",
    marginVertical: SPACING.sm,
  },
  previewAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },

  btnRow: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.sm },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  saveOnly: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  saveShare: { backgroundColor: COLORS.whatsapp, ...SHADOW.fab },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  emptyWrap: { alignItems: "center", padding: SPACING.xxl, marginTop: SPACING.xxl },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginTop: SPACING.md },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
});
