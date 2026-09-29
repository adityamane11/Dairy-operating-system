// Sticky header with brand logo + dairy name + optional right action
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOW, SPACING } from "@/src/theme";

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showBrand?: boolean; // if true, shows logo + सिद्धनाथ दूध संकलन केंद्र (default brand header)
};

export function StickyHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  showBrand = true,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconBtn}
              hitSlop={10}
              testID="header-back-button"
            >
              <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
            </TouchableOpacity>
          ) : showBrand ? (
            <Image
              source={require("../../assets/brand/logo.png")}
              style={styles.headerLogo}
              contentFit="contain"
              testID="header-brand-logo"
            />
          ) : null}
        </View>

        <View style={styles.center}>
          {showBrand && !title ? (
            <>
              <Text style={styles.brandName} numberOfLines={1}>
                सिद्धनाथ दूध संकलन केंद्र
              </Text>
              {subtitle ? (
                <Text style={styles.brandSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={1} testID="header-title">
                {title}
              </Text>
              {showBrand ? (
                <Text style={styles.brandTagline} numberOfLines={1}>
                  सिद्धनाथ दूध संकलन केंद्र
                </Text>
              ) : subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={[styles.side, { alignItems: "flex-end" }]}>
          {rightIcon ? (
            <TouchableOpacity
              onPress={onRightPress}
              style={styles.iconBtn}
              hitSlop={10}
              testID="header-right-button"
            >
              <Ionicons name={rightIcon} size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.md,
    ...SHADOW.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    minHeight: 56,
  },
  side: { width: 48, alignItems: "flex-start" },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerLogo: { width: 44, height: 44 },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  brandSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  brandTagline: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  subtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, textAlign: "center" },
});
