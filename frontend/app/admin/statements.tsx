// Admin: Statements — saved 10-day payment statements (history)
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Statement } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { fmtDMY, inr } from "@/src/lib/dates";

export default function StatementsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Statement[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listStatements());
    } catch (e: any) {
      toast(e.message, "error");
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

  const q = query.trim().toLowerCase();
  const list = q
    ? items.filter(
        (s) => s.farmer_name.toLowerCase().includes(q) || s.farmer_code.toLowerCase().includes(q),
      )
    : items;

  return (
    <View style={styles.container}>
      <StickyHeader title="Statements / पत्रक" />
      <View style={styles.top}>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push("/statement-new")}
          testID="new-statement-btn"
        >
          <Ionicons name="document-text" size={22} color={COLORS.surface} />
          <View style={{ flex: 1 }}>
            <Text style={styles.newTitle}>नवीन 10-दिवस Statement</Text>
            <Text style={styles.newSub}>दूध भरा · दर ठरवा · PDF WhatsApp वर पाठवा</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.surface} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="शेतकरी शोधा..."
            placeholderTextColor={COLORS.textFaint}
            style={styles.searchInput}
            testID="statement-search"
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0, paddingBottom: 120 }}
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={44} color={COLORS.textFaint} />
              <Text style={styles.emptyText}>अजून statement नाही</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/statement/${item.id}`)}
              testID={`statement-item-${item.id}`}
            >
              <View style={styles.icon}>
                <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.farmer_name} <Text style={styles.code}>({item.farmer_code})</Text>
                </Text>
                <Text style={styles.sub}>
                  {fmtDMY(item.date_from)} ते {fmtDMY(item.date_to)} · v{item.version}
                </Text>
                <Text style={styles.sub}>
                  {item.total_liters} L × {inr(item.rate)}
                </Text>
              </View>
              <Text style={styles.amt}>{inr(item.net_payable)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  top: { padding: SPACING.lg, gap: SPACING.md },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    ...SHADOW.fab,
  },
  newTitle: { color: COLORS.surface, fontWeight: "800", fontSize: 15 },
  newSub: { color: COLORS.primaryLight, fontSize: 11, marginTop: 2 },
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
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  code: { color: COLORS.accentDark, fontSize: 12 },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  amt: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  empty: { alignItems: "center", marginTop: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
