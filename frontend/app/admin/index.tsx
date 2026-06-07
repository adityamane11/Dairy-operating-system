// Admin dashboard
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, MilkEntry, TodaySummary } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";

export default function AdminDashboard() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [recent, setRecent] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        api.todaySummary(),
        api.listEntries({ limit: 5 }),
      ]);
      setSummary(s);
      setRecent(e);
    } catch (err: any) {
      toast(err.message || "Failed to load", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader title="दूध संकलन / Dairy" subtitle="Today&apos;s Overview" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Hero Today card */}
        <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg }}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>आजचे एकूण संकलन</Text>
                <Text style={styles.heroSub}>Today&apos;s Collection</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="trending-up" size={14} color={COLORS.accent} />
                <Text style={styles.heroBadgeText}>Live</Text>
              </View>
            </View>
            <Text style={styles.heroAmount} testID="today-amount">
              ₹{(summary?.amount || 0).toLocaleString("en-IN")}
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum} testID="today-liters">
                  {summary?.liters || 0}
                </Text>
                <Text style={styles.heroStatLabel}>लिटर</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{summary?.farmers || 0}</Text>
                <Text style={styles.heroStatLabel}>Farmers</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{summary?.entries || 0}</Text>
                <Text style={styles.heroStatLabel}>Entries</Text>
              </View>
            </View>
            <View style={styles.heroFootRow}>
              <Text style={styles.heroFootText}>
                सरासरी Fat: <Text style={{ fontWeight: "700" }}>{summary?.avg_fat || 0}%</Text>
              </Text>
              <Text style={styles.heroFootText}>
                SNF: <Text style={{ fontWeight: "700" }}>{summary?.avg_snf || 0}%</Text>
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="camera"
            label="नवीन Entry"
            sub="Photo / Manual"
            color={COLORS.accent}
            onPress={() => router.push("/add-entry")}
            testID="quick-new-entry"
          />
          <QuickAction
            icon="person-add"
            label="Farmer Add"
            sub="नवीन शेतकरी"
            color={COLORS.primary}
            onPress={() => router.push("/farmer-new")}
            testID="quick-new-farmer"
          />
        </View>
        <View style={styles.quickRow}>
          <QuickAction
            icon="wallet"
            label="उचल / Advance"
            sub="Add advance"
            color="#7B4FA8"
            onPress={() => router.push("/advance-new")}
            testID="quick-advance"
          />
          <QuickAction
            icon="people"
            label="Payments"
            sub="Weekly bills"
            color="#0E7C7B"
            onPress={() => router.push("/admin/farmers")}
            testID="quick-payments"
          />
        </View>

        {/* Recent entries */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            <TouchableOpacity onPress={() => router.push("/admin/entries")}>
              <Text style={styles.linkText}>सर्व पहा →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: SPACING.xl }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={36} color={COLORS.textFaint} />
              <Text style={styles.emptyText}>आज अद्याप entries नाहीत</Text>
              <Text style={styles.emptySub}>+ बटनावर क्लिक करा</Text>
            </View>
          ) : (
            recent.map((e) => <EntryRow key={e.id} e={e} />)
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 72 + insets.bottom + 16 }]}
        activeOpacity={0.85}
        onPress={() => router.push("/add-entry")}
        testID="fab-add-entry"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  sub,
  color,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.quickCard}
      activeOpacity={0.85}
      onPress={onPress}
      testID={testID}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EntryRow({ e }: { e: MilkEntry }) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryIcon}>
        <Ionicons
          name={e.shift === "morning" ? "sunny" : "moon"}
          size={18}
          color={e.shift === "morning" ? COLORS.accent : "#5B6CD8"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.entryName} numberOfLines={1}>
          {e.farmer_name}
        </Text>
        <Text style={styles.entryMeta}>
          {e.farmer_code} · {e.liters}L · Fat {e.fat} · SNF {e.snf}
        </Text>
      </View>
      <Text style={styles.entryAmount}>₹{e.amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: "#fff", fontSize: 13, fontWeight: "600", opacity: 0.9 },
  heroSub: { color: "#fff", fontSize: 11, opacity: 0.7, marginTop: 1 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212, 160, 23, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: "700" },
  heroAmount: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "800",
    marginTop: SPACING.sm,
    letterSpacing: -1,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: SPACING.md,
  },
  heroStats: { flexDirection: "row", justifyContent: "space-between" },
  heroStat: { alignItems: "center", flex: 1 },
  heroStatNum: { color: "#fff", fontSize: 20, fontWeight: "700" },
  heroStatLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  heroFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  heroFootText: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  quickRow: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  quickCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  quickSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  linkText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  emptyText: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: SPACING.sm },
  emptySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  entryName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  entryMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  entryAmount: { fontSize: 15, fontWeight: "800", color: COLORS.primary },

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
