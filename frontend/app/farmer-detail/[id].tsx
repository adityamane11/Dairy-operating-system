// Farmer detail (admin view) — weekly payment summary, entries, advances, settle
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, PaymentSummary } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { buildPaymentSlip, shareToWhatsApp } from "@/src/lib/whatsapp";

type Period = 7 | 14 | 30;

export default function FarmerDetail() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<Period>(7);
  const [data, setData] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const fromDate = new Date(Date.now() - (period - 1) * 86400_000);
      const from = fromDate.toISOString().slice(0, 10);
      const r = await api.paymentSummary(id, from, to);
      setData(r);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, period, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StickyHeader title="Farmer" onBack={() => router.back()} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const f = data.farmer;

  const sharePayment = async () => {
    try {
      const s = await api.getSettings();
      await shareToWhatsApp(f.phone, buildPaymentSlip(data, s.dairy_name));
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const settle = async () => {
    setBusy(true);
    try {
      await api.settleAdvances(f.id);
      toast("Advance settled ✅", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteFarmer(f.id);
      toast("Farmer deleted", "success");
      router.back();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader
        title={f.name}
        subtitle={`${f.farmer_code} · ${f.phone}`}
        onBack={() => router.back()}
        rightIcon="trash-outline"
        onRightPress={remove}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* period chips */}
        <View style={styles.chipRow}>
          {[7, 14, 30].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, period === p && styles.chipActive]}
              onPress={() => setPeriod(p as Period)}
              testID={`period-${p}`}
            >
              <Text style={[styles.chipText, period === p && { color: "#fff" }]}>
                {p === 7 ? "Weekly" : p === 14 ? "15-day" : "Monthly"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero net payable */}
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>देय रक्कम / Net Payable</Text>
            <Text style={styles.heroAmount} testID="net-payable">
              ₹{data.net_payable.toLocaleString("en-IN")}
            </Text>
            <View style={styles.heroBreak}>
              <View style={styles.heroBreakItem}>
                <Text style={styles.heroBreakLabel}>Gross</Text>
                <Text style={styles.heroBreakVal}>₹{data.gross_amount}</Text>
              </View>
              <View style={styles.heroBreakItem}>
                <Text style={styles.heroBreakLabel}>उचल</Text>
                <Text style={[styles.heroBreakVal, { color: COLORS.accent }]}>
                  −₹{data.total_advance}
                </Text>
              </View>
              <View style={styles.heroBreakItem}>
                <Text style={styles.heroBreakLabel}>लिटर</Text>
                <Text style={styles.heroBreakVal}>{data.total_liters}L</Text>
              </View>
            </View>
            <Text style={styles.heroDate}>
              {data.date_from} → {data.date_to}
            </Text>
          </LinearGradient>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.whatsapp }]}
            onPress={sharePayment}
            testID="share-payment-whatsapp"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.actionText}>Send Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
            onPress={() => router.push(`/advance-new?farmer_id=${f.id}`)}
            testID="add-advance-btn"
          >
            <Ionicons name="wallet" size={20} color="#fff" />
            <Text style={styles.actionText}>+ उचल</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push(`/add-entry?farmer_id=${f.id}`)}
            testID="add-entry-for-farmer"
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionText}>+ Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Quality stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>सरासरी Fat</Text>
            <Text style={styles.statVal}>{data.avg_fat}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>सरासरी SNF</Text>
            <Text style={styles.statVal}>{data.avg_snf}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Entries</Text>
            <Text style={styles.statVal}>{data.entries.length}</Text>
          </View>
        </View>

        {/* Advances list */}
        {data.advances.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>उचल (Outstanding)</Text>
              <TouchableOpacity
                onPress={settle}
                disabled={busy}
                testID="settle-advances"
              >
                <Text style={styles.linkText}>Settle all →</Text>
              </TouchableOpacity>
            </View>
            {data.advances.map((a) => (
              <View key={a.id} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#FBF2DC" }]}>
                  <Ionicons name="wallet" size={16} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>₹{a.amount}</Text>
                  <Text style={styles.rowSub}>
                    {a.date} {a.note ? `· ${a.note}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milk Entries</Text>
          {data.entries.length === 0 ? (
            <View style={styles.emptyEntries}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                या period मध्ये entries नाहीत
              </Text>
            </View>
          ) : (
            data.entries.map((e) => (
              <View key={e.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons
                    name={e.shift === "morning" ? "sunny" : "moon"}
                    size={16}
                    color={e.shift === "morning" ? COLORS.accent : "#5B6CD8"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTopLine}>
                    <Text style={styles.rowTitle}>{e.date}</Text>
                    <Text style={styles.rowAmt}>₹{e.amount}</Text>
                  </View>
                  <Text style={styles.rowSub}>
                    {e.liters}L · Fat {e.fat} · SNF {e.snf} · ₹{e.rate}/L
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "700" },

  hero: { borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOW.card },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  heroAmount: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: SPACING.xs,
  },
  heroBreak: {
    flexDirection: "row",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  heroBreakItem: { flex: 1 },
  heroBreakLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  heroBreakVal: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 2 },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: SPACING.sm },

  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  statsRow: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.lg },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    ...SHADOW.card,
  },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statVal: { fontSize: 22, fontWeight: "800", color: COLORS.primary, marginTop: 2 },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  linkText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTopLine: { flexDirection: "row", justifyContent: "space-between" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  rowAmt: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  rowSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  emptyEntries: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
});
