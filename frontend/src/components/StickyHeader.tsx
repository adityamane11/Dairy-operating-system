// Sticky header with brand logo + title + optional right action
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOW, SPACING } from "@/src/theme";
import { BrandLogo } from "./BrandLogo";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showLogo?: boolean;
};

export function StickyHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  showLogo = true,
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
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : showLogo ? (
            <View style={{ transform: [{ scale: 0.9 }] }}>
              <BrandLogo size="sm" showSubtitle={false} />
            </View>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1} testID="header-title">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>
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
  },
  side: { width: 44, alignItems: "flex-start" },
  center: { flex: 1, alignItems: "center" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
});
