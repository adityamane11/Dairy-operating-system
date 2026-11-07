// Admin: All milk entries list
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, MilkEntry } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { buildEntrySlip, shareToWhatsApp } from "@/src/lib/whatsapp";

type Filter = "all" | "morning" | "evening";

export default function EntriesScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listEntries({ limit: 200 });
      setEntries(r);
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

  const filtered = entries.filter((e) => filter === "all" || e.shift === filter);

  const totalLiters = filtered.reduce((a, e) => a + e.liters, 0).toFixed(1);
  const totalAmt = filtered.reduce((a, e) => a + e.amount, 0).toFixed(0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader
        title="Entries / नोंदी"
        subtitle={`${filtered.length} entries · ${totalLiters}L · ₹${totalAmt}`}
      />

      <View style={styles.chipRow}>
        {(["all", "morning", "evening"] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            testID={`filter-${f}`}
          >
            <Ionicons
              name={
                f === "all" ? "apps" : f === "morning" ? "sunny" : "moon"
              }
              size={14}
              color={filter === f ? "#fff" : COLORS.textMuted}
            />
            <Text style={[styles.chipText, filter === f && { color: "#fff" }]}>
              {f === "all" ? "All" : f === "morning" ? "सकाळ" : "संध्याकाळ"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.sm,
            paddingBottom: 100 + insets.bottom,
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textFaint} />
              <Text style={styles.emptyText}>अद्याप entries नाहीत</Text>
            </View>
          }
          renderItem={({ item: e }) => (
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name={e.shift === "morning" ? "sunny" : "moon"}
                  size={18}
                  color={e.shift === "morning" ? COLORS.accent : "#5B6CD8"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.farmerName} numberOfLines={1}>
                    {e.farmer_name}
                  </Text>
                  <Text style={styles.amount}>₹{e.amount}</Text>
                </View>
                <Text style={styles.metaLine}>
                  {e.date} · {e.farmer_code} · {e.liters}L · Fat {e.fat} · SNF {e.snf} · ₹{e.rate}/L
                </Text>
              </View>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={async () => {
                  try {
                    const s = await api.getSettings();
                    const farmer = await api.getFarmer(e.farmer_id);
                    await shareToWhatsApp(farmer.phone, buildEntrySlip(e, s.dairy_name));
                  } catch (err: any) {
                    toast(err.message || "WhatsApp open failed", "error");
                  }
                }}
                testID={`whatsapp-${e.id}`}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 72 + insets.bottom + 16 }]}
        activeOpacity={0.85}
        onPress={() => router.push("/add-entry")}
        testID="fab-add-entry-list"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTopLine: { flexDirection: "row", justifyContent: "space-between" },
  farmerName: { flex: 1, fontSize: 14, fontWeight: "700", color: COLORS.text },
  amount: { fontSize: 15, fontWeight: "800", color: COLORS.primary, marginLeft: 8 },
  metaLine: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  whatsappBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.whatsapp,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: SPACING.xxl * 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.md },
  fab: {
    position: "absolute",
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
});
