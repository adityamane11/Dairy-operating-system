// Brand theme tokens for Siddhnath Doodh Sankalan Kendra
export const COLORS = {
  primary: "#2D6A35", // Dark Green
  primaryDark: "#1F4D26",
  primaryLight: "#E8F2EA",
  accent: "#D4A017", // Gold/Amber
  accentDark: "#A87A0C",
  accentLight: "#FBF2DC",
  bg: "#FDFBF7",
  surface: "#FFFFFF",
  border: "#E7E2D6",
  text: "#1A201C",
  textMuted: "#5A6660",
  textFaint: "#8A938E",
  whatsapp: "#25D366",
  danger: "#C0392B",
  warning: "#E67E22",
  shadow: "rgba(45, 106, 53, 0.08)",
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const FONT = {
  numeric: { fontWeight: "700" as const, letterSpacing: -0.5 },
  heading: { fontWeight: "700" as const },
  body: { fontWeight: "500" as const },
};

export const SHADOW = {
  card: {
    shadowColor: "#2D6A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fab: {
    shadowColor: "#D4A017",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
};
