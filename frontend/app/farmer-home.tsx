// Farmer-side dashboard — they see their collection & payments
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, PaymentSummary } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { clearSession, loadSession } from "@/src/lib/session";
import { buildPaymentSlip, shareToWhatsApp } from "@/src/lib/whatsapp";

type Period = 7 | 14 | 30;

export default function FarmerHome() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PaymentSummary | null>(null);
  const [period, setPeriod] = useState<Period>(7);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s?.role !== "farmer") {
        router.replace("/");
        return;
      }
      setFarmerId(s.farmer.id);
      setFarmerName(s.farmer.name);
    })();
  }, [router]);

  const load = useCallback(async () => {
    if (!farmerId) return;
    setLoading(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const fromDate = new Date(Date.now() - (period - 1) * 86400_000);
      const from = fromDate.toISOString().slice(0, 10);
      const r = await api.paymentSummary(farmerId, from, to);
      setData(r);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [farmerId, period, toast]);

  useFocusEffect(
    useCallback(() => {
      if (farmerId) load();
    }, [load, farmerId]),
  );

  const logout = async () => {
    await clearSession();
    router.replace("/");
  };

  const shareSlip = async () => {
    if (!data) return;
    try {
      const s = await api.getSettings();
      await shareToWhatsApp(
        data.farmer.phone,
        buildPaymentSlip(data, s.dairy_name),
      );
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  if (loading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StickyHeader title={`नमस्कार ${farmerName} 🙏`} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader
        title={`नमस्कार ${data.farmer.name} 🙏`}
        subtitle={`${data.farmer.farmer_code} · ${data.farmer.phone}`}
        rightIcon="log-out-outline"
        onRightPress={logout}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipRow}>
          {[7, 14, 30].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, period === p && styles.chipActive]}
              onPress={() => setPeriod(p as Period)}
              testID={`farmer-period-${p}`}
            >
              <Text style={[styles.chipText, period === p && { color: "#fff" }]}>
                {p === 7 ? "Weekly" : p === 14 ? "15-day" : "Monthly"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: SPACING.lg }}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.hero}>
            <Text style={styles.heroLabel}>तुमची देय रक्कम</Text>
            <Text style={styles.heroAmount} testID="farmer-net-payable">
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
                <Text style={styles.heroBreakVal}>{data.total_liters}</Text>
              </View>
            </View>
            <Text style={styles.heroDate}>
              {data.date_from} → {data.date_to}
            </Text>
          </LinearGradient>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={shareSlip}
            testID="farmer-share-slip"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Slip मला WhatsApp वर पाठवा</Text>
          </TouchableOpacity>
        </View>

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

        {data.advances.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>उचल / Advances</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Entries</Text>
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

  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.whatsapp,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    ...SHADOW.fab,
  },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

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
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },

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
