// New / edit 10-day statement: farmer + period, bulk litres, fixed rate, advance deductions
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { TextInputInstance } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api, Farmer, Statement, StatementDraft } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { addDays, dayDiff, fmtDMY, inr, todayISO } from "@/src/lib/dates";
import { previewStatementPdf } from "@/src/lib/statement-pdf";

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function StatementNew() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ farmer_id?: string; from?: string; to?: string }>();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [query, setQuery] = useState("");
  const [to, setTo] = useState(params.to || todayISO());
  const [from, setFrom] = useState(params.from || addDays(todayISO(), -9));
  const [draft, setDraft] = useState<StatementDraft | null>(null);
  const [days, setDays] = useState<{ date: string; morning: string; evening: string }[]>([]);
  const [rate, setRate] = useState("");
  const [deducts, setDeducts] = useState<Record<string, string>>({});
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputs = useRef<(TextInputInstance | null)[]>([]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/admin/statements"));

  useEffect(() => {
    api
      .listFarmers()
      .then((r) => {
        setFarmers(r);
        if (params.farmer_id) setSelected(r.find((f) => f.id === params.farmer_id) || null);
      })
      .catch((e) => toast(e.message, "error"));
  }, [params.farmer_id, toast]);

  const loadDraft = useCallback(async () => {
    if (!selected || dayDiff(from, to) < 0) return;
    setLoadingDraft(true);
    try {
      const d = await api.statementDraft(selected.id, from, to);
      setDraft(d);
      setDays(
        d.days.map((x) => ({
          date: x.date,
          morning: x.morning ? String(x.morning) : "",
          evening: x.evening ? String(x.evening) : "",
        })),
      );
      if (d.rate) setRate(String(d.rate));
      setDeducts(
        Object.fromEntries(d.advances.map((a) => [a.advance_id, a.deduct ? String(a.deduct) : ""])),
      );
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoadingDraft(false);
    }
  }, [selected, from, to, toast]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const totals = useMemo(() => {
    const m = r2(days.reduce((s, d) => s + num(d.morning), 0));
    const e = r2(days.reduce((s, d) => s + num(d.evening), 0));
    const liters = r2(m + e);
    const gross = r2(liters * num(rate));
    const ded = r2(Object.values(deducts).reduce((s, v) => s + num(v), 0));
    return { m, e, liters, gross, ded, net: r2(gross - ded) };
  }, [days, rate, deducts]);

  const setDay = (i: number, key: "morning" | "evening", v: string) =>
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, [key]: v } : d)));

  const shiftPeriod = (dir: number) => {
    const len = dayDiff(from, to) + 1;
    setFrom(addDays(from, dir * len));
    setTo(addDays(to, dir * len));
  };

  const validate = (): string | null => {
    if (!selected) return "कृपया शेतकरी निवडा";
    if (num(rate) <= 0) return "दर (₹/L) भरा";
    for (const a of draft?.advances || []) {
      if (num(deducts[a.advance_id] || "") > a.available + 0.001)
        return `वजावट बाकी advance (${inr(a.available)}) पेक्षा जास्त`;
    }
    if (totals.ded > totals.gross + 0.001) return "वजावट एकूण रकमेपेक्षा जास्त आहे";
    return null;
  };

  const localStatement = (): Statement => ({
    id: "preview",
    farmer_id: selected!.id,
    farmer_code: selected!.farmer_code,
    farmer_name: selected!.name,
    farmer_phone: selected!.phone,
    date_from: from,
    date_to: to,
    version: (draft?.last_version || 0) + 1,
    rate: num(rate),
    rows: days.map((d) => ({
      date: d.date,
      morning: num(d.morning),
      evening: num(d.evening),
      total: r2(num(d.morning) + num(d.evening)),
    })),
    total_morning: totals.m,
    total_evening: totals.e,
    total_liters: totals.liters,
    gross_amount: totals.gross,
    advance_lines: (draft?.advances || []).map((a) => {
      const d = num(deducts[a.advance_id] || "");
      return {
        advance_id: a.advance_id,
        date: a.date,
        note: a.note,
        amount: a.amount,
        deducted_now: d,
        balance_after: r2(a.available - d),
      };
    }),
    total_deduction: totals.ded,
    net_payable: totals.net,
    created_at: new Date().toISOString(),
  });

  const preview = async () => {
    const err = validate();
    if (err) return toast(err, "error");
    try {
      await previewStatementPdf(localStatement());
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const save = async () => {
    const err = validate();
    if (err) return toast(err, "error");
    setSaving(true);
    try {
      const st = await api.createStatement({
        farmer_id: selected!.id,
        date_from: from,
        date_to: to,
        rate: num(rate),
        days: days.map((d) => ({ date: d.date, morning: num(d.morning), evening: num(d.evening) })),
        deductions: (draft?.advances || []).map((a) => ({
          advance_id: a.advance_id,
          amount: num(deducts[a.advance_id] || ""),
        })),
      });
      toast(`Statement saved (v${st.version}) ✅`, "success");
      router.replace(`/statement/${st.id}`);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const q = query.trim().toLowerCase();
  const list = q
    ? farmers.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.farmer_code.toLowerCase().includes(q) ||
          f.phone.includes(q),
      )
    : farmers;

  return (
    <View style={styles.container}>
      <StickyHeader title="नवीन Statement / पत्रक" onBack={goBack} />
      <KeyboardAwareScrollView
        bottomOffset={160}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>शेतकरी निवडा / Farmer</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, ID किंवा फोन शोधा..."
            placeholderTextColor={COLORS.textFaint}
            style={styles.searchInput}
            autoCapitalize="none"
            testID="stmt-farmer-search"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.sm }}
          keyboardShouldPersistTaps="handled"
        >
          {list.map((f) => {
            const on = selected?.id === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setSelected(f)}
                testID={`stmt-farmer-${f.farmer_code}`}
              >
                <Text style={[styles.chipCode, on && { color: COLORS.surface }]}>{f.farmer_code}</Text>
                <Text style={[styles.chipName, on && { color: COLORS.surface }]} numberOfLines={1}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {list.length === 0 ? <Text style={styles.muted}>Farmer सापडला नाही</Text> : null}
        </ScrollView>

        <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>कालावधी / Period</Text>
        <View style={styles.card}>
          <DateStepper label="From / पासून" value={from} onChange={setFrom} testID="stmt-from" />
          <DateStepper label="To / पर्यंत" value={to} onChange={setTo} testID="stmt-to" />
          <View style={styles.periodRow}>
            <TouchableOpacity style={styles.periodBtn} onPress={() => shiftPeriod(-1)} testID="stmt-prev-period">
              <Ionicons name="chevron-back" size={16} color={COLORS.primary} />
              <Text style={styles.periodText}>मागील</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.periodBtn}
              onPress={() => {
                setTo(todayISO());
                setFrom(addDays(todayISO(), -9));
              }}
              testID="stmt-last10"
            >
              <Text style={styles.periodText}>मागील 10 दिवस</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.periodBtn} onPress={() => shiftPeriod(1)} testID="stmt-next-period">
              <Text style={styles.periodText}>पुढील</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {dayDiff(from, to) < 0 ? (
            <Text style={styles.err}>From तारीख To पेक्षा नंतर आहे</Text>
          ) : (
            <Text style={styles.muted}>{dayDiff(from, to) + 1} दिवस</Text>
          )}
        </View>

        {!selected ? (
          <View style={styles.hint}>
            <Ionicons name="person-circle-outline" size={22} color={COLORS.textFaint} />
            <Text style={styles.muted}>Statement साठी आधी शेतकरी निवडा</Text>
          </View>
        ) : loadingDraft && !draft ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : draft ? (
          <>
            {draft.last_version > 0 ? (
              <View style={styles.versionNote}>
                <Ionicons name="information-circle" size={16} color={COLORS.accentDark} />
                <Text style={styles.versionText}>
                  या period चे v{draft.last_version} आधीच saved आहे. Save केल्यावर v{draft.last_version + 1} बनेल.
                </Text>
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>दूध / Milk (Litres)</Text>
            <View style={styles.card}>
              <View style={[styles.tRow, styles.tHead]}>
                <Text style={[styles.tDate, styles.tHeadText]}>तारीख</Text>
                <Text style={[styles.tCell, styles.tHeadText]}>सकाळ (L)</Text>
                <Text style={[styles.tCell, styles.tHeadText]}>संध्याकाळ (L)</Text>
                <Text style={[styles.tTot, styles.tHeadText]}>एकूण</Text>
              </View>
              {days.map((d, i) => (
                <View key={d.date} style={styles.tRow}>
                  <Text style={styles.tDate}>{fmtDMY(d.date).slice(0, 5)}</Text>
                  {(["morning", "evening"] as const).map((k, ki) => (
                    <TextInput
                      key={k}
                      ref={(el) => {
                        inputs.current[i * 2 + ki] = el;
                      }}
                      style={styles.tInput}
                      value={d[k]}
                      onChangeText={(v) => setDay(i, k, v)}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => inputs.current[i * 2 + ki + 1]?.focus()}
                      placeholder="0"
                      placeholderTextColor={COLORS.textFaint}
                      selectTextOnFocus
                      testID={`stmt-${k}-${d.date}`}
                    />
                  ))}
                  <Text style={styles.tTot}>{r2(num(d.morning) + num(d.evening))}</Text>
                </View>
              ))}
              <View style={[styles.tRow, styles.tFoot]}>
                <Text style={[styles.tDate, styles.bold]}>एकूण</Text>
                <Text style={[styles.tCell, styles.bold]}>{totals.m}</Text>
                <Text style={[styles.tCell, styles.bold]}>{totals.e}</Text>
                <Text style={[styles.tTot, styles.bold]}>{totals.liters}</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>दर / Rate (₹ per litre)</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.rateInput}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="उदा. 42.50"
                placeholderTextColor={COLORS.textFaint}
                testID="stmt-rate"
              />
              <Text style={styles.muted}>हा दर या period मधील सर्व दुधाला लागू होईल (फक्त या शेतकऱ्यासाठी)</Text>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>Advance उचल / वजावट</Text>
            <View style={styles.card}>
              {draft.advances.length === 0 ? (
                <Text style={styles.muted}>बाकी advance नाही ✅</Text>
              ) : (
                draft.advances.map((a) => {
                  const d = num(deducts[a.advance_id] || "");
                  const over = d > a.available + 0.001;
                  return (
                    <View key={a.advance_id} style={styles.advRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.advTitle}>Advance उचल {inr(a.amount)}</Text>
                        <Text style={styles.muted}>
                          {fmtDMY(a.date)} · बाकी {inr(a.available)} → {inr(r2(a.available - d))}
                        </Text>
                        {over ? <Text style={styles.err}>बाकी पेक्षा जास्त</Text> : null}
                      </View>
                      <TextInput
                        style={[styles.advInput, over && { borderColor: COLORS.danger }]}
                        value={deducts[a.advance_id] || ""}
                        onChangeText={(v) => setDeducts((p) => ({ ...p, [a.advance_id]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="₹0"
                        placeholderTextColor={COLORS.textFaint}
                        testID={`stmt-deduct-${a.advance_id}`}
                      />
                    </View>
                  );
                })
              )}
              <View style={styles.dedRow}>
                <Text style={styles.bold}>वजावट / Deductions</Text>
                <Text style={[styles.bold, { color: COLORS.danger }]} testID="stmt-total-deduction">
                  {inr(totals.ded)}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollView>

      {selected && draft ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <View style={styles.barTotals}>
            <View>
              <Text style={styles.barLbl}>{totals.liters} L · {inr(totals.gross)}</Text>
              <Text style={styles.barSub}>वजावट {inr(totals.ded)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.barSub}>देय रक्कम</Text>
              <Text style={styles.barNet} testID="stmt-net">{inr(totals.net)}</Text>
            </View>
          </View>
          <View style={styles.barBtns}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={preview} testID="stmt-preview">
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.btnText, { color: COLORS.primary }]}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnFill, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
              testID="stmt-save"
            >
              {saving ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Ionicons name="save-outline" size={18} color={COLORS.surface} />
              )}
              <Text style={styles.btnText}>Save Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DateStepper({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLbl}>{label}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(addDays(value, -1))} testID={`${testID}-minus`}>
        <Ionicons name="remove" size={18} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.stepVal} testID={`${testID}-value`}>{fmtDMY(value)}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(addDays(value, 1))} testID={`${testID}-plus`}>
        <Ionicons name="add" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
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
  },
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
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipCode: { fontSize: 10, color: COLORS.accentDark, fontWeight: "700" },
  chipName: { fontSize: 13, color: COLORS.text, fontWeight: "700", marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm },
  stepLbl: { flex: 1, fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepVal: { width: 104, textAlign: "center", fontSize: 15, fontWeight: "800", color: COLORS.text },
  periodRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs },
  periodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  periodText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  muted: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  err: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontWeight: "600" },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
  },
  versionNote: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  versionText: { flex: 1, color: COLORS.accentDark, fontSize: 12, fontWeight: "600" },
  tRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: 4 },
  tHead: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.sm },
  tHeadText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  tFoot: { borderTopWidth: 2, borderTopColor: COLORS.accent, marginTop: SPACING.xs, paddingTop: SPACING.sm },
  tDate: { width: 48, fontSize: 13, fontWeight: "700", color: COLORS.text },
  tCell: { flex: 1, textAlign: "center", fontSize: 14 },
  tTot: { width: 52, textAlign: "right", fontSize: 14, fontWeight: "700", color: COLORS.primary },
  tInput: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  bold: { fontWeight: "800", color: COLORS.text, fontSize: 14 },
  rateInput: {
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  advRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  advTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  advInput: {
    width: 100,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  dedRow: { flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.md },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    ...SHADOW.card,
  },
  barTotals: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLbl: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  barSub: { fontSize: 11, color: COLORS.textMuted },
  barNet: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  barBtns: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    minHeight: 48,
    borderRadius: RADIUS.lg,
  },
  btnOutline: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  btnFill: { backgroundColor: COLORS.primary, flex: 1.6 },
  btnText: { color: COLORS.surface, fontWeight: "700", fontSize: 14 },
});
