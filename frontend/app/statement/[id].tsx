// Saved statement view — share PDF on WhatsApp, edit to create next version
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Statement } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { fmtDateTime, fmtDMY, inr } from "@/src/lib/dates";
import { shareStatementPdf } from "@/src/lib/statement-pdf";

export default function StatementView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<Statement | null>(null);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.getStatement(id).then(setS).catch((e) => toast(e.message, "error"));
    }, [id, toast]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/admin/statements"));

  const share = async () => {
    if (!s) return;
    setSharing(true);
    try {
      await shareStatementPdf(s);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSharing(false);
    }
  };

  if (!s) {
    return (
      <View style={styles.container}>
        <StickyHeader title="Statement" onBack={goBack} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StickyHeader title={`${s.farmer_name} · v${s.version}`} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 160 }}>
        <View style={styles.card}>
          <Row k="शेतकरी कोड" v={s.farmer_code} />
          <Row k="कालावधी" v={`${fmtDMY(s.date_from)} ते ${fmtDMY(s.date_to)}`} />
          <Row k="Saved on" v={fmtDateTime(s.created_at)} />
          <Row k="Version" v={String(s.version)} />
        </View>

        <View style={[styles.card, { marginTop: SPACING.md }]}>
          <View style={[styles.tRow, styles.tHead]}>
            <Text style={[styles.tDate, styles.th]}>तारीख</Text>
            <Text style={[styles.tCell, styles.th]}>सकाळ</Text>
            <Text style={[styles.tCell, styles.th]}>संध्याकाळ</Text>
            <Text style={[styles.tCell, styles.th]}>एकूण</Text>
          </View>
          {(s.rows || []).map((r) => (
            <View key={r.date} style={styles.tRow}>
              <Text style={styles.tDate}>{fmtDMY(r.date)}</Text>
              <Text style={styles.tCell}>{r.morning}</Text>
              <Text style={styles.tCell}>{r.evening}</Text>
              <Text style={[styles.tCell, styles.b]}>{r.total}</Text>
            </View>
          ))}
          <View style={[styles.tRow, styles.tFoot]}>
            <Text style={[styles.tDate, styles.b]}>एकूण</Text>
            <Text style={[styles.tCell, styles.b]}>{s.total_morning}</Text>
            <Text style={[styles.tCell, styles.b]}>{s.total_evening}</Text>
            <Text style={[styles.tCell, styles.b]}>{s.total_liters}</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: SPACING.md }]}>
          <Row k="एकूण दूध" v={`${s.total_liters} L`} />
          <Row k="दर" v={`${inr(s.rate)} / L`} />
          <Row k="एकूण रक्कम" v={inr(s.gross_amount)} bold />
          {s.advance_lines.map((a) => (
            <Row
              key={a.advance_id}
              k={`Advance उचल ${inr(a.amount)} (बाकी ${inr(a.balance_after)})`}
              v={`− ${inr(a.deducted_now)}`}
            />
          ))}
          <Row k="वजावट" v={`− ${inr(s.total_deduction)}`} />
        </View>

        <View style={styles.final}>
          <Text style={styles.finalLbl}>FINAL PAYABLE{"\n"}देय रक्कम</Text>
          <Text style={styles.finalAmt} testID="stmt-view-net">{inr(s.net_payable)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={() =>
            router.push({
              pathname: "/statement-new",
              params: { farmer_id: s.farmer_id, from: s.date_from, to: s.date_to },
            })
          }
          testID="stmt-edit"
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.btnText, { color: COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnWa, sharing && { opacity: 0.6 }]}
          onPress={share}
          disabled={sharing}
          testID="stmt-share-pdf"
        >
          {sharing ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.surface} />
          )}
          <Text style={styles.btnText}>Share PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.k, bold && styles.b]}>{k}</Text>
      <Text style={[styles.v, bold && { color: COLORS.primary, fontSize: 16 }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.card },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: SPACING.md },
  k: { flex: 1, color: COLORS.textMuted, fontSize: 13 },
  v: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  b: { fontWeight: "800", color: COLORS.text },
  tRow: { flexDirection: "row", paddingVertical: 5 },
  tHead: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tFoot: { borderTopWidth: 2, borderTopColor: COLORS.accent, marginTop: 4 },
  th: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  tDate: { width: 92, fontSize: 13, color: COLORS.text },
  tCell: { flex: 1, textAlign: "center", fontSize: 13, color: COLORS.text },
  final: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  finalLbl: { color: COLORS.surface, fontWeight: "700", fontSize: 13 },
  finalAmt: { color: COLORS.surface, fontWeight: "900", fontSize: 26 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    minHeight: 50,
    borderRadius: RADIUS.lg,
  },
  btnOutline: { borderWidth: 1.5, borderColor: COLORS.primary },
  btnWa: { backgroundColor: COLORS.whatsapp, flex: 1.6 },
  btnText: { color: COLORS.surface, fontWeight: "700", fontSize: 15 },
});
