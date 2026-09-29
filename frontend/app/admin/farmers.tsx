// Admin: Farmers list
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Farmer } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";

export default function FarmersScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.listFarmers();
      setFarmers(r);
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

  const filtered = farmers.filter(
    (f) =>
      !q ||
      f.name.toLowerCase().includes(q.toLowerCase()) ||
      f.farmer_code.toLowerCase().includes(q.toLowerCase()) ||
      f.phone.includes(q),
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StickyHeader
        title="शेतकरी / Farmers"
        subtitle={`${farmers.length} registered`}
        rightIcon="person-add"
        onRightPress={() => router.push("/farmer-new")}
      />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name, ID, phone..."
            placeholderTextColor={COLORS.textFaint}
            style={styles.searchInput}
            testID="farmers-search"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.md,
            paddingBottom: 100 + insets.bottom,
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={COLORS.textFaint} />
              <Text style={styles.emptyText}>
                {q ? "काही सापडले नाही" : "अद्याप कोणी farmer नाही"}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/farmer-new")}
              >
                <Text style={styles.emptyBtnText}>+ पहिला Farmer Add करा</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.farmerCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/farmer-detail/${item.id}`)}
              testID={`farmer-row-${item.farmer_code}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.farmerNameRow}>
                  <Text style={styles.farmerName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.farmer_code}</Text>
                  </View>
                </View>
                <Text style={styles.farmerMeta}>
                  📱 {item.phone}
                  {item.village ? ` · ${item.village}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textFaint} />
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 72 + insets.bottom + 16 }]}
        activeOpacity={0.85}
        onPress={() => router.push("/farmer-new")}
        testID="fab-add-farmer"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  farmerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.primary, fontWeight: "800", fontSize: 18 },
  farmerNameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  farmerName: { fontSize: 15, fontWeight: "700", color: COLORS.text, flexShrink: 1 },
  codeBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  codeText: { fontSize: 10, color: COLORS.accentDark, fontWeight: "700" },
  farmerMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: SPACING.xxl * 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.md },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
