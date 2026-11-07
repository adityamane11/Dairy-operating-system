// Add new farmer
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { StickyHeader } from "@/src/components/StickyHeader";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";

export default function FarmerNew() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      toast("नाव आणि फोन आवश्यक आहे", "error");
      return;
    }
    setSaving(true);
    try {
      const f = await api.createFarmer({
        name: name.trim(),
        phone: phone.trim(),
        village: village.trim(),
        farmer_code: code.trim() || undefined,
      });
      toast(`${f.name} (${f.farmer_code}) added! ✅`, "success");
      router.back();
    } catch (e: any) {
      toast(e.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StickyHeader title="नवीन Farmer / New Farmer" onBack={() => router.back()} />
      <KeyboardAwareScrollView
        bottomOffset={120}
        contentContainerStyle={{ padding: SPACING.lg, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>नाव / Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="उदा. Ramesh Patil"
            placeholderTextColor={COLORS.textFaint}
            testID="farmer-new-name"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>फोन नंबर / Phone *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textFaint}
            testID="farmer-new-phone"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>गाव / Village</Text>
          <TextInput
            style={styles.input}
            value={village}
            onChangeText={setVillage}
            placeholder="(optional)"
            placeholderTextColor={COLORS.textFaint}
            testID="farmer-new-village"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>
            Farmer ID (auto-generate असेल जर रिक्त)
          </Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="उदा. F005"
            placeholderTextColor={COLORS.textFaint}
            autoCapitalize="characters"
            testID="farmer-new-code"
          />

          <View style={styles.note}>
            <Ionicons name="information-circle" size={14} color={COLORS.primary} />
            <Text style={styles.noteText}>
              शेतकरी या ID व फोनवर स्वतःचा हिशेब बघू शकेल
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          testID="farmer-new-save"
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Farmer ✅"}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
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
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
  },
  noteText: { color: COLORS.primaryDark, fontSize: 11, flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
    alignItems: "center",
    ...SHADOW.fab,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
