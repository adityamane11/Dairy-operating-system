// Brand logo block (uses real logo asset)
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/src/theme";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, number> = { sm: 36, md: 56, lg: 96, xl: 140 };

export function BrandLogo({
  size = "md",
  showText = true,
}: {
  size?: Size;
  showText?: boolean;
}) {
  const d = SIZES[size];
  return (
    <View style={styles.wrap}>
      <Image
        source={require("../../assets/brand/logo.png")}
        style={{ width: d, height: d }}
        contentFit="contain"
        testID="brand-logo"
      />
      {showText ? (
        <View style={{ marginTop: 8, alignItems: "center" }}>
          <Text style={[styles.title, size === "xl" && { fontSize: 22 }]}>
            सिद्धनाथ
          </Text>
          <Text style={[styles.subtitle, size === "xl" && { fontSize: 14 }]}>
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
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 1,
  },
});
