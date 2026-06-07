// Brand logo block (uses real logo asset)
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/src/theme";

type Size = "sm" | "md" | "lg";

export function BrandLogo({ size = "md", showSubtitle = true }: { size?: Size; showSubtitle?: boolean }) {
  const d = size === "lg" ? 120 : size === "md" ? 72 : 44;
  return (
    <View style={styles.wrap}>
      <Image
        source={require("../../assets/brand/logo.png")}
        style={{ width: d, height: d, resizeMode: "contain" }}
        testID="brand-logo"
      />
      {showSubtitle ? (
        <View style={{ marginTop: 6 }}>
          <Text style={[styles.title, size === "lg" && { fontSize: 18 }]}>
            Siddhnath
          </Text>
          <Text style={[styles.subtitle, size === "lg" && { fontSize: 12 }]}>
            दूध संकलन केंद्र
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  title: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 1,
  },
});
